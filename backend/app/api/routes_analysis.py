"""Analysis execution, job status and field insights routes."""
import json
from datetime import datetime, timezone

from fastapi import APIRouter, BackgroundTasks, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_client
from app.core.errors import ApiError, NotFoundError
from app.db.base import get_db
from app.db.models import AnalysisJob, AnonymousClient, new_id, utcnow_iso
from app.schemas.api import AnalysisJobOut, InsightsOut, ObservationOut, SourceStatusOut, StageOut
from app.services.field_store import get_owned_field
from app.services.analysis import run_analysis

router = APIRouter(tags=["analysis"])


def _job_out(job: AnalysisJob) -> AnalysisJobOut:
    stages = json.loads(job.stages_json or "{}")
    sources = json.loads(job.source_status_json or "{}")
    return AnalysisJobOut(
        job_id=job.id,
        field_id=job.field_id,
        status=job.status,
        stages=[
            StageOut(key=key, status=v.get("status", "pending"), detail=v.get("detail"))
            for key, v in stages.items()
        ],
        sources=[
            SourceStatusOut(
                source_id=key,
                status=v.get("status", "pending"),
                detail=v.get("detail"),
                fetched_at=v.get("fetched_at"),
                data_period=v.get("data_period"),
            )
            for key, v in sources.items()
        ],
        error=json.loads(job.error_json) if job.error_json else None,
        started_at=job.started_at,
        finished_at=job.finished_at,
    )


@router.post("/api/v1/fields/{field_id}/analyses", response_model=AnalysisJobOut, status_code=202)
def start_analysis(field_id: str, background: BackgroundTasks, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    profile = field.profile
    if profile is None:
        raise ApiError(
            "Save the farm profile (questions + priorities) before starting an analysis.",
            code="profile_required", status_code=409,
        )
    job = AnalysisJob(id=new_id("job"), field_id=field.field_id, status="queued", created_at=utcnow_iso())
    db.add(job)
    db.commit()
    background.add_task(run_analysis, job.id, field.field_id)
    return _job_out(job)


@router.get("/api/v1/analyses/{job_id}", response_model=AnalysisJobOut)
def analysis_status(job_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    job = db.get(AnalysisJob, job_id)
    if job is None:
        raise NotFoundError("Analysis job not found.")
    field = get_owned_field(db, client, job.field_id)  # ownership gate
    return _job_out(job)


@router.get("/api/v1/fields/{field_id}/analyses/latest", response_model=AnalysisJobOut)
def latest_analysis(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    job = (
        db.query(AnalysisJob)
        .filter(AnalysisJob.field_id == field.field_id, AnalysisJob.status.in_(["complete", "partial"]))
        .order_by(AnalysisJob.created_at.desc())
        .first()
    )
    if job is None:
        raise NotFoundError("No completed analysis for this field yet.")
    return _job_out(job)


def _observation_out(o) -> ObservationOut:
    return ObservationOut(
        indicator=o.indicator,
        value=o.value_num,
        unit=o.unit,
        source_id=o.source_id,
        source_layer=o.source_layer,
        period_start=o.period_start,
        period_end=o.period_end,
        spatial_support=o.spatial_support,
        quality_status=o.quality_status,
        meta=json.loads(o.meta_json) if o.meta_json else {},
    )


def _group_observations(observations) -> dict[str, list[ObservationOut]]:
    groups: dict[str, list[ObservationOut]] = {"climate": [], "soil": [], "suitability": []}
    for o in observations:
        if o.source_id == "nasa_power":
            groups["climate"].append(_observation_out(o))
        elif o.source_id == "soilgrids":
            groups["soil"].append(_observation_out(o))
        else:
            groups["suitability"].append(_observation_out(o))
    return groups


@router.get("/api/v1/fields/{field_id}/insights", response_model=InsightsOut)
def field_insights(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    job = (
        db.query(AnalysisJob)
        .filter(AnalysisJob.field_id == field.field_id, AnalysisJob.status.in_(["complete", "partial"]))
        .order_by(AnalysisJob.created_at.desc())
        .first()
    )
    limitations: list[str] = []
    if job is None:
        return InsightsOut(field_id=field.field_id, limitations=[
            "No completed analysis yet. Start an analysis to collect field insights."])

    observations = job.observations
    groups = _group_observations(observations)

    result = json.loads(job.result_json) if job.result_json else {}
    for missing in result.get("history", {}).get("notes_en", []):
        limitations.append(missing)
    sources = json.loads(job.source_status_json or "{}")
    for sid, meta in sources.items():
        if meta.get("status") in ("unavailable", "failed"):
            limitations.append(f"{sid} unavailable: {meta.get('detail') or 'no data'}")
        elif meta.get("status") == "cached":
            limitations.append(f"{sid} served from cache fetched at {meta.get('fetched_at')}")
    for cand in result.get("candidates", [])[:1]:
        for missing in cand.get("evidence", {}).get("missing_information", []):
            limitations.append(f"missing: {missing}")

    return InsightsOut(
        field_id=field.field_id,
        last_analysis_id=job.id,
        last_analysis_at=job.finished_at or job.created_at,
        climate=groups["climate"],
        soil=groups["soil"],
        suitability=groups["suitability"],
        limitations=limitations,
    )
