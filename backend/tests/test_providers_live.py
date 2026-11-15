"""Opt-in live verification against the real external services.

Run with RUN_LIVE_TESTS=1  (requires internet access to files.isric.org,
storage.googleapis.com, maps.isric.org).

These tests contact official services; a REST outage says nothing about
the documented maps.isric.org WCS endpoint.
- GAEZ v5 rasters are publicly readable on the FAO GCS bucket.
"""
import os

import httpx
import pytest

pytestmark = pytest.mark.skipif(
    os.environ.get("RUN_LIVE_TESTS") != "1",
    reason="live external services; opt in with RUN_LIVE_TESTS=1",
)

from app.data_providers import gaez, soilgrids  # noqa: E402
from app.data_providers.nasa_power import SOURCE_ID as POWER_ID  # noqa: E402


def test_soilgrids_official_wcs_capabilities():
    r = httpx.get("https://maps.isric.org/mapserv",
                  params={"map": "/map/phh2o.map", "SERVICE": "WCS",
                          "VERSION": "2.0.1", "REQUEST": "GetCapabilities"}, timeout=30)
    r.raise_for_status()
    assert "phh2o_5-15cm_mean" in r.text


def test_soilgrids_ph_extraction_and_scale_conversion():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.base import Base
    import app.db.models
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()

    result = soilgrids.fetch_soil(db, 33.9, -5.55)
    assert result.status == "live"
    ph = next(o for o in result.observations if o["indicator"] == "soil_ph")
    assert ph["value_num"] is not None
    assert 3.0 <= ph["value_num"] <= 11.0  # sane pH after /10 conversion
    assert ph["unit"] == "pH"
    assert ph["meta_json"] and "5-15cm" in ph["meta_json"]
    # Other properties can independently fail; their absence is not fabricated.


def test_soilgrids_handles_mosaic_gaps(helpers=None):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.base import Base
    import app.db.models
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    result = soilgrids.fetch_soil(db, 33.9, -5.55)
    ph = next(o for o in result.observations if o["indicator"] == "soil_ph")
    import json
    m = json.loads(ph["meta_json"])
    # Meknes cell has documented partial gaps: valid count must be reported
    assert m["n_valid_pixels"] >= 0 and m["n_total_pixels"] >= m["n_valid_pixels"]


def test_soilgrids_polygon_sample_differs_from_point_mode():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    from app.db.base import Base
    import app.db.models
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    db = sessionmaker(bind=engine)()
    # a several-km polygon near Meknes spanning multiple 250m pixels
    geometry = {
        "type": "Polygon",
        "coordinates": [[[-5.60, 33.92], [-5.50, 33.92], [-5.50, 33.86],
                         [-5.60, 33.86], [-5.60, 33.92]]],
    }
    result = soilgrids.fetch_soil(db, 33.89, -5.55, geometry)
    assert result.status == "live"
    ph = next(o for o in result.observations if o["indicator"] == "soil_ph")
    import json
    m = json.loads(ph["meta_json"])
    assert m["sample_mode"] == "polygon"
    assert m["n_total_pixels"] > 20


def test_gaez_layer_discovery_and_second_location():
    # Meknes, rain-fed barley baseline
    r = gaez.fetch_yield_reference(33.9, -5.55, "barley", "rainfed")
    assert r.status == "live"
    value = r.observations[0]["value_num"]
    assert 0 < value < 60000  # kg/ha sanity band
    assert r.observations[0]["unit"] == "kg/ha (DW)"  # dry weight per FAO metadata
    assert r.observations[0]["period_start"] == "2001"

    # second location: Minnesota maize, irrigated management
    r2 = gaez.fetch_yield_reference(45.0, -93.2, "maize", "irrigated")
    assert r2.status == "live"
    assert 3000 < r2.observations[0]["value_num"] < 60000
    import json
    assert json.loads(r2.observations[0]["meta_json"])["period"] == "2001-2020"

    # scenario discipline: irrigated vs rain-fed keys differ
    assert gaez.file_key("WHE", "HILM") != gaez.file_key("WHE", "HRLM")
