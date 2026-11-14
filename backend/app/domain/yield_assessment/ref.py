"""Yield reference assessment via GAEZ (when available) for candidate crops.

Every crop gets an explicit reference status; unavailable references are
reported as unavailable. Values are attainable-yield references under a named
management scenario, never harvest predictions for the farmer's field.
"""
from __future__ import annotations

from app.data_providers import gaez
from app.data_providers.interfaces import ProviderResult


def assess_crop(crop_id: str, lat: float, lon: float) -> tuple[ProviderResult, float | None]:
    result = gaez.fetch_yield_reference(lat, lon, crop_id)
    value: float | None = None
    for obs_row in result.observations:
        if obs_row.get("indicator") == "yield_reference_attainable":
            value = obs_row.get("value_num")
    return result, value


def assess_pool(crop_ids: list[str], lat: float, lon: float) -> tuple[dict[str, float | None], list[ProviderResult]]:
    refs: dict[str, float | None] = {}
    results: list[ProviderResult] = []
    for crop_id in crop_ids:
        result, value = assess_crop(crop_id, lat, lon)
        refs[crop_id] = value
        results.append(result)
    return refs, results
