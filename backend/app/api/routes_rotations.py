"""Rotation exploration, customization, evaluation, comparison and adoption.

Candidate references use "<analysis_job_id>:<rank>" so the original analysis
snapshot stays immutable while evaluation/adopt endpoints re-run engines live.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_client
from app.db.base import get_db
from app.db.models import AnalysisJob, AnonymousClient
from app.domain.scoring.engine import INDICATOR_META
from app.schemas.api import (
    AdoptIn,
    AdoptedPlanOut,
    EvaluateIn,
    EvidenceRefOut,
    IndicatorOut,
    RotationListOut,
    RotationOut,
    ScoreBreakdownOut,
    SlotOut,
    SubstitutesOut,
)
from app.services.field_store import get_owned_field
from app.services.plan_service import (
    active_plan_for_field,
    adopt_candidate,
    candidate_from_result,
    evaluate_candidate,
    get_analysis_for_field,
    load_result,
    parse_candidate_ref,
    substitute_candidates_for_slot,
    versions_for_field,
)

router = APIRouter(prefix="/api/v1", tags=["rotations"])


def _latest_completed_job(db: Session, field_id: str) -> AnalysisJob:
    job = (
        db.query(AnalysisJob)
        .filter(AnalysisJob.field_id == field_id, AnalysisJob.status.in_(["complete", "partial"]))
        .order_by(AnalysisJob.created_at.desc())
        .first()
    )
    if job is None:
        from app.core.errors import NotFoundError
        raise NotFoundError("No completed analysis for this field yet.")
    return job


def _candidate_payloads(job: AnalysisJob) -> list[dict]:
    result = load_result(job)
    cands = result.get("candidates", [])
    for cand in cands:
        cand["analysis_id"] = job.id
    return cands


def _indicators_out(score: dict) -> list[IndicatorOut]:
    values = score.get("indicators", {})
    status = score.get("indicator_status", {})
    out: list[IndicatorOut] = []
    for meta in INDICATOR_META:
        key = meta["key"]
        value = values.get(key)
        st = status.get(key, "unavailable" if value is None else "available")
        notes = []
        if st == "unavailable":
            notes.append("not available for this field; its weight was redistributed")
        out.append(IndicatorOut(
            key=key, label_en=meta["label_en"], label_ar=meta["label_ar"],
            value=round(value, 4) if value is not None else None,
            status=st,
            unit_note="normalized reference 0..1, not a physical quantity",
            contribution_note=None,
            rule_ids=[r for r in score.get("rule_ids", []) if r.startswith("R-")],
        ))
    return out


def _score_out(score: dict) -> ScoreBreakdownOut:
    return ScoreBreakdownOut(
        total=score.get("total"),
        weights_applied=score.get("weights_applied", {}),
        weight_redistribution_note=score.get("redistribution_note"),
        indicators=_indicators_out(score),
    )


def _slots_out(slots: list[dict]) -> list[SlotOut]:
    return [SlotOut(**{
        "slot_id": s["slot_id"],
        "year_number": s["year_number"],
        "crop_id": s.get("crop_id"),
        "name_en": s.get("name_en"),
        "name_ar": s.get("name_ar"),
        "rotation_group": s.get("rotation_group"),
        "fallow": s.get("fallow", s.get("crop_id") is None),
        "planting_window": s.get("planting_window"),
    }) for s in slots]


def _rotation_out(cand: dict) -> RotationOut:
    evidence = cand.get("evidence", {})
    return RotationOut(
        plan_id=f"{cand['analysis_id']}:{cand['rank']}",
        rank=cand["rank"],
        label=cand["label"],
        status="candidate",
        is_recommended=cand["rank"] == 1,
        horizon_years=len(cand["slots"]),
        slots=_slots_out(cand["slots"]),
        score=_score_out(cand["score"]),
        summary_en=cand["summary_en"],
        summary_ar=cand["summary_ar"],
        main_limitation_en=cand.get("main_limitation_en"),
        main_limitation_ar=cand.get("main_limitation_ar"),
        evidence=EvidenceRefOut(
            rule_ids=evidence.get("rule_ids", []),
            observation_ids=evidence.get("observation_ids", []),
            source_ids=evidence.get("source_ids", []),
            notes=evidence.get("notes_en", []) + evidence.get("notes_ar", []),
            missing_information=evidence.get("missing_information", []),
        ),
    )


@router.get("/fields/{field_id}/rotations", response_model=RotationListOut)
def list_rotations(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    job = _latest_completed_job(db, field.field_id)
    cands = _candidate_payloads(job)
    result = load_result(job)
    return RotationListOut(
        field_id=field.field_id,
        analysis_id=job.id,
        rotations=[_rotation_out(c) for c in cands],
        insufficient_data_note=result.get("insufficiency_note"),
        current_practice_note=(result.get("baseline_note") or {}).get("note") if result.get("baseline_note") else None,
    )


@router.get("/rotations/{ref}", response_model=RotationOut)
def rotation_details(ref: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    job_id, rank = parse_candidate_ref(ref)
    job = db.get(AnalysisJob, job_id)
    if job is None:
        from app.core.errors import NotFoundError
        raise NotFoundError("Analysis not found.")
    field = get_owned_field(db, client, job.field_id)
    cand = candidate_from_result(job, rank)
    cand["analysis_id"] = job.id
    return _rotation_out(cand)


@router.get("/rotations/{ref}/slots/{slot_id}/substitutes", response_model=SubstitutesOut)
def slot_substitutes(ref: str, slot_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    job_id, rank = parse_candidate_ref(ref)
    job = db.get(AnalysisJob, job_id)
    if job is None:
        from app.core.errors import NotFoundError
        raise NotFoundError("Analysis not found.")
    field = get_owned_field(db, client, job.field_id)
    cand = candidate_from_result(job, rank)
    return substitute_candidates_for_slot(db, field, job, cand, slot_id)


@router.post("/rotations/{ref}/evaluate")
def evaluate_edits(ref: str, payload: EvaluateIn, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    job_id, rank = parse_candidate_ref(ref)
    job = db.get(AnalysisJob, job_id)
    if job is None:
        from app.core.errors import NotFoundError
        raise NotFoundError("Analysis not found.")
    field = get_owned_field(db, client, job.field_id)
    cand = candidate_from_result(job, rank)
    edits = [e.model_dump() for e in payload.edits]
    return evaluate_candidate(db, field, job, cand, edits)


@router.post("/rotations/{ref}/adopt", response_model=AdoptedPlanOut)
def adopt(ref: str, payload: AdoptIn, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    job_id, rank = parse_candidate_ref(ref)
    job = db.get(AnalysisJob, job_id)
    if job is None:
        from app.core.errors import NotFoundError
        raise NotFoundError("Analysis not found.")
    field = get_owned_field(db, client, job.field_id)
    cand = candidate_from_result(job, rank)
    edits = [e.model_dump() for e in payload.edits] if payload.edits else None
    version = adopt_candidate(db, field, job, cand, edits)
    active = active_plan_for_field(db, field)
    return AdoptedPlanOut(**active)


@router.get("/fields/{field_id}/active-plan", response_model=AdoptedPlanOut | None)
def get_active_plan(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    return active_plan_for_field(db, field)


@router.get("/fields/{field_id}/plan-versions")
def get_plan_versions(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    return {"field_id": field.field_id, "versions": versions_for_field(db, field)}
