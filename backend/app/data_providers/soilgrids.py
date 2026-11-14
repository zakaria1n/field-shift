"""ISRIC SoilGrids adapter.

SoilGrids' public REST endpoint has been
officially marked paused; connectivity may fail outright. This adapter:
1. attempts the live REST query with a short timeout when enabled,
2. on failure returns an explicit `unavailable` result — never fabricated soil
   values,
3. supports a prepared fixture file under data/fixtures/ (clearly labelled
   demo_fixture, must carry source metadata) for offline demos.
"""
import json
import logging
from pathlib import Path

import httpx
from sqlalchemy.orm import Session

from app.config import get_settings
from app.data_providers.interfaces import (
    STATUS_DEMO_FIXTURE,
    STATUS_LIVE,
    STATUS_UNAVAILABLE,
    ProviderResult,
    obs,
)

log = logging.getLogger("fieldshift.soilgrids")

SOURCE_ID = "soilgrids"
REST_URL = "https://api.map.isric.org/soilgrids/v2.0/properties/query"
PROPERTIES = [("phh2o", "soil_ph", 10, "pH"), ("soc", "soil_organic_carbon", 10, "g/kg"),
              ("sand", "soil_sand_fraction", 10, "g/kg"), ("clay", "soil_clay_fraction", 10, "g/kg"),
              ("nitrogen", "soil_total_nitrogen", 100, "g/kg")]
DEPTH = "5-15cm"
SPATIAL = "global_model_grid (~250m prediction, regional estimate for small fields)"
DOCS_URL = "https://docs.isric.org/globaldata/soilgrids/SoilGrids_faqs_02.html"


def _fixture_path() -> Path:
    settings = get_settings()
    return settings.fixtures_dir / "soilgrids_sample.json"


def fetch_soil(session: Session, lat: float, lon: float) -> ProviderResult:
    settings = get_settings()
    if not settings.soilgrids_enabled:
        return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                              detail="SoilGrids disabled by configuration")

    body = {
        "lon": lon,
        "lat": lat,
        "properties": [p[0] for p in PROPERTIES],
        "depths": [DEPTH],
        "values": ["mean"],
    }
    try:
        resp = httpx.post(REST_URL, json=body, timeout=15)
        resp.raise_for_status()
        payload = resp.json()
        observations = _parse(payload)
        if observations:
            return ProviderResult(source_id=SOURCE_ID, status=STATUS_LIVE,
                                  observations=observations,
                                  data_period="SoilGrids 2020 release",
                                  source_layer="SoilGrids v2.0 5-15cm mean",
                                  detail=f"live query ({lat:.3f},{lon:.3f}); {DOCS_URL}")
    except (httpx.HTTPError, ValueError, KeyError) as exc:
        log.info("SoilGrids live fetch failed (documented paused-beta risk): %s", exc)

    fixture = _fixture_path()
    if fixture.exists():
        try:
            data = json.loads(fixture.read_text(encoding="utf-8"))
            if data.get("_demo_fixture") is not True:
                return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                                      detail="fixture present but missing explicit demo label; refusing to use")
            return ProviderResult(
                source_id=SOURCE_ID, status=STATUS_DEMO_FIXTURE,
                observations=data["observations"],
                data_period=data.get("data_period"),
                source_layer="SoilGrids SAMPLE fixture (demo only)",
                detail="DEMO FIXTURE — clearly labelled sample, not a live soil measurement",
            )
        except (ValueError, KeyError) as exc:
            log.warning("SoilGrids fixture unreadable: %s", exc)

    return ProviderResult(
        source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
        detail="SoilGrids REST unreachable (service documented as paused) and no prepared fixture available",
    )


def _parse(payload: dict) -> list[dict]:
    layers = payload.get("Properties", {}).get("layers", [])
    out: list[dict] = []
    for (prop, indicator, scale, unit) in PROPERTIES:
        for layer in layers:
            if layer.get("name") != prop:
                continue
            for depth in layer.get("depths", []):
                if depth.get("depth") != DEPTH:
                    continue
                mean = depth.get("values", {}).get("mean")
                if mean is None:
                    continue
                out.append(obs(
                    indicator, float(mean) / scale, unit,
                    source_id=SOURCE_ID,
                    quality_status="pending",
                    source_layer=f"SoilGrids {prop} {DEPTH} mean (scale {scale})",
                    period_start="2020",
                    spatial_support=SPATIAL,
                    meta={"note": "modeled global prediction, not a laboratory test",
                          "docs_url": DOCS_URL},
                ))
    return out
