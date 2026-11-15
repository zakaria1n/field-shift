import json
import pytest
from app.data_providers.interfaces import ProviderResult,obs
from app.domain.crop_rotation.validator import SlotPlan
from app.domain.scoring.engine import yield_indicator


def test_zero_reference_is_a_value_not_missing():
    slots=[SlotPlan('y1',1,'maize')]
    value,status,_=yield_indicator(slots,{'maize':0.0,'bread_wheat':5000.0},5000.0)
    assert value==0 and status=='available'
    value,status,_=yield_indicator(slots,{'maize':None},None)
    assert value is None and status=='unavailable'


@pytest.mark.parametrize('incomplete',[False,True])
def test_valid_land_no_yield_and_no_soil_explicit_partial_or_insufficient(field_with_profile,monkeypatch,incomplete):
    c,fid=field_with_profile
    import app.services.analysis as analysis
    def climate(*args):
        monthly={m:18.0 for m in ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']}
        if incomplete:monthly.pop('DEC')
        return ProviderResult('nasa_power','demo_fixture',[
            obs('monthly_mean_air_temperature',18,'°C',source_id='nasa_power',quality_status='demo_fixture',meta={'monthly':monthly}),
            obs('monthly_mean_precipitation',1.5,'mm/day',source_id='nasa_power',quality_status='demo_fixture',meta={'monthly':{m:1.5 for m in monthly}})])
    monkeypatch.setattr(analysis.nasa_power,'fetch_climate',climate)
    monkeypatch.setattr(analysis.soilgrids,'fetch_soil',lambda *a:ProviderResult('soilgrids','unavailable',detail='provider outage (explicit simulation)'))
    monkeypatch.setattr(analysis,'assess_pool',lambda ids,*a:({cid:None for cid in ids},[ProviderResult('gaez_v5','unavailable',detail='no data (explicit simulation)') for cid in ids]))
    start=c.post(f'/api/v1/fields/{fid}/analyses',json={});assert start.status_code==202
    job=c.get('/api/v1/analyses/'+start.json()['job_id']).json()
    if incomplete:
        assert job['status']=='failed'
        assert job['error']['code']=='insufficient_environmental_evidence'
        assert c.get(f'/api/v1/fields/{fid}/rotations').status_code==404
        return
    assert job['status']=='partial'
    plans=c.get(f'/api/v1/fields/{fid}/rotations').json()['rotations']
    assert plans
    for plan in plans:
        score=plan['score'];values={i['key']:i['value'] for i in score['indicators']}
        assert values['yield'] is None and 'yield' not in score['weights_applied']
        assert score['weight_redistribution_note']
        assert set(score['evaluated_dimensions'])=={'water','soil','risk'}
        assert abs(sum(score['weights_applied'].values())-1)<.0002
        # Displayed indicators/weights are rounded to 4 places; within output rounding tolerance.
        assert abs(score['total']-100*sum(score['weights_applied'][k]*values[k] for k in score['evaluated_dimensions']))<.06
        assert score['comparison_basis'] and score['data_quality_note']
