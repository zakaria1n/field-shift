"""FAO GAEZ v5 attainable-yield reference through the official public catalog.

Access method (verified live 2026-11-15): FAO publishes GAEZ v5 as GeoTIFF
rasters on a public storage bucket, with the authoritative file catalog in
the RES05 README workbook:

- catalog (RES05 "Suitability and attainable yield"):
  https://data.apps.fao.org/catalog/dataset/514c92d5-9e01-4c70-814a-80ea1ca9fe6a
  /resource/768b08ad-be9c-427a-84be-3a3d6dd7835a/download/_readme_res05.xlsx
  (the un-fao/gaezv5 downloader notebooks build object keys the same way)
- raster base:
  https://storage.googleapis.com/fao-gismgr-gaez-v5-data/DATA/GAEZ-V5/MAPSET/
  {MAPSET_CODE}/{FILE_NAME}.tif

There is no point-query REST API; this adapter reads the single 5-arc-minute
(~9.3 km) pixel containing the field centroid via HTTP range requests against
the cloud-optimized GeoTIFF, and labels that spatial support honestly.

Scenario discipline: only the historical baseline (period HP0120 = 2001-2020,
AgERA5 observations, SSP HIST) is used, so no future-scenario mixing is
possible. Input level follows the farmer's irrigation answer:
irrigated -> HILM (high inputs, irrigated); everything else -> HRLM
(high inputs, rain-fed). The variable is RES05-YXX, "average attainable
yield of best occurring suitability class" (kg dry matter / ha): a modeled
reference, never a forecast of the farmer's harvest.
"""
import logging

import httpx
import rasterio
import rasterio.windows

from app.config import get_settings
from app.data_providers.interfaces import (
    STATUS_LIVE,
    STATUS_UNAVAILABLE,
    ProviderResult,
    obs,
)

log = logging.getLogger("fieldshift.gaez")

SOURCE_ID = "gaez_v5"
BASE_URL = "https://storage.googleapis.com/fao-gismgr-gaez-v5-data/DATA/GAEZ-V5/MAPSET"
CATALOG_URL = ("https://data.apps.fao.org/catalog/dataset/514c92d5-9e01-4c70-814a-80ea1ca9fe6a"
               "/resource/768b08ad-be9c-427a-84be-3a3d6dd7835a/download/_readme_res05.xlsx")

PERIOD = "HP0120"          # 2001-2020 historical baseline
CLIMATE = "AGERA5"         # observed climate reanalysis
SSP = "HIST"               # historical scenario
VARIABLE = "YXX"           # attainable yield of best occurring suitability class
NODATA = -9.0

# our crop_id -> GAEZ v5 crop code, generated from the CODES_CROP sheet of the
# official catalog (scripts/build_gaez_crop_map.py). v5 publishes a single
# Wheat LUT, so both wheat types share WHE; crops absent from the catalog are
# omitted and their yield reference stays honestly unavailable.
CROP_GAEZ_MAP: dict[str, str] = {
    "bread_wheat": "WHE",
    "durum_wheat": "WHE",
    "barley": "BRL",
    "oats": "OAT",
    "maize": "MZE",
    "sorghum": "SRG",
    "pearl_millet": "PML",
    "chickpea": "CHK",
    "pea": "PEA",
    "green_bean": "PHB",
    "alfalfa": "ALF",
    "groundnut": "GRD",
    "sugar_beet": "SUB",
    "potato": "WPO",
    "sweet_potato": "SPO",
    "carrot": "CAR",
    "onion": "ONI",
    "tomato": "TOM",
    "watermelon": "WMEL",
    "cabbage": "CAB",
    "canola": "RSD",
    "sunflower": "SFL",
}

INPUT_FOR_IRRIGATION = {
    "irrigated": "HILM",   # high inputs, irrigated management
    "mixed": "HRLM",       # conservative rain-fed reference for mixed systems
    "rainfed": "HRLM",     # high inputs, rain-fed management
    "unknown": "HRLM",
}

UNIT = "kg/ha"
SPATIAL = "global_model_grid (~9.3 km / 5-arc-min cell at field centroid)"
DOCS_URL = "https://gaez.fao.org/pages/data-access-download"


def scenario_for(irrigation_type: str | None) -> tuple[str, str]:
    """Return (input_level code, human label) for the farmer's irrigation answer."""
    key = (irrigation_type or "unknown").lower()
    code = INPUT_FOR_IRRIGATION.get(key, "HRLM")
    label = "high inputs, irrigated" if code == "HILM" else "high inputs, rain-fed"
    return code, label


def file_key(crop_code: str, input_level: str) -> str:
    return f"GAEZ-V5.RES05-{VARIABLE}.{PERIOD}.{CLIMATE}.{SSP}.{crop_code}.{input_level}"


def fetch_yield_reference(lat: float, lon: float, crop_id: str,
                          irrigation_type: str | None = None) -> ProviderResult:
    settings = get_settings()
    if not settings.gaez_enabled:
        return ProviderResult(
            source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
            detail="GAEZ v5 access disabled by configuration (GAEZ_ENABLED=false)",
        )
    crop_code = CROP_GAEZ_MAP.get(crop_id)
    if crop_code is None:
        return ProviderResult(
            source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
            detail=f"no GAEZ v5 layer exists for crop '{crop_id}' in the official "
                   "RES05 catalog; yield reference stays unavailable (not estimated)",
        )
    input_level, input_label = scenario_for(irrigation_type)
    key = file_key(crop_code, input_level)
    url = f"{BASE_URL}/RES05-{VARIABLE}/{key}.tif"

    try:
        with rasterio.open("/vsicurl/" + url) as src:
            if not (-180 <= lon <= 180 and -90 <= lat <= 90):
                return ProviderResult(
                    source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                    detail="field centroid outside the GAEZ v5 global coverage",
                )
            row, col = src.index(lon, lat)
            if not (0 <= row < src.height and 0 <= col < src.width):
                return ProviderResult(
                    source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                    detail="field centroid falls outside the published raster grid",
                )
            win = rasterio.windows.Window(col - 0.5, row - 0.5, 1, 1)
            value = float(src.read(1, window=win, fill_value=NODATA)[0, 0])
    except rasterio.errors.RasterioIOError as exc:
        # 404/403 on the COG: layer listed in the catalog but not published/accessible
        message = str(exc)
        if "404" in message or "403" in message:
            return ProviderResult(
                source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                detail=f"GAEZ v5 layer {key} is not published at the expected cloud "
                       f"location ({message})",
            )
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              detail=f"GAEZ v5 raster unreachable: {message}")
    except (httpx.HTTPError, ValueError) as exc:
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              detail=f"GAEZ v5 raster unreachable: {exc}")

    if value == NODATA or value < 0:
        return ProviderResult(
            source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
            detail=f"GAEZ v5 has no attainable-yield value at this location for "
                   f"{crop_id} ({key}); no substitute value is produced",
        )

    return ProviderResult(
        source_id=SOURCE_ID, status=STATUS_LIVE,
        observations=[obs(
            "yield_reference_attainable", round(value, 1), UNIT,
            source_id=SOURCE_ID,
            quality_status="pending",
            source_layer=f"GAEZ v5 {key} ({crop_code}, {input_label})",
            period_start="2001",
            period_end="2020",
            spatial_support=SPATIAL,
            meta={
                "crop_id": crop_id,
                "gaez_crop_code": crop_code,
                "variable": f"RES05-{VARIABLE}",
                "period": "2001-2020",
                "climate_data_source": CLIMATE,
                "ssp": SSP,
                "input_level": input_level,
                "input_label": input_label,
                "note": "modeled attainable yield of the best occurring suitability "
                        "class at this cell — a reference, not a harvest prediction",
                "docs_url": DOCS_URL,
                "catalog_url": CATALOG_URL,
            },
        )],
        data_period="GAEZ v5 baseline 2001-2020 (AgERA5, historical)",
        source_layer=f"RES05-{VARIABLE} {key}",
        detail=f"live pixel read ({lat:.3f},{lon:.3f}); {DOCS_URL}",
    )
