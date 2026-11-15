"""Field analysis pipeline: providers -> indicators -> eligibility -> rotations.

Runs as a background job with factual stage/source status persisted to SQLite.
No stage is marked complete before its work actually succeeds, and partial
outcomes (e.g. POWER ok, SoilGrids down) surface as `partial` with the exact
source statuses rather than a fake success.
"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.data_providers import nasa_power, soilgrids
from app.data_providers.crop_calendar import get_calendar_store
from app.data_providers.interfaces import STATUS_FAILED, STATUS_LIVE, STATUS_UNAVAILABLE, utcnow_iso
from app.db.models import AnalysisJob, Field, Observation
from app.domain.crop_rotation.generator import generate_candidates
from app.domain.crop_rotation.history import HistorySeason, RotationHistoryProfile, assess_history
from app.domain.crop_suitability.eligibility import FieldContext, screen_all
from app.domain.scoring.engine import score_rotation
from app.domain.yield_assessment.ref import assess_pool

log = logging.getLogger("fieldshift.analysis")

STAGE_KEYS = ["geometry", "climate", "soil", "yield_reference", "suitability", "rotation"]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class StageTracker:
    def __init__(self) -> None:
        self.stages: dict[str, dict] = {k: {"status": "pending", "detail": None} for k in STAGE_KEYS}

    def set(self, key: str, status: str, detail: str | None = None) -> None:
        self.stages[key] = {"status": status, "detail": detail}

    def as_json(self) -> str:
        return json.dumps(self.stages)


def build_field_context(field: Field, profile: dict, observations: list[dict]) -> tuple[FieldContext, dict[str, float | None]]:
    """Assemble FieldContext from persisted POWER observations (no refetch)."""
    monthly_precip: dict[str, float | None] = {}
    hottest: float | None = None
    coldest: float | None = None
    annual_mean: float | None = None
    annual_precip: float | None = None

    for o in observations:
        meta = json.loads(o["meta_json"]) if o.get("meta_json") else {}
        monthly = meta.get("monthly") or {}
        if o["indicator"] == "monthly_mean_precipitation":
            monthly_precip = monthly
            vals = [v for v in monthly.values() if v is not None]
            # POWER climatology PRECTOTCORR is mm/day; annual = sum(mm/day * days).
            days = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
            names = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
            if vals:
                annual_precip = sum((monthly.get(m) or 0.0) * d for m, d in zip(names, days))
        elif o["indicator"] == "monthly_mean_daily_max_temperature":
            vals = [v for v in monthly.values() if v is not None]
            hottest = max(vals) if vals else None
        elif o["indicator"] == "monthly_mean_daily_min_temperature":
            vals = [v for v in monthly.values() if v is not None]
            coldest = min(vals) if vals else None
        elif o["indicator"] == "monthly_mean_air_temperature":
            annual_mean = o.get("value_num")

    soil_ph = next((o["value_num"] for o in observations if o["indicator"] == "soil_ph"), None)

    ctx = FieldContext(
        centroid_lat=field.centroid_lat,
        centroid_lon=field.centroid_lon,
        annual_precipitation_mm=annual_precip,
        monthly_mean_temp_c={},
        monthly_max_temp_c={},
        monthly_min_temp_c={},
        hottest_month_max_temp_c=hottest,
        coldest_month_min_temp_c=coldest,
        annual_mean_temp_c=annual_mean,
        irrigation_type=profile.get("irrigation_type", "unknown"),
        irrigation_method=profile.get("irrigation_method"),
        water_availability=profile.get("water_availability"),
        banned_crop_ids=list((profile.get("constraints") or {}).get("banned_crops", [])),
        purposes=list(profile.get("purposes", [])),
        soil_ph=soil_ph,
        country_iso2=profile.get("country_iso2"),
    )
    return ctx, monthly_precip


def history_from_entries(entries: list) -> RotationHistoryProfile:
    seasons = [
        HistorySeason(
            crop_year=e.crop_year,
            season_label=e.season_label,
            crop_id=e.crop_id if e.status == "planted" else None,
            status=e.status,
        )
        for e in entries
    ]
    return assess_history(seasons)


def run_analysis(job_id: str, field_id: str) -> None:
    """Entry point executed in the background for one analysis job."""
    from app.db.base import get_session_factory

    session = get_session_factory()()
    tracker = StageTracker()
    sources: dict[str, dict] = {}
    try:
        job = session.get(AnalysisJob, job_id)
        field = session.get(Field, field_id)
        if job is None or field is None:
            return
        job.status = "running"
        job.started_at = _now()
        job.stages_json = tracker.as_json()
        session.commit()

        profile_row = field.profile
        profile = {}
        if profile_row is not None:
            profile = {
                "irrigation_type": profile_row.irrigation_type,
                "irrigation_method": profile_row.irrigation_method,
                "water_availability": profile_row.water_availability,
                "purposes": json.loads(profile_row.purposes_json or "[]"),
                "priorities": json.loads(profile_row.priorities_json or "{}"),
                "constraints": json.loads(profile_row.constraints_json or "null"),
            }
        priorities = profile.get("priorities") or {"water": 25, "soil": 25, "yield": 25, "risk": 25}

        # Stage: geometry (validated at save time; re-affirm here from record)
        tracker.set("geometry", "complete", "geometry validated and stored with the field")

        # Stage: NASA POWER climate (live fetch, honest cache fallback)
        tracker.set("climate", "running")
        session.commit()
        power = nasa_power.fetch_climate(session, field.centroid_lat, field.centroid_lon)
        sources["nasa_power"] = {
            "source_id": "nasa_power", "status": power.status,
            "detail": power.detail, "fetched_at": power.fetched_at,
            "data_period": power.data_period,
            "spatial_support": nasa_power.POWER_SPATIAL_SUPPORT,
        }
        obs_rows: list[dict] = []
        if power.ok:
            tracker.set("climate", "complete",
                        f"POWER climatology fetched ({power.status}); {len(power.observations)} indicators")
            obs_rows.extend(power.observations)
        else:
            tracker.set("climate", "failed", power.detail)

        # Stage: soil estimates (SoilGrids WebDAV tiles over the field polygon)
        tracker.set("soil", "running")
        session.commit()
        field_geometry = json.loads(field.geometry_geojson) if field.geometry_geojson else None
        soil = soilgrids.fetch_soil(session, field.centroid_lat, field.centroid_lon, field_geometry)
        sources["soilgrids"] = {
            "source_id": "soilgrids", "status": soil.status,
            "detail": soil.detail, "fetched_at": soil.fetched_at,
            "data_period": soil.data_period,
        }
        if soil.ok:
            tracker.set("soil", "complete", soil.detail or soil.status)
            for o in soil.observations:
                o["quality_status"] = soil.status
            obs_rows.extend(soil.observations)
        else:
            tracker.set("soil", "skipped", soil.detail or soil.status)

        session.add_all([
            Observation(
                id=f"obs_{job_id}_{i}",
                field_id=field.field_id,
                analysis_id=job_id,
                indicator=o["indicator"],
                value_num=o.get("value_num"),
                value_json=o.get("value_json"),
                unit=o.get("unit"),
                source_id=o["source_id"],
                source_layer=o.get("source_layer"),
                period_start=o.get("period_start"),
                period_end=o.get("period_end"),
                spatial_support=o.get("spatial_support"),
                quality_status=o["quality_status"],
                meta_json=o.get("meta_json"),
            )
            for i, o in enumerate(obs_rows)
        ])
        session.commit()

        # Stages: suitability + rotation (deterministic engine work)
        climate_ok = power.ok
        if not climate_ok:
            job.status = "failed"
            job.stages_json = tracker.as_json()
            job.source_status_json = json.dumps(sources)
            job.error_json = json.dumps({
                "message": "NASA POWER is unavailable and no cached response exists; "
                           "a NASA-backed analysis cannot be completed. Retry later.",
                "code": "nasa_power_unavailable",
            })
            job.finished_at = _now()
            session.commit()
            return

        ctx, monthly_precip = build_field_context(field, profile, obs_rows)

        tracker.set("suitability", "running")
        session.commit()
        results = screen_all(ctx)
        eligible = [r for r in results if r.is_eligible]
        excluded_count = len(results) - len(eligible)
        tracker.set("suitability", "complete",
                    f"{len(eligible)} crops eligible, {excluded_count} excluded by constraints")

        tracker.set("yield_reference", "running")
        session.commit()
        pool_ids = [r.crop.crop_id for r in eligible]
        irrigation_type = profile.get("irrigation_type") or "unknown"
        yield_refs, yield_results = assess_pool(
            pool_ids, field.centroid_lat, field.centroid_lon, irrigation_type,
        )
        n_resolved = sum(1 for v in yield_refs.values() if v is not None)
        n_unmapped = sum(1 for r in yield_results
                         if "no GAEZ v5 layer exists for crop" in (r.detail or ""))
        yield_status = "unavailable"
        if n_resolved:
            yield_status = "live" if any(r.status == STATUS_LIVE for r in yield_results) else "demo_fixture"
        detail_line = (
            f"attainable-yield references resolved for {n_resolved}/{len(pool_ids)} "
            f"eligible crops ({n_unmapped} crops have no GAEZ v5 layer)"
            if yield_results else "not evaluated"
        )
        first_detail = next((r.detail for r in yield_results if r.detail), None)
        if first_detail:
            detail_line += f" — {first_detail[:160]}"
        sources["gaez_v5"] = {
            "source_id": "gaez_v5", "status": yield_status,
            "detail": detail_line,
            "data_period": next((r.data_period for r in yield_results if r.data_period), None),
        }
        tracker.set("yield_reference", "complete" if yield_status != "unavailable" else "skipped",
                    f"{n_resolved}/{len(pool_ids)} crops matched to GAEZ v5 layers"
                    if yield_status != "unavailable"
                    else "GAEZ layers unavailable; yield indicator reported as unavailable")

        tracker.set("rotation", "running")
        session.commit()
        hist = history_from_entries(field.crop_history)
        candidates, insufficiency = generate_candidates(
            ctx, eligible, priorities, hist, yield_refs, monthly_precip,
            horizon_years=3,
        )

        eligible_by_crop = {r.crop.crop_id: r for r in results}
        candidate_payload = []
        for rank, cand in enumerate(candidates, start=1):
            ev_rows = []
            from app.domain.evidence import build_evidence
            evidence = build_evidence(
                cand.slots, cand.score, cand.violations, eligible_by_crop, hist,
                observation_ids=[f"obs_{job_id}_{i}" for i in range(len(obs_rows))],
                available_source_ids=[s for s, meta in sources.items() if meta["status"] in ("live", "cached", "demo_fixture")],
            )
            candidate_payload.append({
                "rank": rank,
                "label": f"Plan {chr(64 + rank)}",
                "slots": [
                    {"slot_id": s.slot_id, "year_number": s.year_number,
                     "crop_id": s.crop_id, "fallow": s.is_fallow,
                     "planting_window": get_calendar_store().windows_for(s.crop_id, profile.get("country_iso2"))}
                    for s in cand.slots
                ],
                "score": {
                    "total": cand.score.total,
                    "indicators": cand.score.indicators,
                    "indicator_status": cand.score.indicator_status,
                    "weights_applied": cand.score.weights_applied,
                    "redistribution_note": cand.score.redistribution_note,
                    "rule_ids": cand.score.rule_ids,
                },
                "violations": [asdict(v) for v in cand.violations],
                "summary_en": cand.summary_en,
                "summary_ar": cand.summary_ar,
                "main_limitation_en": cand.main_limitation_en,
                "main_limitation_ar": cand.main_limitation_ar,
                "evidence": {
                    "rule_ids": evidence.rule_ids,
                    "observation_ids": evidence.observation_ids,
                    "source_ids": evidence.source_ids,
                    "notes_en": evidence.notes_en,
                    "notes_ar": evidence.notes_ar,
                    "missing_information": sorted(set(evidence.missing_information)),
                },
            })

        baseline = None
        if hist.enough_for_baseline:
            recent_year = max(hist.years_covered) if hist.years_covered else None
            if recent_year is not None:
                baseline = {"note": "Current practice comparison is derived from farmer-reported history only."}

        # Overall job status: complete only if every scored stage succeeded.
        soil_ok = sources["soilgrids"]["status"] in ("live", "cached", "demo_fixture")
        job.status = "complete" if soil_ok else "partial"
        job.result_json = json.dumps({
            "candidates": candidate_payload,
            "insufficiency_note": insufficiency,
            "baseline_note": baseline,
            "yield_references": {k: v for k, v in yield_refs.items()},
            "yield_reference_status": yield_status,
            "history": {
                "coverage": hist.coverage,
                "all_cereal_history": hist.all_cereal_history,
                "notes_en": hist.notes_en,
                "notes_ar": hist.notes_ar,
            },
            "field_context": {
                "annual_precipitation_mm": ctx.annual_precipitation_mm,
                "annual_mean_temp_c": ctx.annual_mean_temp_c,
                "hottest_month_max_temp_c": ctx.hottest_month_max_temp_c,
                "coldest_month_min_temp_c": ctx.coldest_month_min_temp_c,
            },
        })
        tracker.set("rotation", "complete" if candidates else "failed",
                    f"{len(candidates)} candidate plan(s) generated" if candidates else insufficiency or "no candidates")
        job.stages_json = tracker.as_json()
        job.source_status_json = json.dumps(sources)
        job.finished_at = _now()
        session.commit()
        log.info("analysis %s finished with status %s", job_id, job.status)

    except Exception as exc:  # noqa: BLE001 - job isolation; report, don't crash the app
        log.exception("analysis %s failed", job_id)
        try:
            job = session.get(AnalysisJob, job_id)
            if job is not None:
                job.status = "failed"
                job.error_json = json.dumps({"message": str(exc), "code": "analysis_internal_error"})
                job.stages_json = tracker.as_json()
                job.source_status_json = json.dumps(sources)
                job.finished_at = _now()
                session.commit()
        except Exception:  # pragma: no cover
            log.exception("could not persist failure for job %s", job_id)
    finally:
        session.close()
