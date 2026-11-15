"""Explicit network diagnostic; python -m tests.verify_live_sources is not needed.

Run from backend: python tests/verify_live_sources.py
Writes public request evidence only; no application credentials or .env dump.
"""
import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
import httpx
from app.data_providers import soilgrids, gaez
from app.data_providers.interfaces import utcnow_iso

out = Path(__file__).resolve().parents[2] / 'docs/verification/field-validation'
out.mkdir(parents=True, exist_ok=True)
logging.basicConfig(filename=out/'public_provider_requests.log', level=logging.INFO,
                    format='%(asctime)s %(name)s %(message)s', force=True)
report = {'retrieved_at': utcnow_iso(), 'location': {'latitude': 33.840026, 'longitude': -5.449992}}
for label, url, params in [
    ('rest', 'https://rest.isric.org/soilgrids/v2.0/properties/query', {'lat': 33.840026, 'lon': -5.449992}),
    ('wcs_capabilities', soilgrids.WCS_URL, {'map': '/map/phh2o.map', 'SERVICE': 'WCS', 'VERSION': '2.0.1', 'REQUEST': 'GetCapabilities'}),
]:
    try:
        response = httpx.get(url, params=params, timeout=15)
        report[label] = {'url': str(response.url), 'status': response.status_code,
                         'content_type': response.headers.get('content-type'), 'bytes': len(response.content)}
    except Exception as exc:
        report[label] = {'url': url, 'error': type(exc).__name__ + ': ' + str(exc)}
try:
    # Same operational property extraction, native depth/scale/NoData policy.
    observation = soilgrids._wcs_property('phh2o', 'soil_ph', 10, 'pH', 33.840026, -5.449992, None)
    report['ph_wcs'] = observation
except Exception as exc:
    report['ph_wcs'] = {'error': type(exc).__name__ + ': ' + str(exc)}
try:
    from dataclasses import asdict
    report['gaez_barley'] = asdict(gaez.fetch_yield_reference(33.840026, -5.449992, 'barley', 'rainfed'))
except Exception as exc:
    report['gaez_barley'] = {'error': type(exc).__name__ + ': ' + str(exc)}
(out/'real_provider_probe.json').write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
print(json.dumps(report, indent=2, ensure_ascii=True))
