"""Offline SoilGrids adapter tests: synthetic VRT + tile, no network.

The VRT DstRect is generated around the real Interrupted Goode Homolosine
pixel of the test location, so coordinate math is exercised end to end.
"""
import io
import json
import os
import sys
from pathlib import Path

import httpx
import numpy as np
import pytest
import rasterio
from pyproj import CRS, Transformer
from rasterio.transform import from_origin

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_soilgrids.db")

from app.data_providers import soilgrids as sg
from app.data_providers.cache import cache_get
from app.data_providers.interfaces import STATUS_LIVE, STATUS_UNAVAILABLE
from app.db.base import Base, get_engine, get_session_factory
from app.db import models as models_pkg  # register tables

for suffix in ("", "-journal", "-wal", "-shm"):
    p = Path(f"./test_soilgrids.db{suffix}")
    if p.exists():
        p.unlink()
Base.metadata.create_all(get_engine())

TEST_LAT, TEST_LON = 34.0, 6.0
_transformer = Transformer.from_crs("EPSG:4326", sg.IGH_CRS, always_xy=True)


def _test_pixel() -> tuple[int, int]:
    x, y = _transformer.transform(TEST_LON, TEST_LAT)
    col = int((x - sg.__dict__.get("_T0X", -19949750.0)) / 250)
    row = int((y - 8361000.0) / -250 * -1) if False else int((y - 8361000.0) / -250)
    return col, row


def make_vrt(dst_x: int, dst_y: int) -> str:
    return f"""<VRTDataset rasterXSize="159246" rasterYSize="58034">
  <GeoTransform>-19949750.0, 250.0, 0.0, 8361000.0, 0.0, -250.0</GeoTransform>
  <ComplexSource>
    <SourceFilename relativeToVRT="1">./phh2o_5-15cm_mean/tileSG-000-000/tileSG-000-000_1-1.tif</SourceFilename>
    <DstRect xOff="{dst_x}" yOff="{dst_y}" xSize="600" ySize="600" />
    <NODATA>-32768</NODATA>
  </ComplexSource>
</VRTDataset>"""


def make_tile_bytes(values):
    arr = np.full((600, 600), sg.NODATA, dtype=np.int16)
    for (row, col, v) in values:
        arr[row, col] = v
    profile = {
        "driver": "GTiff", "height": 600, "width": 600, "count": 1,
        "dtype": "int16", "nodata": sg.NODATA,
        "transform": from_origin(0, 0, 250, 250),
        "crs": sg.IGH_CRS,
    }
    buf = io.BytesIO()
    with rasterio.open(buf, "w", **profile) as dst:
        dst.write(arr, 1)
    return buf.getvalue()


def _vrt_bytes_for(property_stem: str) -> bytes:
    # place the tile so the test location lands at local (350, 350)
    col, row = _pixel_of(TEST_LON, TEST_LAT)
    dst_x = int(col) - 350
    dst_y = int(row) - 350
    return make_vrt(dst_x, dst_y).encode()


def _pixel_of(lon: float, lat: float) -> tuple[float, float]:
    x, y = _transformer.transform(lon, lat)
    return (x + 19949750.0) / 250.0, (y - 8361000.0) / -250.0


TILE_PH_BYTES = make_tile_bytes([
    (350, 350, 74), (350, 351, 76), (351, 350, 72),
    (360, 360, -32768),
])
TILE_SOC_BYTES = make_tile_bytes([
    (350, 350, 150), (350, 351, 160), (351, 350, 155),
])
TILE_BLANK = make_tile_bytes([])


@pytest.fixture
def stubbed_http(monkeypatch):
    def fake_get(url, timeout=None):
        if url.endswith(".vrt"):
            stem = url.split("/data/")[1].split("/")[0]
            return httpx.Response(200, content=_vrt_bytes_for(stem),
                                  request=httpx.Request("GET", url))
        stem = url.split("/data/")[1].split("/")[0]
        if "phh2o" in stem:
            payload = TILE_PH_BYTES
        elif "soc" in stem:
            payload = TILE_SOC_BYTES
        elif "nitrogen" in stem:
            payload = TILE_PH_BYTES
        else:
            payload = TILE_SOC_BYTES
        return httpx.Response(200, content=payload, request=httpx.Request("GET", url))

    monkeypatch.setattr(sg.httpx, "get", fake_get)


@pytest.fixture
def db_session():
    Session = get_session_factory()
    session = Session()
    yield session
    session.close()


def test_vrt_parsing_extracts_index():
    index = sg._parse_vrt(make_vrt(79900, 18300).encode())
    assert index.origin_x == -19949750.0
    assert index.res_x == 250.0
    assert len(index.entries) == 1
    assert index.entries[0][0].startswith("./phh2o")


def test_igh_transform_landmark():
    # Meknes centroid must transform to a positive IGH column in Africa's lobe
    col, row = _pixel_of(-5.55, 33.9)
    assert 79000 < col < 83000
    assert 17000 < row < 19500


def test_scale_factor_conversions(db_session, stubbed_http):
    result = sg.fetch_soil(db_session, TEST_LAT, TEST_LON)
    assert result.status == STATUS_LIVE
    obs_by_id = {o["indicator"]: o for o in result.observations}
    ph = obs_by_id["soil_ph"]
    assert ph["value_num"] == 7.4  # (74+76+72)/3 / 10
    assert ph["unit"] == "pH"
    soc = obs_by_id["soil_organic_carbon"]
    assert soc["value_num"] == 15.5  # (150+160+155)/3 / 10
    assert soc["unit"] == "g/kg"
    nitrogen = obs_by_id["soil_total_nitrogen"]
    assert nitrogen["unit"] == "g/kg"


def test_nodata_pixels_excluded_and_counts_reported(db_session, stubbed_http):
    result = sg.fetch_soil(db_session, TEST_LAT, TEST_LON)
    ph = next(o for o in result.observations if o["indicator"] == "soil_ph")
    meta = json.loads(ph["meta_json"])
    assert meta["n_valid_pixels"] == 3
    assert meta["n_total_pixels"] >= 3
    assert meta["n_total_pixels"] > meta["n_valid_pixels"]  # nodata pixel excluded
    assert meta["depth"] == "5-15cm"
    assert ph["spatial_support"] and "250 m" in ph["spatial_support"]


def test_all_nodata_reports_unavailable(db_session, monkeypatch):
    def blank_vrt(url, timeout=None):
        stem = url.split("/data/")[1].split("/")[0]
        col, row = _pixel_of(TEST_LON, TEST_LAT)
        return httpx.Response(200, content=make_vrt(int(col) - 350, int(row) - 350).encode(),
                              request=httpx.Request("GET", url))

    def blank_tile(url, timeout=None):
        return httpx.Response(200, content=TILE_BLANK, request=httpx.Request("GET", url))

    def fake_get(url, timeout=None):
        if url.endswith(".vrt"):
            return blank_vrt(url, timeout)
        return blank_tile(url, timeout)

    monkeypatch.setattr(sg.httpx, "get", fake_get)
    result = sg.fetch_soil(db_session, TEST_LAT, TEST_LON)
    assert result.status == STATUS_UNAVAILABLE
    assert "no valid predicted pixel" in (result.detail or "")


def test_vrt_index_cached_in_sqlite(db_session, stubbed_http):
    sg.fetch_soil(db_session, TEST_LAT, TEST_LON)
    cached = cache_get(db_session, "soilgrids:vrt:phh2o_5-15cm_mean", 10**9)
    assert cached is not None
    payload = json.loads(cached.payload_json)
    assert payload["entries"] and payload["res_x"] == 250.0


def test_second_call_reuses_cached_vrt(db_session, stubbed_http, monkeypatch):
    sg.fetch_soil(db_session, TEST_LAT, TEST_LON)
    calls = {"vrt": 0}

    def counting_get(url, timeout=None):
        if url.endswith(".vrt"):
            calls["vrt"] += 1
            stem = url.split("/data/")[1].split("/")[0]
            return httpx.Response(200, content=_vrt_bytes_for(stem),
                                  request=httpx.Request("GET", url))
        stem = url.split("/data/")[1].split("/")[0]
        payload = TILE_PH_BYTES if "phh2o" in stem or "nitrogen" in stem else TILE_SOC_BYTES
        return httpx.Response(200, content=payload, request=httpx.Request("GET", url))

    monkeypatch.setattr(sg.httpx, "get", counting_get)
    sg.fetch_soil(db_session, TEST_LAT, TEST_LON)
    assert calls["vrt"] == 0
