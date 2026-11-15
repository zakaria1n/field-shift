"""Authoritative captured geographic fixtures + backend workflow gates."""
import json
from pathlib import Path
from unittest.mock import Mock
import numpy as np
import pytest
from affine import Affine
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.models import AnalysisJob, Field, AnonymousClient, FarmProfile
from app.data_providers import landcover
from app.core.errors import ApiError

FIXTURES = Path(__file__).parent / 'fixtures' / 'landcover'
MANIFEST = json.loads((FIXTURES/'manifest.json').read_text())


def polygon(bounds):
    w,s,e,n=bounds
    return {'type':'Polygon','coordinates':[[[w,s],[e,s],[e,n],[w,n],[w,s]]]}


def test_malformed_crs_returns_geometry_error():
    from app.services.geometry import validate_field_geometry
    geometry = polygon([-5.452,33.838,-5.448,33.842])
    geometry['crs'] = {'properties': []}
    with pytest.raises(ApiError) as exc:
        validate_field_geometry(geometry)
    assert exc.value.details['geographic_status'] == 'INVALID_GEOMETRY'


def test_geographic_column_migration_preserves_existing_fields():
    from sqlalchemy import text, inspect
    from app.db.init_db import _m2_geographic_validation
    engine = create_engine('sqlite:///:memory:')
    with Session(engine) as session:
        session.execute(text('CREATE TABLE fields (id TEXT PRIMARY KEY, name TEXT)'))
        session.execute(text("INSERT INTO fields VALUES ('old-field', 'Existing parcel')"))
        _m2_geographic_validation(session)
        _m2_geographic_validation(session)
        session.commit()
        assert 'geographic_validation_json' in {c['name'] for c in inspect(engine).get_columns('fields')}
        assert session.execute(text('SELECT name, geographic_validation_json FROM fields')).one() == ('Existing parcel', None)


@pytest.fixture
def db():
    engine=create_engine('sqlite:///:memory:')
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        yield session


def captured_reader(monkeypatch, name):
    z=np.load(FIXTURES/(name+'.npz'))
    monkeypatch.setattr(landcover,'_read_tile',lambda url,bounds: (z['data'],Affine(*z['transform'])))
    return polygon(MANIFEST[name]['bounds'])


@pytest.mark.parametrize('name,status,proceed',[
    ('atlantic','WATER_AREA',False),('lake_geneva','WATER_AREA',False),
    ('rabat_coastline','PARTIALLY_WATER',False),('near_coast_land','LAND_CONFIRMED',True),
    ('rabat_cropland','LAND_CONFIRMED',True),
    ('saiss_farmland','LAND_CONFIRMED',True),
])
def test_verified_geographic_fixtures(db,monkeypatch,name,status,proceed):
    geometry=captured_reader(monkeypatch,name)
    result=landcover.validate_land(db,geometry)
    assert result.status==status
    assert result.can_proceed is proceed
    assert result.agricultural_status=='AGRICULTURAL_SUITABILITY_UNKNOWN'
    assert result.valid_fraction==1


def test_authentic_validation_cached_and_timestamp_preserved(db,monkeypatch):
    geo=captured_reader(monkeypatch,'rabat_cropland')
    original=landcover.validate_land(db,geo)
    def no_network(*args):raise AssertionError('fresh cache must avoid network')
    monkeypatch.setattr(landcover,'_read_tile',no_network)
    cached=landcover.validate_land(db,geo)
    assert cached.source_status=='cached'
    assert cached.fetched_at==original.fetched_at


def test_source_failure_never_means_water(db,monkeypatch):
    def failed(*args):raise OSError('provider unavailable')
    monkeypatch.setattr(landcover,'_read_tile',failed)
    geo=polygon(MANIFEST['rabat_cropland']['bounds'])
    result=landcover.validate_land(db,geo)
    assert result.status=='LAND_USE_UNCERTAIN' and not result.can_proceed
    with pytest.raises(ApiError) as err:landcover.require_terrestrial_field(db,geo)
    assert err.value.status_code==503
    assert err.value.code!='WATER_AREA'


def test_nodata_not_water(db,monkeypatch):
    geo=captured_reader(monkeypatch,'rabat_cropland')
    z=np.load(FIXTURES/'rabat_cropland.npz')
    monkeypatch.setattr(landcover,'_read_tile',lambda *a:(np.zeros((3,3),dtype='uint8'),Affine(*z['transform'])))
    result=landcover.validate_land(db,geo)
    assert result.status=='LAND_USE_UNCERTAIN' and result.water_fraction is None


@pytest.mark.parametrize('name',['atlantic','lake_geneva','rabat_coastline'])
def test_api_rejects_before_saving_or_environment_requests(auth_client,monkeypatch,name):
    c,_=auth_client();geo=captured_reader(monkeypatch,name)
    import app.services.analysis as a
    climate=Mock(side_effect=AssertionError('must not acquire climate for water'))
    monkeypatch.setattr(a.nasa_power,'fetch_climate',climate)
    assert c.post('/api/v1/fields/validate',json={'geometry':geo}).status_code==422
    r=c.post('/api/v1/fields',json={'name':'water','geometry':geo})
    assert r.status_code==422
    assert c.get('/api/v1/fields').json()['fields']==[]
    climate.assert_not_called()


def test_invalid_geometry_never_calls_land_source(auth_client,monkeypatch):
    c,_=auth_client()
    reader=Mock(side_effect=AssertionError('invalid geometry should stop first'))
    monkeypatch.setattr(landcover,'_read_tile',reader)
    geo={'type':'Polygon','coordinates':[[[0,0],[1,1],[1,0],[0,1],[0,0]]]}
    r=c.post('/api/v1/fields',json={'name':'invalid','geometry':geo})
    assert r.status_code==422
    assert r.json()['error']['details']['geographic_status']=='INVALID_GEOMETRY'
    reader.assert_not_called()


def test_existing_ocean_field_cannot_start_analysis(auth_client,monkeypatch):
    c,_=auth_client();geo=captured_reader(monkeypatch,'rabat_cropland')
    field=c.post('/api/v1/fields',json={'name':'old field','geometry':geo}).json()
    import app.db.base as database
    # Simulate a legacy persisted polygon from before land validation existed.
    with database.get_session_factory()() as session:
        record=session.get(Field,field['field_id']);record.geometry_geojson=json.dumps(polygon(MANIFEST['atlantic']['bounds']));session.commit()
    captured_reader(monkeypatch,'atlantic')
    r=c.post(f"/api/v1/fields/{field['field_id']}/analyses",json={})
    assert r.status_code==422 and r.json()['error']['code']=='WATER_AREA'
    with database.get_session_factory()() as session:
        assert session.query(AnalysisJob).filter_by(field_id=field['field_id']).count()==0


def test_geometry_update_rejected_atomically(auth_client,monkeypatch):
    c,_=auth_client();geo=captured_reader(monkeypatch,'rabat_cropland')
    f=c.post('/api/v1/fields',json={'name':'good','geometry':geo}).json()
    ocean=captured_reader(monkeypatch,'atlantic')
    r=c.patch('/api/v1/fields/'+f['field_id'],json={'name':'bad','geometry':ocean})
    assert r.status_code==422
    saved=c.get('/api/v1/fields/'+f['field_id']).json()
    assert saved['name']=='good' and saved['geometry_geojson']==geo
