"""FAO GAEZ v5 yield-reference interface.

GAEZ serves precomputed model layers; there is
no open POST endpoint that runs the model for arbitrary inputs, and layer
download/licensing for a demo AOI was not verified by the spec pack. Therefore
in live mode this provider returns explicit `unavailable` and the scoring
engine redistributes the yield weight — it never invents attainable yields.

A prepared, attributed fixture (data/fixtures/gaez_sample.json, flagged
_demo_fixture=true) may be provided for offline demos and is surfaced as
`demo_fixture`, never as a live measurement.
"""
import json
import logging
from pathlib import Path

from app.config import get_settings
from app.data_providers.interfaces import STATUS_DEMO_FIXTURE, STATUS_UNAVAILABLE, ProviderResult, obs

log = logging.getLogger("fieldshift.gaez")

SOURCE_ID = "gaez_v5"
DOCS_URL = "https://www.fao.org/gaez/en"


def fetch_yield_reference(_lat: float, _lon: float, crop_id: str) -> ProviderResult:
    settings = get_settings()
    if not settings.gaez_enabled:
        return ProviderResult(
            source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
            detail="GAEZ layer access not prepared/verified for this build; "
                   "yield reference indicator is reported as unavailable instead of estimated",
        )
    fixture = settings.fixtures_dir / f"gaez_{crop_id}.json"
    if fixture.exists():
        try:
            data = json.loads(fixture.read_text(encoding="utf-8"))
            if data.get("_demo_fixture") is not True:
                return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                                      detail="GAEZ fixture missing demo label; refusing")
            return ProviderResult(
                source_id=SOURCE_ID, status=STATUS_DEMO_FIXTURE,
                observations=[obs(
                    "yield_reference_attainable",
                    data.get("attainable_yield_t_ha"),
                    "t/ha",
                    source_id=SOURCE_ID,
                    quality_status="pending",
                    source_layer=data.get("layer_id", "unspecified GAEZ layer"),
                    period_start=data.get("period"),
                    spatial_support=data.get("spatial_resolution", "precomputed model grid"),
                    meta={"lut": data.get("lut"), "management": data.get("management"),
                          "note": "modeled attainable yield reference, not a harvest prediction",
                          "docs_url": DOCS_URL},
                )],
                detail="DEMO FIXTURE — labelled sample layer value",
            )
        except (ValueError, KeyError) as exc:
            log.warning("GAEZ fixture unreadable for %s: %s", crop_id, exc)
    return ProviderResult(source_id=SOURCE_ID, status=STATUS_UNAVAILABLE,
                          detail=f"GAEZ layer for crop '{crop_id}' not available in this deployment")
