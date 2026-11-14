"""Returning-user dashboard, timeline events, crops catalog, search, health."""
import json

import httpx
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_client
from app.config import get_settings
from app.db.base import get_db
from app.db.models import ActualFieldEvent, AnalysisJob, AnonymousClient, new_id, utcnow_iso
from app.domain.crop_loader import all_crops
from app.schemas.api import (
    CropListOut,
    CropOut,
    DashboardOut,
    EventIn,
    EventOut,
    HealthOut,
    SearchOut,
)
from app.services.field_store import field_to_out, get_owned_field, list_fields
from app.services.plan_service import active_plan_for_field

router = APIRouter(prefix="/api/v1", tags=["dashboard"])


@router.get("/dashboard", response_model=list[DashboardOut])
def dashboard(db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    out: list[DashboardOut] = []
    for f in list_fields(db, client):
        field = get_owned_field(db, client, f.field_id)
        plan = active_plan_for_field(db, field)
        last_job = (
            db.query(AnalysisJob)
            .filter(AnalysisJob.field_id == field.field_id)
            .order_by(AnalysisJob.created_at.desc())
            .first()
        )
        profile = field.profile
        profile_summary = None
        if profile is not None:
            profile_summary = {
                "irrigation_type": profile.irrigation_type,
                "purposes": json.loads(profile.purposes_json or "[]"),
                "priorities": json.loads(profile.priorities_json or "{}"),
            }
        out.append(DashboardOut(
            field_id=field.field_id,
            field_name=field.name,
            area_ha=field.area_ha,
            active_plan=plan,
            last_analysis={
                "analysis_id": last_job.id,
                "status": last_job.status,
                "finished_at": last_job.finished_at,
                "created_at": last_job.created_at,
            } if last_job else None,
            profile_summary=profile_summary,
        ))
    return out


@router.put("/fields/{field_id}/events", response_model=EventOut, status_code=201)
def put_event(field_id: str, payload: EventIn, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    event = ActualFieldEvent(
        id=new_id("event"),
        field_id=field.field_id,
        version_id=payload.version_id,
        crop_slot_id=payload.crop_slot_id,
        event_type=payload.event_type,
        event_date=payload.event_date,
        notes=payload.notes,
    )
    db.add(event)
    db.commit()
    return EventOut(
        id=event.id, event_type=event.event_type, crop_slot_id=event.crop_slot_id,
        version_id=event.version_id, event_date=event.event_date, notes=event.notes,
        created_at=event.created_at,
    )


@router.get("/fields/{field_id}/events")
def list_events(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    return {
        "field_id": field.field_id,
        "events": [
            {
                "id": e.id, "event_type": e.event_type, "crop_slot_id": e.crop_slot_id,
                "version_id": e.version_id, "event_date": e.event_date, "notes": e.notes,
                "created_at": e.created_at, "reported_by": "farmer",
            }
            for e in sorted(field.events, key=lambda x: x.created_at)
        ],
    }


# ---------------------------------------------------------------- misc

misc_router = APIRouter(prefix="/api/v1", tags=["misc"])


@misc_router.get("/crops", response_model=CropListOut)
def crop_catalog():
    crops = []
    for c in all_crops():
        crops.append(CropOut(
            crop_id=c.crop_id,
            name_en=c.name_en,
            name_ar=c.name_ar,
            scientific_name=c.scientific_name,
            rotation_group=c.rotation_group,
            agronomic_review_status=c.agronomic_review_status,
            calendar_status=c.calendar_status,
            fixes_nitrogen=c.fixes_nitrogen,
            animal_feed=c.animal_feed,
            traits={
                "temp_opt_c": [c.temp_opt_min_c, c.temp_opt_max_c],
                "temp_abs_c": [c.temp_abs_min_c, c.temp_abs_max_c],
                "rain_opt_mm": [c.rain_opt_min_mm, c.rain_opt_max_mm],
                "rain_abs_mm": [c.rain_abs_min_mm, c.rain_abs_max_mm],
                "growing_days": [c.growing_days_min, c.growing_days_max],
                "soil_texture_opt": c.soil_texture_opt,
                "soil_depth_opt": c.soil_depth_opt,
            },
        ))
    return CropListOut(
        crops=crops,
        catalog_notice=(
            "Trait ranges are provisional team reference data (unverified_team_reference). "
            "No global planting months exist; calendars require verified country/zone rows."
        ),
    )


NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_ATTRIBUTION = "© OpenStreetMap contributors"


@misc_router.get("/places/search", response_model=SearchOut)
def place_search(q: str = Query(min_length=2, max_length=120)):
    settings = get_settings()
    if not settings.search_enabled:
        return SearchOut(results=[], provider="disabled", attribution=NOMINATIM_ATTRIBUTION)
    try:
        resp = httpx.get(
            NOMINATIM_URL,
            params={"q": q, "format": "json", "limit": 6, "addressdetails": 0},
            headers={"User-Agent": "FieldShift/1.0 (crop rotation decision support demo)"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
    except (httpx.HTTPError, ValueError):
        return SearchOut(results=[], provider="nominatim", attribution=NOMINATIM_ATTRIBUTION)
    results = [
        {"display_name": r.get("display_name", ""), "lat": float(r["lat"]), "lon": float(r["lon"]),
         "type": r.get("type")}
        for r in data
    ]
    return SearchOut(results=results, provider="nominatim", attribution=NOMINATIM_ATTRIBUTION)


@misc_router.get("/health", response_model=HealthOut)
def health():
    settings = get_settings()
    return HealthOut(
        status="ok",
        data_mode=settings.data_mode,
        providers={
            "nasa_power": "enabled" if settings.power_enabled else "disabled",
            "soilgrids": "enabled" if settings.soilgrids_enabled else "disabled",
            "gaez": "enabled" if settings.gaez_enabled else "disabled (no prepared layers)",
            "place_search": "enabled" if settings.search_enabled else "disabled",
        },
    )
