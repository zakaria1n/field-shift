"""Fields, profile, crop history and priorities routes."""
import json

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_client
from app.core.errors import ValidationFailed
from app.db.base import get_db
from app.db.models import AnonymousClient
from app.schemas.api import (
    CropHistoryEntryIn,
    FarmProfileIn,
    FarmProfileOut,
    FieldCreate,
    FieldListOut,
    FieldOut,
    FieldUpdate,
)
from app.services.field_store import (
    create_field,
    delete_field,
    field_to_out,
    get_owned_field,
    list_fields,
    replace_crop_history,
    save_profile,
    update_field,
)

router = APIRouter(prefix="/api/v1/fields", tags=["fields"])


@router.post("", response_model=FieldOut, status_code=201)
def create_field_route(payload: FieldCreate, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    return create_field(db, client, payload)


@router.get("", response_model=FieldListOut)
def list_fields_route(db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    return FieldListOut(fields=list_fields(db, client))


@router.get("/{field_id}", response_model=FieldOut)
def get_field_route(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    return field_to_out(field)


@router.patch("/{field_id}", response_model=FieldOut)
def update_field_route(field_id: str, payload: FieldUpdate, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    return update_field(db, field, payload.name, payload.geometry)


@router.delete("/{field_id}", status_code=204)
def delete_field_route(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    delete_field(db, field)


@router.put("/{field_id}/profile", response_model=FarmProfileOut)
def put_profile_route(field_id: str, payload: FarmProfileIn, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    priorities = payload.priorities.as_dict()
    if sum(priorities.values()) != 100:
        raise ValidationFailed(
            f"Priority weights must total exactly 100 (got {sum(priorities.values())}).",
            code="priorities_not_normalized",
            details={"priorities": priorities},
        )
    save_profile(db, field, payload)
    return FarmProfileOut(
        field_id=field.field_id,
        irrigation_type=payload.irrigation_type,
        irrigation_method=payload.irrigation_method,
        water_availability=payload.water_availability,
        water_volume_note=payload.water_volume_note,
        purposes=[p for p in payload.purposes],
        priorities=priorities,
        constraints=payload.constraints,
        updated_at=field.profile.updated_at,
    )


@router.get("/{field_id}/profile", response_model=FarmProfileOut)
def get_profile_route(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    from fastapi import HTTPException
    field = get_owned_field(db, client, field_id)
    profile = field.profile
    if profile is None:
        raise HTTPException(status_code=404, detail={
            "error": {"code": "profile_not_found", "message": "No farm profile saved for this field yet."}})
    return FarmProfileOut(
        field_id=field.field_id,
        irrigation_type=profile.irrigation_type,
        irrigation_method=profile.irrigation_method,
        water_availability=profile.water_availability,
        water_volume_note=profile.water_volume_note,
        purposes=json.loads(profile.purposes_json or "[]"),
        priorities=json.loads(profile.priorities_json or "{}"),
        constraints=json.loads(profile.constraints_json) if profile.constraints_json else None,
        updated_at=profile.updated_at,
    )


@router.put("/{field_id}/crop-history")
def put_crop_history_route(field_id: str, entries: list[CropHistoryEntryIn], db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    replace_crop_history(db, field, [e.model_dump() for e in entries])
    return {"field_id": field.field_id, "entries": len(entries)}


@router.get("/{field_id}/crop-history")
def get_crop_history_route(field_id: str, db: Session = Depends(get_db), client: AnonymousClient = Depends(get_client)):
    field = get_owned_field(db, client, field_id)
    return {
        "field_id": field.field_id,
        "entries": [
            {
                "id": e.id, "crop_year": e.crop_year, "season_label": e.season_label,
                "crop_id": e.crop_id, "status": e.status,
                "planted_at": e.planted_at, "harvested_at": e.harvested_at,
            }
            for e in sorted(field.crop_history, key=lambda x: (x.crop_year, x.season_label or ""))
        ],
    }
