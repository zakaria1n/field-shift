"""Bounded, native-resolution ESA WorldCover 2021 v200 land/water checks.

Only real class-80 pixels prove permanent water. Missing tiles, NoData and
network failures never mean ocean. Land cover is historical, modelled evidence,
not proof of current agricultural suitability. No global raster is downloaded.
"""
import hashlib
import json
import math
from dataclasses import asdict, dataclass, field

import numpy as np
import rasterio
import httpx
from rasterio.features import geometry_mask
from rasterio.windows import Window, from_bounds, transform as window_transform
from shapely.geometry import box, mapping, shape
from sqlalchemy.orm import Session

from app.config import get_settings
from app.core.errors import ApiError
from app.data_providers.cache import cache_get, cache_put
from app.data_providers.interfaces import utcnow_iso
from app.data_providers.http_range import RangeReader

SOURCE = "esa_worldcover_2021_v200"
BASE_URL = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map"
DOCS = "https://esa-worldcover.org/en/data-access"
KNOWN_CLASSES = {10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 100}
MAX_PIXELS = 2_000_000


@dataclass
class LandValidation:
    status: str
    can_proceed: bool
    agricultural_status: str = "AGRICULTURAL_SUITABILITY_UNKNOWN"
    source_id: str = SOURCE
    source_status: str = "live"
    fetched_at: str = field(default_factory=utcnow_iso)
    data_period: str = "2021"
    resolution_m: int = 10
    water_fraction: float | None = None
    valid_fraction: float = 0.0
    classes: dict[str, int] = field(default_factory=dict)
    detail: str = ""
    source_urls: list[str] = field(default_factory=list)
    attribution: str = "© ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data 2021"


def _read_tile(url: str, bounds: tuple):
    """HTTP range read of only the intersecting window (never resample classes)."""
    settings = get_settings()
    with rasterio.Env(GDAL_HTTP_TIMEOUT=str(settings.geographic_timeout_seconds),
                      GDAL_HTTP_CONNECTTIMEOUT="8", GDAL_HTTP_MAX_RETRY="1",
                      GDAL_HTTP_RETRY_DELAY="0.5", GDAL_DISABLE_READDIR_ON_OPEN="EMPTY_DIR",
                      CPL_VSIL_CURL_ALLOWED_EXTENSIONS=".tif"):
        def opener(path, mode="rb"):
            if path != url:
                raise FileNotFoundError(path)
            return RangeReader(path, settings.geographic_timeout_seconds)
        with rasterio.open(url, opener=opener) as src:
            if src.crs is None or src.crs.to_epsg() != 4326:
                raise ValueError("WorldCover returned an unexpected CRS")
            win = from_bounds(*bounds, src.transform)
            c0, r0 = math.floor(win.col_off), math.floor(win.row_off)
            c1, r1 = math.ceil(win.col_off + win.width), math.ceil(win.row_off + win.height)
            win = Window(max(0, c0), max(0, r0), min(src.width, c1)-max(0, c0), min(src.height, r1)-max(0, r0))
            if win.width * win.height > MAX_PIXELS:
                raise ValueError("Field exceeds the bounded native-resolution land-cover window; select a smaller parcel")
            return src.read(1, window=win), window_transform(win, src.transform)


def validate_land(session: Session, geometry: dict) -> LandValidation:
    key = SOURCE + ":" + hashlib.sha256(json.dumps(geometry, sort_keys=True).encode()).hexdigest()
    cached = cache_get(session, key, get_settings().geographic_cache_ttl_seconds)
    if cached:
        result = LandValidation(**json.loads(cached.payload_json))
        result.source_status = "cached"
        return result
    geom = shape(geometry)
    minx, miny, maxx, maxy = geom.bounds
    tiles = [(x, y) for x in range(math.floor(minx/3)*3, math.floor(math.nextafter(maxx, minx)/3)*3+1, 3)
             for y in range(math.floor(miny/3)*3, math.floor(math.nextafter(maxy, miny)/3)*3+1, 3)]
    if len(tiles) > 4:
        return LandValidation("LAND_USE_UNCERTAIN", False, source_status="unavailable",
                              detail="Field spans too many WorldCover tiles for bounded validation")
    counts: dict[int, int] = {}
    total = 0
    urls = []
    try:
        for x, y in tiles:
            intersect = geom.intersection(box(x, y, x+3, y+3))
            if intersect.is_empty or intersect.area == 0:
                continue
            tile = f"{'N' if y >= 0 else 'S'}{abs(y):02d}{'E' if x >= 0 else 'W'}{abs(x):03d}"
            url = f"{BASE_URL}/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif"
            urls.append(url)
            data, affine = _read_tile(url, intersect.bounds)
            inside = geometry_mask([mapping(intersect)], out_shape=data.shape, transform=affine, invert=True)
            # A subpixel parcel does not get a fictitious center measurement.
            # Treat touched pixels as contextual support if no center lies inside.
            if not inside.any():
                inside = geometry_mask([mapping(intersect)], out_shape=data.shape, transform=affine,
                                       invert=True, all_touched=True)
            values, numbers = np.unique(data[inside], return_counts=True)
            total += int(inside.sum())
            for value, number in zip(values, numbers):
                counts[int(value)] = counts.get(int(value), 0) + int(number)
    except (rasterio.errors.RasterioError, httpx.HTTPError, ValueError, OSError) as exc:
        return LandValidation("LAND_USE_UNCERTAIN", False, source_status="unavailable", source_urls=urls,
                              detail=f"Land/water evidence could not be obtained; retry validation. {exc}")
    valid = sum(n for k, n in counts.items() if k in KNOWN_CLASSES)
    coverage = valid / total if total else 0.0
    water = counts.get(80, 0) / valid if valid else None
    common = dict(water_fraction=water, valid_fraction=coverage,
                  classes={str(k): n for k, n in counts.items()}, source_urls=urls)
    if coverage < .99:
        result = LandValidation("LAND_USE_UNCERTAIN", False, **common,
                                detail="Incomplete land/water raster coverage; NoData is not evidence of water")
    elif water == 1:
        result = LandValidation("WATER_AREA", False, **common,
                                detail="All sampled parcel pixels are permanent water in ESA WorldCover 2021")
    elif water and water > 0:
        result = LandValidation("PARTIALLY_WATER", False, **common,
                                detail="The selected boundary intersects mapped permanent water; correct the boundary")
    elif counts.get(50, 0) + counts.get(70, 0) > .95 * valid:
        result = LandValidation("LAND_USE_UNCERTAIN", True, **common,
                                detail="Terrestrial parcel, predominantly mapped built-up or snow/ice in 2021; agricultural suitability requires local verification")
    else:
        result = LandValidation("LAND_CONFIRMED", True, **common,
                                detail="No permanent water mapped inside the parcel; terrestrial land does not prove agricultural suitability")
    if coverage >= .99:
        cache_put(session, key, SOURCE, asdict(result), "ESA WorldCover 2021 v200")
    return result


def require_terrestrial_field(session: Session, geometry: dict) -> LandValidation:
    result = validate_land(session, geometry)
    if result.can_proceed:
        return result
    messages = {
        "WATER_AREA": "La parcelle sélectionnée se trouve dans une zone maritime ou une surface d’eau. Veuillez sélectionner une parcelle située sur terre.",
        "PARTIALLY_WATER": "La parcelle sélectionnée chevauche une surface d’eau ou un littoral. Veuillez corriger ses limites.",
        "LAND_USE_UNCERTAIN": "La vérification terre/eau est indisponible ou incomplète. Réessayez ; cette absence de données ne signifie pas que votre parcelle est impropre à l’agriculture.",
    }
    raise ApiError(messages[result.status], code=result.status,
                   status_code=503 if result.status == "LAND_USE_UNCERTAIN" else 422,
                   details={"geographic_validation": asdict(result)})
