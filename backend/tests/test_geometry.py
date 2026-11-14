"""Geometry validation and geodesic area tests."""
import pytest

from app.core.errors import ValidationFailed
from app.services.geometry import validate_field_geometry

SQUARE_TENTH_DEGREE = {
    "type": "Polygon",
    "coordinates": [[[-6.0, 33.0], [-5.9, 33.0], [-5.9, 33.1], [-6.0, 33.1], [-6.0, 33.0]]],
}


def test_geodesic_area_not_naive_planar():
    # 0.1deg x 0.1deg at lat 33 covers ~10,300 ha. A naive planar computation
    # using equator longitude spacing would give ~12,340 ha.
    result = validate_field_geometry(SQUARE_TENTH_DEGREE)
    assert 10_000 < result["area_ha"] < 10_600


def test_small_field_area_ha():
    poly = {
        "type": "Polygon",
        "coordinates": [[[-5.560, 33.900], [-5.552, 33.902], [-5.550, 33.896], [-5.557, 33.894], [-5.560, 33.900]]],
    }
    result = validate_field_geometry(poly)
    assert 40 < result["area_ha"] < 60
    assert result["centroid_lat"] == pytest.approx(33.898, abs=0.01)


def test_self_intersecting_polygon_rejected():
    bowtie = {
        "type": "Polygon",
        "coordinates": [[[-5.56, 33.90], [-5.54, 33.91], [-5.55, 33.895], [-5.552, 33.908], [-5.56, 33.90]]],
    }
    with pytest.raises(ValidationFailed) as exc:
        validate_field_geometry(bowtie)
    assert exc.value.code == "polygon_self_intersecting"


def test_open_ring_rejected():
    open_ring = {
        "type": "Polygon",
        "coordinates": [[[-5.56, 33.90], [-5.54, 33.91], [-5.55, 33.895], [-5.557, 33.894]]],
    }
    with pytest.raises(ValidationFailed) as exc:
        validate_field_geometry(open_ring)
    assert exc.value.code == "ring_not_closed"


def test_out_of_bounds_coordinates_rejected():
    bad = {
        "type": "Polygon",
        "coordinates": [[[-5.5, 33.9], [-5.4, 95.0], [-5.3, 33.8], [-5.5, 33.9]]],
    }
    with pytest.raises(ValidationFailed) as exc:
        validate_field_geometry(bad)
    assert exc.value.code == "coordinate_out_of_bounds"


def test_unsupported_geometry_type():
    with pytest.raises(ValidationFailed) as exc:
        validate_field_geometry({"type": "Point", "coordinates": [-5.5, 33.9]})
    assert exc.value.code == "geometry_type_unsupported"


def test_multipolygon_supported():
    multi = {
        "type": "MultiPolygon",
        "coordinates": [
            [[[-5.560, 33.900], [-5.558, 33.901], [-5.557, 33.899], [-5.559, 33.898], [-5.560, 33.900]]],
            [[[-5.552, 33.902], [-5.550, 33.903], [-5.549, 33.901], [-5.551, 33.900], [-5.552, 33.902]]],
        ],
    }
    result = validate_field_geometry(multi)
    assert result["area_ha"] > 0
    assert result["vertex_count"] == 8


def test_too_tiny_polygon_rejected():
    tiny = {
        "type": "Polygon",
        "coordinates": [[[-5.5600, 33.9000], [-5.56005, 33.9000], [-5.56005, 33.90005], [-5.5600, 33.90005], [-5.5600, 33.9000]]],
    }
    with pytest.raises(ValidationFailed) as exc:
        validate_field_geometry(tiny)
    assert exc.value.code == "polygon_too_tiny"
