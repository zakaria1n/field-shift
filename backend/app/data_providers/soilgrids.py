"""SoilGrids access through the official WebDAV tile mosaic on files.isric.org.

Context (verified 2026-11-15 from this environment): the SoilGrids REST API
(api.map.isric.org) and the GeoServer WCS (wcs.isric.org) both resolve,
worldwide, to a parking IP (213.186.33.5) while the documented service pause
is in effect — so neither is callable. The third official access route, the
WebDAV-published VRT mosaic plus per-tile GeoTIFFs on files.isric.org, is
live and is what this adapter uses.

How it works:
- Each property/depth is published as a VRT: a global Interrupted Goode
  Homolosine mosaic (250 m, Int16, nodata -32768) built from ~7700 small
  600x600 tile GeoTIFFs.
- The adapter parses the VRT index (cached in SQLite), transforms the field
  into the mosaic CRS (pyproj +proj=igh), and downloads only the tiles that
  actually cover the field.
- Sampling: medium/large polygons take all mosaic pixels whose centers fall
  inside the polygon; small fields (below one pixel) take a bounded
  neighborhood around the centroid pixel and the result is explicitly
  labelled a regional neighborhood estimate.
- Stored values are integers; official conversion factors (ISRIC FAQ):
  phh2o /10 -> pH, soc /10 -> g/kg, sand|silt|clay /10 -> %, nitrogen /100
  -> g/kg. Mosaic gaps are real: if no valid pixel exists the observation is
  reported unavailable rather than interpolated.
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


def fetch_soil(session: Session, lat: float, lon: float, geometry: dict | None = None) -> ProviderResult:
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
            common_meta = {
                "depth": DEPTH,
                "statistic": STATISTIC,
                "n_valid_pixels": n_valid,
                "n_total_pixels": n_total,
                "sample_mode": mode,
                "docs_url": "https://www.isric.org/explore/soilgrids",
            }
            if n_valid:
                observations.append(obs(
                    indicator, round(sum(values) / n_valid / divisor, 2), unit,
                    source_id=SOURCE_ID,
                    quality_status="pending",
                    source_layer=f"SoilGrids {property_stem}_{DEPTH}_{STATISTIC} (WebDAV tile mosaic)",
                    period_start="2020",
                    spatial_support="global_model_grid (~250 m pixels; regional "
                                    "estimate, not a laboratory test)",
                    meta={**common_meta, "scale_divisor": divisor,
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
