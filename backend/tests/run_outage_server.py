"""EXPLICIT failure-injection E2E server. Never used by the production app.

Requires FIELDSHIFT_TEST_OUTAGE=1 and an explicit isolated
DATABASE_URL=sqlite:///.../field_validation_outage*.db.
No artificial environmental values: only WCS and GAEZ network failures injected.
NASA POWER and ESA WorldCover still use real services. Use a new isolated DB.
python -m uvicorn tests.run_outage_server:app --port 8012 (or run this file)
"""
import sys
import os
from pathlib import Path
# Never let a demonstration of failure write analysis snapshots into the
# farmer's normal database. An explicit opt-in and isolated DB are mandatory.
if os.environ.get('FIELDSHIFT_TEST_OUTAGE') != '1':
    raise RuntimeError('Failure injection is test-only; set FIELDSHIFT_TEST_OUTAGE=1 explicitly.')
database_url = os.environ.get('DATABASE_URL', '')
normal_database = Path(__file__).resolve().parents[1] / 'fieldshift.db'
if not database_url.startswith('sqlite:///'):
    raise RuntimeError('Failure injection requires an explicitly configured isolated SQLite DATABASE_URL.')
test_database = Path(database_url.removeprefix('sqlite:///')).resolve()
if test_database == normal_database.resolve() or not test_database.name.startswith('field_validation_outage'):
    raise RuntimeError('Failure injection requires a separate field_validation_outage*.db database.')
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
import httpx
from app.main import app
from app.data_providers import soilgrids,gaez
from app.data_providers.interfaces import ProviderResult

def outage(*args,**kwargs):
    raise httpx.ConnectError('EXPLICIT E2E SIMULATION: official WCS temporarily unreachable')

def yield_outage(*args,**kwargs):
    return ProviderResult('gaez_v5','unavailable',detail='EXPLICIT E2E SIMULATION: yield provider unreachable; no substitute value')

soilgrids._wcs_read=outage
gaez.fetch_yield_reference=yield_outage

if __name__=='__main__':
    import uvicorn
    uvicorn.run(app,host='127.0.0.1',port=8012)
