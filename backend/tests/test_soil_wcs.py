import io
import json
from dataclasses import asdict
import httpx
import numpy as np
import pytest
import rasterio
from rasterio.transform import from_origin
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from app.db.base import Base
from app.db.models import ProviderCache
from app.data_providers import soilgrids as sg


@pytest.fixture
def db():
    engine=create_engine('sqlite:///:memory:');Base.metadata.create_all(engine)
    with Session(engine) as session:yield session


def test_wcs_protocol_crs_and_nodata_scaling(monkeypatch):
    buf=io.BytesIO()
    with rasterio.open(buf,'w',driver='GTiff',height=2,width=2,count=1,dtype='int16',
                       crs=sg.IGH_CRS,transform=from_origin(0,500,250,250)) as dst:
        dst.write(np.array([[74,76],[0,-32768]],dtype='int16'),1)
    requests=[]
    def get(url,params,timeout):
        requests.append((url,params))
        return httpx.Response(200,content=buf.getvalue(),headers={'content-type':'image/tiff'},request=httpx.Request('GET',url))
    monkeypatch.setattr(sg.httpx,'get',get)
    data,_=sg._wcs_read('phh2o',(0,0,500,500))
    assert np.nanmean(data)/10==7.5
    assert np.isnan(data[1]).all()
    assert requests[0][0]=='https://maps.isric.org/mapserv'
    params=requests[0][1]
    assert ('COVERAGEID','phh2o_5-15cm_mean') in params
    assert [v for k,v in params if k=='SUBSET']==['X(0,500)','Y(0,500)']


def test_live_values_authentic_cache_and_preserved_depth(db,monkeypatch):
    def read(stem,bounds):return np.full((2,2),74.0),from_origin(bounds[0],bounds[3],250,250)
    monkeypatch.setattr(sg,'_wcs_read',read)
    result=sg.fetch_soil(db,33.9,-5.55)
    assert result.status=='live'
    ph=next(o for o in result.observations if o['indicator']=='soil_ph')
    assert ph['value_num']==7.4
    meta=json.loads(ph['meta_json'])
    assert meta['depth']=='5-15cm' and meta['proxy'] and meta['retrieved_at']
    def failed(*args):raise AssertionError('fresh authentic cache must avoid network')
    monkeypatch.setattr(sg,'_wcs_read',failed)
    cached=sg.fetch_soil(db,33.9,-5.55)
    assert cached.status=='cached' and cached.fetched_at==result.fetched_at
    assert all(o['quality_status']=='cached' for o in cached.observations)


def test_missing_pixels_never_fabricated(db,monkeypatch):
    monkeypatch.setattr(sg,'_wcs_read',lambda stem,bounds:(np.full((2,2),np.nan),from_origin(0,500,250,250)))
    result=sg.fetch_soil(db,33.9,-5.55)
    assert result.status=='missing'
    assert result.detail.startswith('missing_soil_data:')
    assert all(o['value_num'] is None for o in result.observations)


def test_provider_failure_without_cache_has_no_values(db,monkeypatch):
    def failed(*args):raise httpx.ConnectError('upstream failure')
    monkeypatch.setattr(sg,'_wcs_read',failed)
    result=sg.fetch_soil(db,33.9,-5.55)
    assert result.status=='unavailable' and result.observations==[]
    assert result.detail.startswith('provider_unavailable:')


def test_one_failed_property_does_not_discard_others(db,monkeypatch):
    def read(stem,bounds):
        if stem=='clay':raise httpx.ReadTimeout('temporarily unavailable')
        return np.full((2,2),74.0),from_origin(bounds[0],bounds[3],250,250)
    monkeypatch.setattr(sg,'_wcs_read',read)
    result=sg.fetch_soil(db,33.9,-5.55)
    assert result.status=='live' and len(result.observations)==5
    assert 'clay:' in result.detail


def test_expired_cache_explicit_during_outage(db,monkeypatch):
    monkeypatch.setattr(sg,'_wcs_read',lambda stem,bounds:(np.full((2,2),74.0),from_origin(bounds[0],bounds[3],250,250)))
    result=sg.fetch_soil(db,33.9,-5.55)
    row=db.query(ProviderCache).filter(ProviderCache.source_id=='soilgrids').one()
    row.fetched_at='2000-01-01T00:00:00+00:00';db.commit()
    def failed(*args):raise httpx.ConnectError('upstream failure')
    monkeypatch.setattr(sg,'_wcs_read',failed)
    cached=sg.fetch_soil(db,33.9,-5.55)
    assert cached.status=='cached' and 'expired authentic' in cached.detail
    assert cached.fetched_at==result.fetched_at
