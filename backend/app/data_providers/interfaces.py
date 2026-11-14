"""Provider adapter interfaces.

Our own minimal contract (not an external SDK): each provider fetches data for
a location/period and returns a provenance-complete ProviderResult. Scoring
never imports providers directly; results land as Observation records.
"""
from __future__ import annotations

import json
from dataclasses import dataclass, field as dc_field
from datetime import datetime, timezone
from typing import Any, Protocol

STATUS_LIVE = "live"
STATUS_CACHED = "cached"
STATUS_MISSING = "missing"
STATUS_UNAVAILABLE = "unavailable"
STATUS_DEMO_FIXTURE = "demo_fixture"
STATUS_FAILED = "failed"


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


@dataclass
class ProviderResult:
    source_id: str
    status: str  # live | cached | missing | unavailable | demo_fixture | failed
    observations: list[dict[str, Any]] = dc_field(default_factory=list)
    detail: str | None = None
    fetched_at: str = dc_field(default_factory=utcnow_iso)
    data_period: str | None = None
    source_layer: str | None = None

    @property
    def ok(self) -> bool:
        return self.status in (STATUS_LIVE, STATUS_CACHED, STATUS_DEMO_FIXTURE)


class ClimateProvider(Protocol):
    source_id: str

    def fetch_climate(self, lat: float, lon: float, geometry: dict[str, Any]) -> ProviderResult: ...


class SoilProvider(Protocol):
    source_id: str

    def fetch_soil(self, lat: float, lon: float, geometry: dict[str, Any]) -> ProviderResult: ...


class YieldReferenceProvider(Protocol):
    source_id: str

    def fetch_yield_reference(self, lat: float, lon: float, crop_id: str) -> ProviderResult: ...


def obs(
    indicator: str,
    value: float | None,
    unit: str | None,
    *,
    source_id: str,
    quality_status: str,
    source_layer: str | None = None,
    period_start: str | None = None,
    period_end: str | None = None,
    spatial_support: str | None = None,
    meta: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Build one observation dict; never fabricates non-null values."""
    return {
        "indicator": indicator,
        "value_num": value,
        "value_json": json.dumps(meta) if meta else None,
        "unit": unit,
        "source_id": source_id,
        "source_layer": source_layer,
        "period_start": period_start,
        "period_end": period_end,
        "spatial_support": spatial_support,
        "quality_status": quality_status,
        "meta_json": json.dumps(meta) if meta else None,
    }
