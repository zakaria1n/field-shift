"""Opt-in capture of bounded authoritative WorldCover samples; no synthetic labels.
Run from repository root: python backend/tests/capture_landcover_fixtures.py
"""
import sys, json, hashlib
from pathlib import Path
from datetime import datetime, timezone
import numpy as np
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.data_providers.landcover import _read_tile, BASE_URL

OUT = Path(__file__).parent / 'fixtures' / 'landcover'
CASES = {
    'atlantic': (-7.002,34.098,-6.998,34.102),
    'saiss_farmland': (-5.452,33.838,-5.448,33.842),
    'lake_geneva': (6.548,46.448,6.552,46.452),
    'rabat_coastline': (-6.86,34.02,-6.83,34.04),
    'near_coast_land': (-6.832,34.016,-6.830,34.018),
}
if __name__ == '__main__':
    import math
    OUT.mkdir(parents=True,exist_ok=True)
    manifest = json.loads((OUT/'manifest.json').read_text()) if (OUT/'manifest.json').exists() else {}
    for name,bounds in CASES.items():
        if len(sys.argv) > 1 and name not in sys.argv[1:]:
            continue
        x,y=math.floor(bounds[0]/3)*3,math.floor(bounds[1]/3)*3
        tile=f"{'N' if y>=0 else 'S'}{abs(y):02}{'E' if x>=0 else 'W'}{abs(x):03}"
        url=f'{BASE_URL}/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif'
        try:
            data,affine=_read_tile(url,bounds)
            path=OUT/(name+'.npz');np.savez_compressed(path,data=data,transform=np.array(tuple(affine)[:6]))
            manifest[name]={'bounds':bounds,'url':url,'retrieved_at':datetime.now(timezone.utc).isoformat(),
                'source':'ESA WorldCover 2021 v200','resolution_m':10,'crs':'EPSG:4326',
                'classes':{str(k):int(n) for k,n in zip(*np.unique(data,return_counts=True))},
                'sha256':hashlib.sha256(path.read_bytes()).hexdigest()}
            print(name,manifest[name]['classes'],flush=True)
        except Exception as exc:
            print(name,'FAILED',type(exc).__name__,str(exc),flush=True)
    (OUT/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
