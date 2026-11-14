"""NASA POWER climatology point client — the app's core live NASA integration.

Design notes (docs/04 B.1):
- Uses POWER's public Temporal Climatology Point API (20+ year monthly normals,
  no credentials). The Regional Insights polygon endpoint is documented but its
  exact variable codes/quotas are unverified for tiny farm AOIs; the point call
  at the polygon centroid is therefore the reliable primary path and is always
  labelled `centroid / regional grid approximation` with MERRA-2 native support.
- Responses are cached; a stale cache is usable only with `cached` status and
  its original fetch timestamp. Nothing is presented as live unless the live
  HTTP call succeeded for this request.
"""
import json
import logging
from typing import Any

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.data_providers.cache import cache_get, cache_get_stale, cache_put
from app.data_providers.interfaces import (
    STATUS_CACHED,
    STATUS_FAILED,
    STATUS_LIVE,
    STATUS_UNAVAILABLE,
    ProviderResult,
    obs,
    utcnow_iso,
)

log = logging.getLogger("fieldshift.power")

SOURCE_ID = "nasa_power"
BASE_URL = "https://power.larc.nasa.gov/api/temporal/climatology/point"
PARAMETERS = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

POWER_SPATIAL_SUPPORT = "regional_grid_merra2 (~0.5deg, centroid approximation)"
POWER_DOCS_URL = "https://power.larc.nasa.gov/docs/services/api/application/insights/"


def _cache_key(lat: float, lon: float) -> str:
    return f"{SOURCE_ID}:climatology:{lat:.4f}:{lon:.4f}:{','.join(PARAMETERS)}"


def _parse_response(payload: dict[str, Any]) -> list[dict[str, Any]]:
    params: dict[str, dict[str, Any]] = payload["properties"]["parameter"]
    header = payload.get("header", {})
    period_note = header.get("temporal_period") or "multi-decade climatology"
    fill = header.get("fill_value", -999.0)

    observations: list[dict[str, Any]] = []
    meta_base = {
        "climatology_period": period_note,
        "api_version": header.get("api", {}).get("version"),
        "docs_url": POWER_DOCS_URL,
        "interpretation": "long-term monthly normal, not a forecast",
    }
    for param in PARAMETERS:
        series = params.get(param)
        if series is None:
            continue
        monthly = {}
        for month in MONTHS:
            raw = series.get(month)
            if raw is None or raw == fill:
                monthly[month] = None
            else:
                monthly[month] = float(raw)
        annual = series.get("ANN")
        annual_val = None if (annual is None or annual == fill) else float(annual)
        unit = {
            "T2M": "°C", "T2M_MAX": "°C", "T2M_MIN": "°C",
            "RH2M": "%",
            "PRECTOTCORR": "mm/day",
        }.get(param, None)
        indicator = {
            "T2M": "monthly_mean_air_temperature",
            "T2M_MAX": "monthly_mean_daily_max_temperature",
            "T2M_MIN": "monthly_mean_daily_min_temperature",
            "RH2M": "monthly_mean_relative_humidity",
            "PRECTOTCORR": "monthly_mean_precipitation",
        }.get(param, param)
        observations.append(
            obs(
                indicator,
                annual_val,
                unit,
                source_id=SOURCE_ID,
                quality_status="pending",  # replaced by caller with live/cached
                source_layer=f"POWER climatology {param}",
                period_start=period_note.split(" ")[0] if period_note and period_note.split(" ")[0].isdigit() else None,
                period_end=None,
                spatial_support=POWER_SPATIAL_SUPPORT,
                meta={**meta_base, "monthly": monthly},
            )
        )
    return observations


def fetch_climate(session: Session, lat: float, lon: float) -> ProviderResult:
    """Fetch monthly climatology for a centroid. Live first; honest cache fallback."""
    settings = get_settings()
    key = _cache_key(lat, lon)

    if not settings.power_enabled:
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              detail="NASA POWER disabled by configuration")

    cached = cache_get(session, key, settings.provider_cache_ttl_seconds)
    if cached is not None:
        obs_list = _parse_response(json.loads(cached.payload_json))
        for o in obs_list:
            o["quality_status"] = STATUS_CACHED
        return ProviderResult(
            source_id=SOURCE_ID, status=STATUS_CACHED, observations=obs_list,
            fetched_at=cached.fetched_at, data_period=cached.data_period,
            source_layer="POWER climatology (cached)",
            detail=f"cached response fetched {cached.fetched_at}",
        )

    params = {
        "parameters": ",".join(PARAMETERS),
        "community": settings.power_community,
        "latitude": lat,
        "longitude": lon,
        "format": "JSON",
    }
    last_error: str | None = None
    for attempt in range(1, settings.power_max_retries + 1):
        try:
            resp = httpx.get(BASE_URL, params=params, timeout=settings.power_timeout_seconds)
            resp.raise_for_status()
            payload = resp.json()
            obs_list = _parse_response(payload)
            if not obs_list:
                last_error = "response contained no requested parameters"
                continue
            period_note = payload.get("header", {}).get("temporal_period")
            cache_put(session, key, SOURCE_ID, payload, period_note)
            for o in obs_list:
                o["quality_status"] = STATUS_LIVE
            return ProviderResult(
                source_id=SOURCE_ID, status=STATUS_LIVE, observations=obs_list,
                data_period=period_note, source_layer="POWER climatology (live)",
            )
        except (httpx.HTTPError, ValueError, KeyError) as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            log.warning("POWER attempt %s failed: %s", attempt, last_error)

    # Live failed; stale cache usable but must stay labelled.
    stale = cache_get_stale(session, key)
    if stale is not None:
        obs_list = _parse_response(json.loads(stale.payload_json))
        for o in obs_list:
            o["quality_status"] = STATUS_CACHED
        return ProviderResult(
            source_id=SOURCE_ID, status=STATUS_CACHED, observations=obs_list,
            fetched_at=stale.fetched_at, data_period=stale.data_period,
            detail=f"live fetch failed; serving stale cache from {stale.fetched_at} ({last_error})",
        )

    return ProviderResult(
        source_id=SOURCE_ID, status=STATUS_FAILED,
        detail=f"NASA POWER unavailable and no cached response ({last_error})",
        fetched_at=utcnow_iso(),
    )
