"""Rotation plan service: candidate serialization, evaluation and adoption."""
from __future__ import annotations

import json

from sqlalchemy.orm import Session

from app.core.errors import ApiError, NotFoundError, ValidationFailed
from app.db.models import AnalysisJob, Field, Observation, RotationPlan, RotationVersion, new_id, utcnow_iso
from app.domain.crop_rotation.history import assess_history
from app.domain.crop_rotation.modification import (
    apply_edits,
    compare_scores,
    evaluate_sequence,
    substitute_candidates,
)
from app.domain.crop_rotation.validator import SlotPlan
from app.domain.scoring.engine import INDICATOR_META, score_rotation
from app.services.analysis import build_field_context, history_from_entries
from app.domain.crop_suitability.eligibility import screen_all


def indicators_out(score: dict) -> list[dict]:
    """Presentation-ready indicator rows from a raw score dict."""
    values = score.get("indicators", {})
    status = score.get("indicator_status", {})
    rule_ids = score.get("rule_ids", [])
    out = []
    for meta in INDICATOR_META:
        key = meta["key"]
        value = values.get(key)
        st = status.get(key, "unavailable" if value is None else "available")
        out.append({
            "key": key, "label_en": meta["label_en"], "label_ar": meta["label_ar"],
            "value": round(value, 4) if value is not None else None,
            "status": st,
            "unit_note": "normalized reference 0..1, not a physical quantity",
            "contribution_note": None,
            "rule_ids": [r for r in rule_ids if r.startswith("R-")],
        })
    return out


def score_out(score: dict) -> dict:
    statuses = score.get("indicator_status", {})
    evaluated = [k for k, v in score.get("indicators", {}).items() if v is not None]
    partial = [k for k in evaluated if statuses.get(k) == "partial"]
    coverage = score.get("yield_reference_coverage", {})
    return {
        "total": score.get("total"),
        "weights_applied": score.get("weights_applied", {}),
        "weight_redistribution_note": score.get("redistribution_note"),
        "indicators": indicators_out(score),
        "evaluated_dimensions": evaluated,
        "partial_dimensions": partial,
        "yield_reference_coverage": coverage,
        "comparison_basis": ";".join(k + ":" + statuses.get(k, "available") for k in sorted(evaluated)) + ";yield=" + str(coverage) + ";weights=" + str(sorted(score.get("weights_applied", {}).items())),
        "data_quality_note": "Reference score, not a probability. Compare only with the same priorities, evaluated dimensions and similar data coverage. Partial yield references omit missing crops and may favor incomplete plans.",
    }


def _candidate_ref(job_id: str, rank: int) -> str:
    # "--" keeps the reference URL-safe; a colon breaks path handling.
    return f"{job_id}--{rank}"


def parse_candidate_ref(ref: str) -> tuple[str, int]:
    try:
        job_id, rank_s = ref.rsplit("--", 1)
        return job_id, int(rank_s)
    except ValueError as exc:
        raise ValidationFailed("rotation id must look like '<job_id>--<rank>'", code="rotation_id_invalid") from exc


def get_analysis_for_field(db: Session, field: Field, job_id: str) -> AnalysisJob:
    job = db.get(AnalysisJob, job_id)
    if job is None or job.field_id != field.field_id:
        raise NotFoundError("Analysis not found for this field.")
    return job


def load_result(job: AnalysisJob) -> dict:
    if not job.result_json:
        raise ApiError(
            "This analysis has no rotation results (status: "
            f"{job.status}). Check the analysis status or run a new analysis.",
            code="analysis_without_results", status_code=409,
        )
    return json.loads(job.result_json)


def candidate_from_result(job: AnalysisJob, rank: int) -> dict:
    result = load_result(job)
    for cand in result.get("candidates", []):
        if cand["rank"] == rank:
            return cand
    raise NotFoundError(f"No candidate with rank {rank} in analysis {job.id}.")


def slots_from_candidate(cand: dict) -> list[SlotPlan]:
    return [
        SlotPlan(s["slot_id"], s["year_number"], s.get("crop_id"))
        for s in cand["slots"]
    ]


def rebuild_context(db: Session, field: Field, job: AnalysisJob) -> tuple:
    """Rebuild FieldContext + yield refs from the persisted analysis observations."""
    profile_row = field.profile
    profile: dict = {}
    if profile_row is not None:
        profile = {
            "irrigation_type": profile_row.irrigation_type,
            "irrigation_method": profile_row.irrigation_method,
            "water_availability": profile_row.water_availability,
            "purposes": json.loads(profile_row.purposes_json or "[]"),
            "priorities": json.loads(profile_row.priorities_json or "{}"),
            "constraints": json.loads(profile_row.constraints_json or "null"),
        }
    obs_rows = [
        {
            "indicator": o.indicator,
            "value_num": o.value_num,
            "meta_json": o.meta_json,
            "quality_status": o.quality_status,
        }
        for o in db.query(Observation).filter(Observation.analysis_id == job.id).all()
    ]
    ctx, monthly_precip = build_field_context(field, profile, obs_rows)
    priorities = profile.get("priorities") or {"water": 25, "soil": 25, "yield": 25, "risk": 25}
    hist = history_from_entries(field.crop_history)

    # Eligibility re-screen with the SAME persisted observations (no refetch):
    # gates hand-picked substitute crops by field-level constraints.
    eligible = screen_all(ctx)
    eligible_by_crop = {r.crop.crop_id: r for r in eligible}

    # Yield references persisted with the analysis result.
    result = json.loads(job.result_json) if job.result_json else {}
    yield_refs = _yield_refs_from_result(result)
    return ctx, monthly_precip, priorities, hist, eligible_by_crop, yield_refs


def _yield_refs_from_result(result: dict) -> dict[str, float | None]:
    return result.get("yield_references") or {}


def evaluate_candidate(
    db: Session, field: Field, job: AnalysisJob, cand: dict, edits: list[dict]
) -> dict:
    ctx, monthly_precip, priorities, hist, eligible_by_crop, yield_refs = rebuild_context(db, field, job)
    base_slots = slots_from_candidate(cand)
    modified_slots = apply_edits(base_slots, edits)
    before_score = score_rotation(base_slots, ctx, priorities, hist, yield_refs, monthly_precip)
    result = evaluate_sequence(
        modified_slots, ctx, priorities, hist, yield_refs, monthly_precip, eligible_by_crop
    )
    comparison = compare_scores(before_score, result.score)

    def slot_out(s: SlotPlan) -> dict:
        from app.data_providers.crop_calendar import get_calendar_store
        crop = None
        if s.crop_id:
            from app.domain.crop_loader import get_crop
            crop = get_crop(s.crop_id)
        return {
            "slot_id": s.slot_id, "year_number": s.year_number, "crop_id": s.crop_id,
            "name_en": crop.name_en if crop else None,
            "name_ar": crop.name_ar if crop else None,
            "rotation_group": crop.rotation_group if crop else None,
            "fallow": s.is_fallow,
            "planting_window": get_calendar_store().windows_for(s.crop_id, None),
        }

    return {
        "feasibility": result.feasibility,
        "conflicts": [
            {
                "rule_id": v.rule_id, "severity": v.severity,
                "message_en": v.message_en, "message_ar": v.message_ar,
                "slot_ids": v.slot_ids,
            }
            for v in result.conflicts
        ],
        "modified_score": {
            "total": result.score.total,
            "indicators": result.score.indicators,
            "indicator_status": result.score.indicator_status,
            "weights_applied": result.score.weights_applied,
            "redistribution_note": result.score.redistribution_note,
            "yield_reference_coverage": result.score.yield_reference_coverage,
            "rule_ids": result.score.rule_ids,
        },
        "comparison": comparison,
        "sequence_after": [slot_out(s) for s in modified_slots],
        "sequence_before": [slot_out(s) for s in base_slots],
        "notes_en": result.notes_en,
        "notes_ar": result.notes_ar,
    }


def substitute_candidates_for_slot(
    db: Session, field: Field, job: AnalysisJob, cand: dict, slot_id: str
) -> dict:
    ctx, monthly_precip, priorities, hist, eligible_by_crop, yield_refs = rebuild_context(db, field, job)
    base_slots = slots_from_candidate(cand)
    if slot_id not in {s.slot_id for s in base_slots}:
        raise NotFoundError(f"Slot '{slot_id}' is not part of this rotation.")
    base_score = score_rotation(base_slots, ctx, priorities, hist, yield_refs, monthly_precip)
    from app.domain.crop_rotation.generator import RotationCandidate
    base = RotationCandidate(slots=base_slots, score=base_score, violations=[])

    eligible_list = [res for res in eligible_by_crop.values() if res.decision == "eligible"]
    candidates = substitute_candidates(
        base, slot_id, eligible_list, ctx, priorities, hist, yield_refs, monthly_precip
    )
    current = next((s.crop_id for s in base_slots if s.slot_id == slot_id), None)
    return {"slot_id": slot_id, "crop_id": current, "candidates": candidates}


def adopt_candidate(
    db: Session, field: Field, job: AnalysisJob, cand: dict, edits: list[dict] | None
) -> RotationVersion:
    """Transactionally persist the adopted version (original or modified)."""
    ctx, monthly_precip, priorities, hist, eligible_by_crop, yield_refs = rebuild_context(db, field, job)
    base_slots = slots_from_candidate(cand)
    adopted_slots = base_slots
    if edits:
        adopted_slots = apply_edits(base_slots, edits)
        result = evaluate_sequence(adopted_slots, ctx, priorities, hist, yield_refs, monthly_precip, eligible_by_crop)
        if result.feasibility == "infeasible":
            raise ApiError(
                "The modified sequence has hard constraint violations and cannot be adopted.",
                code="modified_infeasible", status_code=409,
                details={"conflicts": [v.rule_id for v in result.conflicts if v.severity == "hard"]},
            )

    plan = (
        db.query(RotationPlan)
        .filter(RotationPlan.field_id == field.field_id, RotationPlan.analysis_id == job.id)
        .one_or_none()
    )
    if plan is None:
        plan = RotationPlan(plan_id=new_id("plan"), field_id=field.field_id,
                            name=f"{field.name} rotation", analysis_id=job.id)
        db.add(plan)
        db.flush()

    score = score_rotation(adopted_slots, ctx, priorities, hist, yield_refs, monthly_precip)
    label = "Original plan" if not edits else f"Modified plan ({utcnow_iso()[:10]})"
    base_version = (
        db.query(RotationVersion)
        .filter(RotationVersion.plan_id == plan.plan_id, RotationVersion.status == "chosen")
        .order_by(RotationVersion.created_at.desc())
        .first()
    )
    version = RotationVersion(
        version_id=new_id("ver"),
        plan_id=plan.plan_id,
        base_version_id=base_version.version_id if base_version else None,
        status="chosen",
        label=label,
        sequence_json=json.dumps([{"slot_id": s.slot_id, "year_number": s.year_number, "crop_id": s.crop_id}
                                  for s in adopted_slots]),
        score_json=json.dumps({
            "total": score.total,
            "indicators": score.indicators,
            "indicator_status": score.indicator_status,
            "weights_applied": score.weights_applied,
            "yield_reference_coverage": score.yield_reference_coverage,
            "rule_ids": score.rule_ids,
        }),
        evidence_json=json.dumps({
            "analysis_id": job.id,
            "candidate_rank": cand["rank"],
            "adopted_from_edits": edits or None,
        }),
    )
    # Previous chosen versions become archived history (never deleted).
    for v in plan.versions:
        if v.status == "chosen":
            v.status = "archived"
    db.add(version)
    plan.chosen_version_id = version.version_id
    plan.updated_at = utcnow_iso()
    db.commit()
    return version


def active_plan_for_field(db: Session, field: Field) -> dict | None:
    plan = (
        db.query(RotationPlan)
        .filter(RotationPlan.field_id == field.field_id, RotationPlan.chosen_version_id.is_not(None))
        .order_by(RotationPlan.updated_at.desc())
        .first()
    )
    if plan is None or plan.chosen_version_id is None:
        return None
    version = db.get(RotationVersion, plan.chosen_version_id)
    if version is None:
        return None
    sequence = json.loads(version.sequence_json)
    score = json.loads(version.score_json)
    slots_out = []
    for s in sequence:
        crop = None
        if s.get("crop_id"):
            from app.domain.crop_loader import get_crop
            crop = get_crop(s["crop_id"])
        slots_out.append({
            "slot_id": s["slot_id"], "year_number": s["year_number"], "crop_id": s.get("crop_id"),
            "name_en": crop.name_en if crop else None,
            "name_ar": crop.name_ar if crop else None,
            "rotation_group": crop.rotation_group if crop else None,
            "fallow": not s.get("crop_id"),
            "planting_window": None,
        })
    return {
        "plan_id": plan.plan_id,
        "version_id": version.version_id,
        "field_id": field.field_id,
        "label": version.label or plan.name,
        "status": version.status,
        "horizon_years": len(sequence),
        "slots": slots_out,
        "score": score_out(score),
        "adopted_at": version.created_at,
    }


def versions_for_field(db: Session, field: Field) -> list[dict]:
    out: list[dict] = []
    for plan in field.plans:
        for v in plan.versions:
            score = json.loads(v.score_json)
            out.append({
                "plan_id": plan.plan_id,
                "version_id": v.version_id,
                "status": v.status,
                "label": v.label,
                "base_version_id": v.base_version_id,
                "total": score.get("total"),
                "created_at": v.created_at,
                "is_active": plan.chosen_version_id == v.version_id,
            })
    return sorted(out, key=lambda v: v["created_at"], reverse=True)
