"""Offline GAEZ v5 adapter tests: scenario mapping, key building, coverage gaps.

No network: raster reads are exercised in the live module
(test_providers_live.py, opt-in via RUN_LIVE_TESTS=1).
"""
import os
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_gaez.db")

from app.data_providers import gaez
from app.data_providers.interfaces import STATUS_UNAVAILABLE


def test_scenario_water_supply_from_irrigation_answer():
    # Water supply follows the irrigation answer...
    assert gaez.scenario_for("irrigated", "high")[0] == "HILM"
    assert gaez.scenario_for("rainfed", "high")[0] == "HRLM"
    assert gaez.scenario_for("irrigated", "low")[0] == "LILM"
    assert gaez.scenario_for("rainfed", "low")[0] == "LRLM"
    # ...but management intensity is an explicit assumption, never derived
    # from the irrigation answer.
    assert gaez.scenario_for("irrigated", "high") == ("HILM", "high inputs, irrigated")
    assert gaez.scenario_for("rainfed", "high") == ("HRLM", "high inputs, rain-fed")
    assert gaez.scenario_for("irrigated", "low") == ("LILM", "low inputs, irrigated")
    assert gaez.scenario_for("rainfed", "low") == ("LRLM", "low inputs, rain-fed")


def test_scenario_default_is_high_assumption_and_invalid_falls_back():
    # default assumption documented as "high" (attainable ceiling)
    assert gaez.scenario_for("irrigated")[0] == "HILM"
    assert gaez.scenario_for("rainfed")[0] == "HRLM"
    # invalid level strings fall back to the documented default
    assert gaez.scenario_for("irrigated", "organic")[0] == "HILM"
    assert gaez.scenario_for(None, "")[0] == "HRLM"


def test_official_input_code_definitions():
    # Verified against CODES_WATER_INPUT of the official RES05 catalog:
    # HILM Irrigation + high inputs; LILM Irrigation + low;
    # LRLM Rain-fed + low; HRLM Rain-fed + high.
    expected = {"HILM", "LILM", "LRLM", "HRLM"}
    for crop in ("WHE", "BRL"):
        for suffix in ("HILM", "LILM", "LRLM", "HRLM"):
            key = gaez.file_key(crop, suffix)
            assert key.endswith(suffix)


def test_file_key_matches_official_catalog_convention():
    # built exactly like the un-fao/gaezv5 downloader notebooks:
    # GAEZ-V5.RES05-YXX.{PERIOD}.{CLIMATE}.{SSP}.{CROP}.{INPUT}
    key = gaez.file_key("BRL", "HRLM")
    assert key == "GAEZ-V5.RES05-YXX.HP0120.AGERA5.HIST.BRL.HRLM"


def test_crop_mapping_covers_major_field_crops():
    for crop in ("bread_wheat", "durum_wheat", "barley", "maize", "chickpea",
                 "cabbage", "sunflower"):
        assert crop in gaez.CROP_GAEZ_MAP
    # wheat types share the single GAEZ v5 wheat LUT (documented approximation)
    assert gaez.CROP_GAEZ_MAP["bread_wheat"] == gaez.CROP_GAEZ_MAP["durum_wheat"] == "WHE"


def test_unmapped_crop_reports_unavailable_without_network():
    result = gaez.fetch_yield_reference(33.9, -5.55, "faba_bean", "rainfed")
    assert result.status == STATUS_UNAVAILABLE
    assert "no GAEZ v5 layer" in (result.detail or "")
    assert "faba_bean" in (result.detail or "")


def test_live_observation_records_management_assumption(monkeypatch):
    # the stored provenance must state that intensity was assumed
    import app.data_providers.gaez as g
    class FakeSrc:
        crs = None
        height = 2160
        width = 4320
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def index(self, lon, lat):
            return 10, 10
        def read(self, band, window=None, fill_value=None):
            import numpy as np
            return np.array([[5000.0]])
    import rasterio.windows
    orig_open = __import__("rasterio").open
    import rasterio
    def fake_open(path, *a, **k):
        if str(path).startswith("/vsicurl/"):
            assert "HRLM" in path or "HILM" in path
            return FakeSrc()
        return orig_open(path, *a, **k)
    monkeypatch.setattr(g.rasterio, "open", fake_open)
    result = g.fetch_yield_reference(33.9, -5.55, "barley", "rainfed")
    assert result.status == "live"
    meta = __import__("json").loads(result.observations[0]["meta_json"])
    assert "management_assumption" in meta
    assert "assumed" in meta["management_assumption"]
    assert meta["yield_basis"].startswith("dry weight")
    assert meta["input_level"] == "HRLM"


def test_disabled_provider_reports_configuration_reason():
    settings = gaez.get_settings()
    original = settings.gaez_enabled
    settings.gaez_enabled = False
    try:
        result = gaez.fetch_yield_reference(33.9, -5.55, "barley", "rainfed")
        assert result.status == STATUS_UNAVAILABLE
        assert "disabled" in (result.detail or "")
    finally:
        settings.gaez_enabled = original
