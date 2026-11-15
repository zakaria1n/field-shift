"""Yield reference assessment via GAEZ v5 for candidate crops.

Every eligible crop gets an explicit reference status; unmapped crops and
missing raster values are reported as unavailable with precise reasons.
Values are attainable-yield references under a named scenario
(baseline 2001-2020, AgERA5, historical), never harvest predictions.
"""
from __future__ import annotations

from app.data_providers import gaez
from app.data_providers.interfaces import ProviderResult


def assess_crop(crop_id: str, lat: float, lon: float,
                irrigation_type: str | None = None) -> tuple[ProviderResult, float | None]:
    result = gaez.fetch_yield_reference(lat, lon, crop_id, irrigation_type)
    value: float | None = None
    for obs_row in result.observations:
        if obs_row.get("indicator") == "yield_reference_attainable":
            value = obs_row.get("value_num")
    return result, value


def assess_pool(crop_ids: list[str], lat: float, lon: float,
                irrigation_type: str | None = None) -> tuple[dict[str, float | None], list[ProviderResult]]:
    refs: dict[str, float | None] = {}
    results: list[ProviderResult] = []
    for crop_id in crop_ids:
        result, value = assess_crop(crop_id, lat, lon, irrigation_type)
        refs[crop_id] = value
        results.append(result)
    return refs, results
