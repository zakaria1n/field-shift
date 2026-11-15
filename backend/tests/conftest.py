"""Shared pytest fixtures: isolated SQLite DB, client, field journey helpers."""
import os
import sys
import tempfile
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Isolated temp DB per test session before app import reads settings.
_tmpdir = tempfile.mkdtemp(prefix="fieldshift-test-")
os.environ["DATABASE_URL"] = f"sqlite:///{Path(_tmpdir) / 'test.db'}"
os.environ["POWER_ENABLED"] = "true"
os.environ["SOILGRIDS_ENABLED"] = "true"

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.db.init_db import init_db  # noqa: E402

init_db()

SAMPLE_POLYGON = {
    "type": "Polygon",
    "coordinates": [[[-5.560, 33.900], [-5.552, 33.902], [-5.550, 33.896], [-5.557, 33.894], [-5.560, 33.900]]],
}

CEREAL_HISTORY = [
    {"crop_year": 2024, "crop_id": "bread_wheat", "status": "planted", "season_label": "main"},
    {"crop_year": 2025, "crop_id": "durum_wheat", "status": "planted", "season_label": "main"},
    {"crop_year": 2026, "crop_id": "barley", "status": "planted", "season_label": "main"},
]


@pytest.fixture(scope="session")
def client() -> TestClient:
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def key_factory():
    counter = {"n": 0}

    def make() -> str:
        counter["n"] += 1
        return f"fsk_test_{counter['n']}_{id(counter)}"

    return make


@pytest.fixture
def auth_client(client: TestClient, key_factory):
    def make():
        key = key_factory()
        c = TestClient(app, headers={"X-FieldShift-Access-Key": key})
        return c, key

    return make


@pytest.fixture
def field_with_profile(auth_client):
    """Field + rainfed profile + cereal history, WITHOUT analysis."""
    c, key = auth_client()
    r = c.post("/api/v1/fields", json={"name": "Test Field", "geometry": SAMPLE_POLYGON})
    assert r.status_code == 201, r.text
    field_id = r.json()["field_id"]
    r = c.put(f"/api/v1/fields/{field_id}/profile", json={
        "irrigation_type": "rainfed",
        "purposes": ["sell"],
        "priorities": {"water": 25, "soil": 40, "yield": 15, "risk": 20},
    })
    assert r.status_code == 200, r.text
    r = c.put(f"/api/v1/fields/{field_id}/crop-history", json=CEREAL_HISTORY)
    assert r.status_code == 200, r.text
    return c, field_id


@pytest.fixture
def analyzed_field(field_with_profile, monkeypatch):
    """Field with a completed analysis using provider fixtures (no network)."""
    c, field_id = field_with_profile
    from app.data_providers.interfaces import ProviderResult, obs

    def fake_climate(session, lat, lon):
        monthly = {m: v for m, v in zip(
            ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"],
            [10.7, 12.1, 14.8, 17.2, 21.0, 25.3, 27.6, 27.1, 24.0, 19.3, 14.2, 11.2],
        )}
        monthly_max = {m: v + 7 for m, v in monthly.items()}
        monthly_min = {m: v - 7 for m, v in monthly.items()}
        monthly_precip = {m: 1.1 for m in monthly}
        monthly_precip["JAN"] = 1.9
        results = []
        for indicator, series, unit in [
            ("monthly_mean_air_temperature", monthly, "°C"),
            ("monthly_mean_daily_max_temperature", monthly_max, "°C"),
            ("monthly_mean_daily_min_temperature", monthly_min, "°C"),
            ("monthly_mean_precipitation", monthly_precip, "mm/day"),
        ]:
            annual = round(sum(series.values()) / len(series), 2)
            results.append(obs(
                indicator, annual, unit,
                source_id="nasa_power", quality_status="pending",
                source_layer=f"POWER climatology fixture", spatial_support="fixture grid",
                meta={"monthly": series, "_fixture": True},
            ))
        return ProviderResult(source_id="nasa_power", status="live", observations=results,
                              data_period="FIXTURE climatology (labelled sample)")

    def fake_soil(session, lat, lon, geometry=None):
        return ProviderResult(source_id="soilgrids", status="unavailable",
                              detail="paused service (fixture path)")

    def fake_assess_pool(crop_ids, lat, lon, irrigation_type=None):
        # Clearly-labelled fixture references: deterministic per crop, with a
        # couple of crops left unresolved so partial status stays testable.
        resolved = {cid: 2500.0 + (sum(cid.encode("utf-8")) % 40) * 50.0
                    for cid in crop_ids}
        resolved["faba_bean"] = None   # has no GAEZ v5 layer (real gap)
        resolved["lentil"] = None      # has no GAEZ v5 layer (real gap)
        from app.data_providers.interfaces import ProviderResult as PR
        refs = resolved
        results = [PR(source_id="gaez_v5", status="live",
                      detail="FIXTURE references for tests (never shown as live data)")]
        return refs, results

    import app.services.analysis as analysis_mod
    monkeypatch.setattr(analysis_mod.nasa_power, "fetch_climate", fake_climate)
    monkeypatch.setattr(analysis_mod.soilgrids, "fetch_soil", fake_soil)
    monkeypatch.setattr(analysis_mod, "assess_pool", fake_assess_pool)

    r = c.post(f"/api/v1/fields/{field_id}/analyses", json={})
    assert r.status_code == 202, r.text
    job_id = r.json()["job_id"]
    for _ in range(50):
        job = c.get(f"/api/v1/analyses/{job_id}").json()
        if job["status"] in ("complete", "partial", "failed"):
            break
        import time
        time.sleep(0.2)
    assert job["status"] in ("complete", "partial"), job
    return c, field_id, job_id
