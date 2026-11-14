"""Field geometry validation and geodesic area calculation.

- Shapely validates structure/ring closure/self-intersection (documented T02).
- Area uses pyproj.Geod (WGS84): geodesic hectares, not a naive planar
  degrees-squared formula.
"""
import json
import math
from typing import Any

from pyproj import Geod
from shapely.geometry import MultiPolygon, Polygon, mapping, shape
from shapely.validation import explain_validity

from app.config import get_settings
from app.core.errors import ValidationFailed

_GEOD = Geod(ellps="WGS84")

SUPPORTED_TYPES = {"Polygon", "MultiPolygon"}


def _validate_ring_coords(coords: list) -> None:
    if len(coords) < 4:
        raise ValidationFailed("Polygon ring must contain at least 4 positions (closed ring).",
                               code="polygon_too_small")
    if coords[0] != coords[-1]:
        raise ValidationFailed("Polygon ring is not closed (first position != last position).",
                               code="ring_not_closed")
    for lon, lat in coords:
        if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
            raise ValidationFailed("Coordinate out of geographic bounds (lon [-180,180], lat [-90,90]).",
                                   code="coordinate_out_of_bounds")
        if isinstance(lon, float) and (math.isnan(lon) or math.isinf(lon)) or \
           isinstance(lat, float) and (math.isnan(lat) or math.isinf(lat)):
            raise ValidationFailed("Coordinate is not a finite number.", code="coordinate_invalid")


def _to_shapely(geojson: dict) -> Polygon | MultiPolygon:
    try:
        geom = shape(geojson)
    except Exception as exc:  # malformed GeoJSON
        raise ValidationFailed(f"GeoJSON geometry could not be parsed: {exc}", code="geojson_invalid") from exc
    if isinstance(geom, Polygon):
        return geom
    if isinstance(geom, MultiPolygon):
        if len(geom.geoms) == 0:
            raise ValidationFailed("MultiPolygon is empty.", code="polygon_empty")
        return geom
    raise ValidationFailed(f"Geometry type must be Polygon or MultiPolygon, got '{geojson.get('type')}'.",
                           code="geometry_type_unsupported")


def validate_field_geometry(geojson: dict) -> dict:
    """Validate and normalize a field geometry. Returns metrics dict."""
    if not isinstance(geojson, dict) or geojson.get("type") not in SUPPORTED_TYPES:
        raise ValidationFailed("Provide a GeoJSON Polygon or MultiPolygon.", code="geometry_type_unsupported")

    if geojson["type"] == "Polygon":
        for ring in geojson.get("coordinates", []):
            _validate_ring_coords(ring)
    else:
        for poly in geojson.get("coordinates", []):
            for ring in poly:
                _validate_ring_coords(ring)

    geom = _to_shapely(geojson)
    if geom.is_empty:
        raise ValidationFailed("Geometry is empty.", code="polygon_empty")
    if not geom.is_valid:
        raise ValidationFailed(
            f"Self-intersecting or otherwise invalid geometry ({explain_validity(geom)}).",
            code="polygon_self_intersecting",
        )

    settings = get_settings()
    area_m2, perimeter_m = _geodesic_area_perimeter(geom)
    area_ha = area_m2 / 10_000.0

    if area_ha < settings.min_field_area_ha:
        raise ValidationFailed(
            f"Field area {area_ha:.4f} ha is below the usable minimum of {settings.min_field_area_ha} ha.",
            code="polygon_too_tiny",
        )
    if area_ha > settings.max_field_area_ha:
        raise ValidationFailed(
            f"Field area {area_ha:.0f} ha exceeds the supported maximum of {settings.max_field_area_ha:.0f} ha.",
            code="polygon_too_large",
        )

    centroid = geom.centroid
    bounds = list(geom.bounds)  # minx, miny, maxx, maxy

    return {
        "geometry_geojson": json.dumps(mapping(geom)),
        "area_ha": round(area_ha, 4),
        "area_m2": round(area_m2, 2),
        "perimeter_m": round(perimeter_m, 2),
        "centroid_lat": round(float(centroid.y), 6),
        "centroid_lon": round(float(centroid.x), 6),
        "bbox": [round(b, 6) for b in bounds],
        "vertex_count": _vertex_count(geom),
    }


def _geodesic_area_perimeter(geom) -> tuple[float, float]:
    total_area = 0.0
    total_perimeter = 0.0
    polygons = geom.geoms if isinstance(geom, MultiPolygon) else [geom]
    for poly in polygons:
        area, perim = _polygon_geodesic(poly)
        total_area += area
        total_perimeter += perim
    return total_area, total_perimeter


def _polygon_geodesic(poly: Polygon) -> tuple[float, float]:
    # pyproj.Geod: signed area; exterior positive orientation handled via abs per ring.
    area, perim = _GEOD.geometry_area_perimeter(poly.exterior)
    ring_area = abs(area)
    for interior in poly.interiors:
        hole_area, hole_perim = _GEOD.geometry_area_perimeter(interior)
        ring_area -= abs(hole_area)
        perim += abs(hole_perim)
    return ring_area, perim


def _vertex_count(geom) -> int:
    polygons = geom.geoms if isinstance(geom, MultiPolygon) else [geom]
    count = 0
    for poly in polygons:
        count += len(poly.exterior.coords) - 1
        count += sum(len(r.coords) - 1 for r in poly.interiors)
    return count


def geometry_summary(geojson: dict) -> dict[str, Any]:
    """Light summary for persisted geometry without re-validating hard failures."""
    try:
        geom = shape(geojson)
        centroid = geom.centroid
        bounds = list(geom.bounds)
        area_m2, _ = _geodesic_area_perimeter(geom)
        return {
            "centroid_lat": round(float(centroid.y), 6),
            "centroid_lon": round(float(centroid.x), 6),
            "bbox": [round(b, 6) for b in bounds],
            "area_ha": round(area_m2 / 10_000.0, 4),
        }
    except Exception:
        return {"centroid_lat": 0.0, "centroid_lon": 0.0, "bbox": [], "area_ha": 0.0}
