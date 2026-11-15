"""Official SoilGrids access: bounded WCS subsets and authentic SQLite cache.

The operational endpoint is https://maps.isric.org/mapserv (WCS 2.0.1).
The independently paused REST API is not called. A legacy WebDAV reader is
retained for its offline regression tests; the application no longer needs
whole mosaic indices or complete tiles. Depth remains explicitly 5-15 cm.
"""
import io
import json
import logging
import xml.etree.ElementTree as ET
from typing import Any

import httpx
import rasterio
from dataclasses import dataclass
from pyproj import CRS, Transformer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.data_providers.cache import cache_get, cache_put
from app.data_providers.interfaces import (
    STATUS_LIVE,
    STATUS_UNAVAILABLE,
    ProviderResult,
    obs,
    utcnow_iso,
)

log = logging.getLogger("fieldshift.soilgrids")

SOURCE_ID = "soilgrids"
FILE_HOST = "https://files.isric.org/soilgrids/latest/data"
DEPTH = "5-15cm"
STATISTIC = "mean"
SOILGRID_VERSION_NOTE = "SoilGrids 2020 release (v2.0.0)"

# property file stem, indicator, conversion divisor, output unit
PROPERTY_SPECS = [
    ("phh2o", "soil_ph", 10.0, "pH"),
    ("soc", "soil_organic_carbon", 10.0, "g/kg"),
    ("nitrogen", "soil_total_nitrogen", 100.0, "g/kg"),
    ("sand", "soil_sand_fraction", 10.0, "%"),
    ("silt", "soil_silt_fraction", 10.0, "%"),
    ("clay", "soil_clay_fraction", 10.0, "%"),
]

IGH_CRS = CRS.from_proj4("+proj=igh +lon_0=0 +x_0=0 +y_0=0 +datum=WGS84 +units=m +no_defs")
NODATA = -32768
NEIGHBORHOOD_HALF_WIDTH = 10  # +/-10 pixels around the centroid (<= ~5 km)
MAX_WINDOW_PIXELS = 61 * 61  # clamp any window (<= ~15 km per side)
VRT_INDEX_TTL_MULTIPLIER = 30  # tile layouts are static for a release


@dataclass
class _MosaicIndex:
    origin_x: float
    origin_y: float
    res_x: float
    res_y: float
    entries: list[tuple[str, float, float, float, float]]


def _parse_vrt(xml_bytes: bytes) -> _MosaicIndex:
    root = ET.fromstring(xml_bytes)
    gt = [float(v) for v in root.find("GeoTransform").text.split(",")]
    entries: list[tuple[str, float, float, float, float]] = []
    for src in root.iter("ComplexSource"):
        rect = src.find("DstRect")
        entries.append((
            src.find("SourceFilename").text,
            float(rect.get("xOff")), float(rect.get("yOff")),
            float(rect.get("xSize")), float(rect.get("ySize")),
        ))
    return _MosaicIndex(gt[0], gt[3], gt[1], gt[5], entries)


def _load_mosaic_index(session: Session, property_stem: str) -> _MosaicIndex:
    """Parse the VRT for one property/depth, cached in SQLite."""
    cache_key = f"{SOURCE_ID}:vrt:{property_stem}_{DEPTH}_{STATISTIC}"
    ttl = get_settings().provider_cache_ttl_seconds * VRT_INDEX_TTL_MULTIPLIER
    cached = cache_get(session, cache_key, ttl)
    if cached is not None:
        return _MosaicIndex(**json.loads(cached.payload_json))

    url = f"{FILE_HOST}/{property_stem}/{property_stem}_{DEPTH}_{STATISTIC}.vrt"
    resp = httpx.get(url, timeout=get_settings().power_timeout_seconds * 4)
    resp.raise_for_status()
    index = _parse_vrt(resp.content)
    cache_put(session, cache_key, SOURCE_ID, {
        "origin_x": index.origin_x, "origin_y": index.origin_y,
        "res_x": index.res_x, "res_y": index.res_y,
        "entries": index.entries,
    }, "VRT tile index (static per release)")
    return index


def _load_tile(property_stem: str, tile_path: str):
    url = f"{FILE_HOST}/{property_stem}/" + tile_path.lstrip("./")
    resp = httpx.get(url, timeout=60)
    resp.raise_for_status()
    return rasterio.open(io.BytesIO(resp.content))


def _pixel_of(index: _MosaicIndex, transformer, lon: float, lat: float) -> tuple[float, float]:
    x, y = transformer.transform(lon, lat)
    return (x - index.origin_x) / index.res_x, (y - index.origin_y) / index.res_y


def _sample_window(index: _MosaicIndex, transformer, geometry: dict | None,
                   lat: float, lon: float) -> tuple[float, float, float, float, str, list[float], list[float]]:
    """Return (c0, c1, r0, r1, mode, cols, rows) describing what to sample.

    Polygon mode when the polygon spans >= 1 pixel in both directions and
    stays within the supported window; otherwise a bounded centroid
    neighborhood (documented regional approximation).
    """
    col_c, row_c = _pixel_of(index, transformer, lon, lat)

    mode = "centroid_neighborhood"
    cols = [col_c]
    rows = [row_c]
    if geometry and str(geometry.get("type", "")).startswith("Polygon"):
        coords: list[list[float]] = []
        if geometry["type"] == "Polygon":
            coords = list(geometry["coordinates"][0])
        else:
            for poly in geometry["coordinates"]:
                coords.extend(poly[0])
        # densify so curved IGH edges cannot skip pixels
        dense: list[list[float]] = []
        for i in range(len(coords)):
            x1, y1 = coords[i]
            x2, y2 = coords[(i + 1) % len(coords)]
            steps = max(1, int(max(abs(x2 - x1), abs(y2 - y1)) / 0.02))
            for s in range(steps):
                f = s / steps
                dense.append([x1 + (x2 - x1) * f, y1 + (y2 - y1) * f])
        px: list[float] = []
        py: list[float] = []
        for lon_i, lat_i in dense:
            c, r = _pixel_of(index, transformer, lon_i, lat_i)
            px.append(c)
            py.append(r)
        col_w = max(px) - min(px)
        row_w = max(py) - min(py)
        if col_w >= 1 and row_w >= 1 and (col_w * row_w) <= MAX_WINDOW_PIXELS:
            mode = "polygon"
            cols, rows = px, py

    if mode == "polygon":
        # every bounding-box pixel is a candidate; point-in-polygon filtering
        # at pixel centers selects the real sample during readout
        cols = list(range(int(min(cols)), int(max(cols)) + 1))
        rows = list(range(int(min(rows)), int(max(rows)) + 1))
    else:
        cols = [int(col_c) + d for d in range(-NEIGHBORHOOD_HALF_WIDTH, NEIGHBORHOOD_HALF_WIDTH + 1)]
        rows = [int(row_c) + d for d in range(-NEIGHBORHOOD_HALF_WIDTH, NEIGHBORHOOD_HALF_WIDTH + 1)]

    return min(cols), max(cols), min(rows), max(rows), mode, cols, rows


def _point_in_geometry(lon: float, lat: float, geometry: dict | None) -> bool:
    if not geometry:
        return True
    from shapely.geometry import Point, shape
    return shape(geometry).covers(Point(lon, lat))


def _fetch_soil_webdav(session: Session, lat: float, lon: float, geometry: dict | None = None) -> ProviderResult:
    settings = get_settings()
    if not settings.soilgrids_enabled:
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              detail="SoilGrids disabled by configuration")

    observations: list[dict[str, Any]] = []
    try:
        transformer = Transformer.from_crs("EPSG:4326", IGH_CRS, always_xy=True)
        inverse_transformer = Transformer.from_crs(IGH_CRS, "EPSG:4326", always_xy=True)
        detail_parts: list[str] = []
        for property_stem, indicator, divisor, unit in PROPERTY_SPECS:
            try:
                index = _load_mosaic_index(session, property_stem)
            except httpx.HTTPError as exc:
                return ProviderResult(
                    source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                    detail=f"SoilGrids tile index unreachable from this deployment: {exc}",
                )
            c0, c1, r0, r1, mode, cols, rows = _sample_window(index, transformer, geometry, lat, lon)
            col_set, row_set = set(cols), set(rows)

            values: list[float] = []
            n_total = 0
            touched_tiles: set[str] = set()
            for entry in index.entries:
                tile_path, xo, yo, tw, th = entry
                if xo > c1 or xo + tw <= c0 or yo > r1 or yo + th <= r0:
                    continue
                touched_tiles.add(tile_path)
                if len(touched_tiles) > 6:
                    return ProviderResult(
                        source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                        detail="field window spans too many mosaic tiles; "
                               "area exceeds the supported sampling size",
                    )
                with _load_tile(property_stem, tile_path) as tsrc:
                    band = tsrc.read(1)
                for row in sorted(row_set & set(range(int(yo), int(yo + th)))):
                    for col in sorted(col_set & set(range(int(xo), int(xo + tw)))):
                        n_total += 1
                        if mode == "polygon":
                            px_lon, px_lat = inverse_transformer.transform(
                                index.origin_x + (col + 0.5) * index.res_x,
                                index.origin_y + (row + 0.5) * index.res_y,
                            )
                            if not _point_in_geometry(px_lon, px_lat, geometry):
                                continue
                        v = float(band[row - int(yo), col - int(xo)])
                        if v != NODATA:
                            values.append(v)
            n_valid = len(values)

            # Mosaic-gap fallback: a polygon that lands fully inside a gap
            # still gets the bounded centroid-neighborhood estimate, clearly
            # labelled — the neighborhood IS valid data (verified per pixel),
            # it is just not inside the drawn boundary.
            fallback_note = None
            if not values and mode == "polygon":
                col_c, row_c = _pixel_of(index, transformer, lon, lat)
                nb_cols = [int(col_c) + d for d in range(-NEIGHBORHOOD_HALF_WIDTH, NEIGHBORHOOD_HALF_WIDTH + 1)]
                nb_rows = [int(row_c) + d for d in range(-NEIGHBORHOOD_HALF_WIDTH, NEIGHBORHOOD_HALF_WIDTH + 1)]
                for entry in index.entries:
                    tile_path, xo, yo, tw, th = entry
                    if xo > max(nb_cols) or xo + tw <= min(nb_cols) or \
                       yo > max(nb_rows) or yo + th <= min(nb_rows):
                        continue
                    touched_tiles.add(tile_path)
                    with _load_tile(property_stem, tile_path) as tsrc:
                        band = tsrc.read(1)
                    for row in sorted(set(nb_rows) & set(range(int(yo), int(yo + th)))):
                        for col in sorted(set(nb_cols) & set(range(int(xo), int(xo + tw)))):
                            n_total += 1
                            v = float(band[row - int(yo), col - int(xo)])
                            if v != NODATA:
                                values.append(v)
                if values:
                    mode = "polygon_gap_neighborhood_fallback"
                    fallback_note = (
                        "the drawn polygon falls fully within a SoilGrids mosaic "
                        "gap; the estimate uses the nearest valid pixels in a "
                        "bounded neighborhood around the field centroid"
                    )
            n_valid = len(values)

            # Proxy classification: when no sampled pixel is provably inside
            # the drawn boundary, the result is a NEARBY-PROXY estimate, not a
            # direct field sample. Record distance, coverage, method and
            # confidence so consumers can keep it out of hard constraints.
            proxy = mode != "polygon"
            proxy_distance_km = None
            if proxy and values:
                from pyproj import Geod
                geod = Geod(ellps="WGS84")
                dists = []
                for col_i, row_i in zip(cols, rows):
                    px_lon, px_lat = inverse_transformer.transform(
                        index.origin_x + (col_i + 0.5) * index.res_x,
                        index.origin_y + (row_i + 0.5) * index.res_y,
                    )
                    dists.append(geod.inv(lon, lat, px_lon, px_lat)[2] / 1000.0)
                proxy_distance_km = {
                    "mean": round(sum(dists) / len(dists), 2),
                    "max": round(max(dists), 2),
                }
            valid_ratio = (n_valid / n_total) if n_total else 0.0
            if proxy:
                confidence = "low"
            elif valid_ratio >= 0.5:
                confidence = "moderate"
            else:
                confidence = "low"
            common_meta = {
                "depth": DEPTH,
                "statistic": STATISTIC,
                "n_valid_pixels": n_valid,
                "n_total_pixels": n_total,
                "sample_mode": mode,
                "proxy": proxy,
                "confidence": confidence,
                "valid_coverage": round(valid_ratio, 3),
                "docs_url": "https://www.isric.org/explore/soilgrids",
            }
            if proxy:
                common_meta["proxy_distance_km"] = proxy_distance_km
                common_meta["proxy_note"] = (
                    "nearby-proxy estimate: sampled pixels are outside the drawn "
                    "polygon; use as indicative context only, not as a direct "
                    "field measurement or a hard agronomic constraint"
                )
            if n_valid:
                extra = {"fallback_note": fallback_note} if fallback_note else {}
                observations.append(obs(
                    indicator, round(sum(values) / n_valid / divisor, 2), unit,
                    source_id=SOURCE_ID,
                    quality_status="pending",
                    source_layer=f"SoilGrids {property_stem}_{DEPTH}_{STATISTIC} (WebDAV tile mosaic)",
                    period_start="2020",
                    spatial_support="global_model_grid (~250 m pixels; regional "
                                    "estimate, not a laboratory test)",
                    meta={**common_meta, "sample_mode": mode, **extra,
                          "scale_divisor": divisor,
                          "note": "modeled ISRIC SoilGrids prediction, not a field soil test"},
                ))
            else:
                observations.append(obs(
                    indicator, None, unit,
                    source_id=SOURCE_ID,
                    quality_status="pending",
                    source_layer=f"SoilGrids {property_stem}_{DEPTH}_{STATISTIC}",
                    period_start="2020",
                    spatial_support="global_model_grid (~250 m pixels)",
                    meta={**common_meta,
                          "note": "mosaic gap: no valid predicted pixel at this location"},
                ))
            detail_parts.append(f"{property_stem}: {n_valid}/{n_total} valid px ({mode})")

        if not any(o["value_num"] is not None for o in observations):
            return ProviderResult(
                source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                detail="SoilGrids mosaic has no valid predicted pixels at this "
                       "location for any property; values stay unavailable",
            )

        return ProviderResult(
            source_id=SOURCE_ID, status=STATUS_LIVE,
            observations=observations,
            data_period=SOILGRID_VERSION_NOTE,
            source_layer="SoilGrids WebDAV tile mosaic",
            detail="live tile sample; " + "; ".join(detail_parts),
        )
    except httpx.HTTPError as exc:
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              detail=f"SoilGrids WebDAV unreachable: {exc}")
    except (KeyError, ValueError, RuntimeError, ET.ParseError) as exc:
        log.warning("SoilGrids sampling failed: %s", exc)
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              detail=f"SoilGrids sampling error: {exc}")


# The actual documented WCS is maps.isric.org/mapserv, not wcs.isric.org.
# The REST pause does not imply this independent endpoint is down.
WCS_URL = "https://maps.isric.org/mapserv"


def _wcs_read(stem: str, bounds: tuple):
    """Return an authentic native-grid subset; no resampling/depth averaging."""
    import numpy as np
    from app.config import get_settings
    from rasterio.io import MemoryFile
    params = [("map", f"/map/{stem}.map"), ("SERVICE", "WCS"),
              ("VERSION", "2.0.1"), ("REQUEST", "GetCoverage"),
              ("COVERAGEID", f"{stem}_{DEPTH}_{STATISTIC}"), ("FORMAT", "image/tiff"),
              ("SUBSET", f"X({bounds[0]},{bounds[2]})"),
              ("SUBSET", f"Y({bounds[1]},{bounds[3]})")]
    response = None
    for attempt in range(2):
        try:
            response = httpx.get(WCS_URL, params=params, timeout=get_settings().soilgrids_timeout_seconds)
            response.raise_for_status()
            break
        except httpx.HTTPError:
            if attempt:
                raise
    if len(response.content) > 2_000_000:
        raise ValueError("Soil subset exceeds bounded response size")
    if "tiff" not in response.headers.get("content-type", "").lower():
        raise ValueError("WCS returned an exception instead of GeoTIFF: " + response.text[:180])
    with MemoryFile(response.content) as mem:
        with mem.open() as src:
            if src.crs is None or not CRS(src.crs).equals(IGH_CRS, ignore_axis_order=True):
                raise ValueError("Unexpected WCS CRS")
            if src.width * src.height > MAX_WINDOW_PIXELS:
                raise ValueError("Soil subset exceeds bounded pixel count")
            if not (abs(abs(src.res[0])-250) < 1 and abs(abs(src.res[1])-250) < 1):
                raise ValueError("Unexpected SoilGrids resolution")
            data = src.read(1)
            # WCS emits zero in uncovered cells without a GeoTIFF NoData tag.
            # Conservatively keep zero as unknown here, not an invented pH=0.
            valid = (data > 0) & (data != 65535)
            if src.nodata is not None:
                valid &= data != src.nodata
            return np.where(valid, data.astype(float), np.nan), src.transform


def _wcs_property(stem, indicator, divisor, unit, lat, lon, geometry):
    import math
    import numpy as np
    from shapely.geometry import shape, mapping, box
    from shapely.ops import transform as transform_shape
    from rasterio.features import geometry_mask
    forward = Transformer.from_crs("EPSG:4326", IGH_CRS, always_xy=True)
    x, y = forward.transform(lon, lat)
    selected = transform_shape(forward.transform, shape(geometry)) if geometry else None
    initial = selected.bounds if selected is not None else (x-125, y-125, x+125, y+125)
    c0, r0, c1, r1 = initial
    # At least one complete native pixel around the location; round outwards.
    bounds = (math.floor(c0/250)*250, math.floor(r0/250)*250,
              math.ceil(c1/250)*250, math.ceil(r1/250)*250)
    if ((bounds[2]-bounds[0])/250)*((bounds[3]-bounds[1])/250) > MAX_WINDOW_PIXELS:
        raise ValueError("Field too large for bounded SoilGrids subset")
    data, affine = _wcs_read(stem, bounds)
    mask = geometry_mask([mapping(selected)], data.shape, affine, invert=True) if selected is not None else np.ones(data.shape, dtype=bool)
    # A small field has only neighborhood support at 250 m.
    mode = "polygon" if mask.any() and selected is not None else "centroid_neighborhood"
    if not mask.any():
        mask = np.ones(data.shape, dtype=bool)
    sampled = data[mask]
    values = sampled[np.isfinite(sampled)]
    fallback = False
    if not values.size:
        bounds = (math.floor((x-2500)/250)*250, math.floor((y-2500)/250)*250,
                  math.ceil((x+2500)/250)*250, math.ceil((y+2500)/250)*250)
        data, affine = _wcs_read(stem, bounds)
        sampled = data.ravel()
        values = sampled[np.isfinite(sampled)]
        mode = "centroid_neighborhood"
        fallback = True
    meta = {
        "depth": DEPTH, "statistic": STATISTIC, "access_method": "WCS 2.0.1",
        "retrieved_at": utcnow_iso(),
        "endpoint": WCS_URL, "coverage_id": f"{stem}_{DEPTH}_{STATISTIC}",
        "sample_mode": mode, "proxy": mode != "polygon", "fallback_to_neighborhood": fallback,
        "n_valid_pixels": int(values.size), "n_total_pixels": int(sampled.size),
        "valid_coverage": round(float(values.size/max(sampled.size, 1)), 3),
        "confidence": "low" if mode != "polygon" else "moderate",
        "scale_divisor": divisor, "sample_bounds_igh_m": list(bounds),
        "zero_handling": "WCS uncovered cells emitted as zero; conservatively treated as missing",
        "docs_url": "https://docs.isric.org/globaldata/soilgrids/wcs.html",
        "note": "Modelled estimate at 250 m, not a laboratory measurement; nearby pixels may lie outside the field" if mode != "polygon" else "Modelled pixel estimates, not a laboratory soil test",
    }
    return obs(indicator, round(float(values.mean()/divisor), 2) if values.size else None, unit,
               source_id=SOURCE_ID, quality_status="live", source_layer=f"SoilGrids {stem}_{DEPTH}_{STATISTIC} (WCS)",
               period_start="2020", spatial_support="global_model_grid (~250 m; " + mode + ")", meta=meta)


def fetch_soil(session: Session, lat: float, lon: float, geometry: dict | None = None) -> ProviderResult:
    """Official bounded WCS subsets with authentic, geometry-keyed SQLite cache.

    A failed property doesn't discard other successfully retrieved properties.
    An expired authentic cache is explicit; missing data never becomes a zero.
    The legacy WebDAV reader remains for offline tests/data migration, but large
    tile downloads are no longer required by the application path.
    """
    import hashlib
    from dataclasses import asdict
    from concurrent.futures import ThreadPoolExecutor
    from app.data_providers.cache import cache_get_stale
    from app.data_providers.interfaces import STATUS_CACHED, utcnow_iso
    settings = get_settings()
    if not settings.soilgrids_enabled:
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE, detail="SoilGrids disabled by configuration", reason_code="disabled")
    if not (-90 <= lat <= 90 and -180 <= lon <= 180):
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE, detail="invalid_location: WGS84 coordinates out of bounds", reason_code="invalid_location")
    # Native coverage envelope from the official WCS DescribeCoverage response.
    # This describes source coverage only; it is never a land/water rule.
    x, y = Transformer.from_crs("EPSG:4326", IGH_CRS, always_xy=True).transform(lon, lat)
    if not (-19949750 <= x <= 19861750 and -6147500 <= y <= 8361000):
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              reason_code="unsupported_geographic_coverage", detail="Outside the published SoilGrids WCS native envelope")
    digest = hashlib.sha256(json.dumps([lat, lon, geometry], sort_keys=True).encode()).hexdigest()
    key = f"soilgrids:wcs:{DEPTH}:{STATISTIC}:{digest}"
    cached = cache_get(session, key, settings.provider_cache_ttl_seconds)
    if cached:
        result = ProviderResult(**json.loads(cached.payload_json))
        result.status = STATUS_CACHED
        for o in result.observations:
            o["quality_status"] = STATUS_CACHED
        result.detail = "Authentic SoilGrids WCS estimates from cache; " + (result.detail or "")
        return result
    observations = []
    failures = []
    def one(spec):
        try:
            return _wcs_property(*spec, lat, lon, geometry), None
        except (httpx.HTTPError, rasterio.errors.RasterioError, OSError, ValueError, KeyError) as exc:
            return None, f"{spec[0]}: {type(exc).__name__}: {exc}"
    with ThreadPoolExecutor(max_workers=3) as workers:
        for item, error in workers.map(one, PROPERTY_SPECS):
            if item:
                observations.append(item)
            if error:
                failures.append(error)
    any_value = any(o["value_num"] is not None for o in observations)
    if any_value:
        result = ProviderResult(source_id=SOURCE_ID, status=STATUS_LIVE, observations=observations,
                                data_period=SOILGRID_VERSION_NOTE, fetched_at=utcnow_iso(),
                                source_layer=f"SoilGrids WCS {DEPTH} mean", detail="Official WCS subsets; " + ("partial properties: " + "; ".join(failures) if failures else "all properties fetched"))
        result.reason_code = "partial_properties" if failures or any(o["value_num"] is None for o in observations) else "retrieved"
        cache_put(session, key, SOURCE_ID, asdict(result), SOILGRID_VERSION_NOTE)
        return result
    stale = cache_get_stale(session, key)
    if stale and failures:
        result = ProviderResult(**json.loads(stale.payload_json))
        result.status = STATUS_CACHED
        result.reason_code = "provider_unavailable_authentic_stale_cache"
        result.detail = "Provider unavailable; serving expired authentic WCS cache from " + stale.fetched_at
        for o in result.observations:
            o["quality_status"] = STATUS_CACHED
        return result
    return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE if failures else "missing", observations=observations,
                          reason_code="provider_unavailable" if failures else "missing_soil_data",
                          detail=("provider_unavailable: " + "; ".join(failures)) if failures else
                          "missing_soil_data: no valid predicted pixels in bounded field/neighborhood coverage",
                          fetched_at=utcnow_iso(), data_period=SOILGRID_VERSION_NOTE)
