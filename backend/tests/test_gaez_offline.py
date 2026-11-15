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


def test_scenario_follows_irrigation_answer():
    assert gaez.scenario_for("irrigated") == ("HILM", "high inputs, irrigated")
    for kind in ("rainfed", "mixed", "unknown", None):
        code, label = gaez.scenario_for(kind)
        assert code == "HRLM"
        assert label == "high inputs, rain-fed"


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
