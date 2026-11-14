"""Field CRUD with anonymous-key ownership."""
import json

from sqlalchemy.orm import Session

from app.core.errors import AnonymousAccessError, NotFoundError, ValidationFailed
from app.core.keys import hash_key
from app.db.models import AnonymousClient, AnalysisJob, CropHistoryEntry, FarmProfile, Field, new_id, utcnow_iso
from app.schemas.api import FieldCreate, FieldOut
from app.services.geometry import validate_field_geometry


def ensure_client(db: Session, access_key: str | None) -> AnonymousClient:
    if not access_key:
        raise AnonymousAccessError(
            "Anonymous access key missing; the browser stores a local key without any account system."
        )
    key_hash = hash_key(access_key)
    client = db.query(AnonymousClient).filter(AnonymousClient.access_key_hash == key_hash).one_or_none()
    if client is None:
        client = AnonymousClient(client_id=new_id("client"), access_key_hash=key_hash)
        db.add(client)
        db.commit()
    return client


def field_to_out(field: Field) -> FieldOut:
    profile = field.profile
    has_plan = any(p.chosen_version_id for p in field.plans)
    return FieldOut(
        field_id=field.field_id,
        name=field.name,
        area_ha=field.area_ha,
        centroid_lat=field.centroid_lat,
        centroid_lon=field.centroid_lon,
        bbox=json.loads(field.bbox_json or "[]"),
        geometry_geojson=json.loads(field.geometry_geojson),
        created_at=field.created_at,
        updated_at=field.updated_at,
        vertex_count=None,
        has_profile=profile is not None,
        has_active_plan=has_plan,
    )


def create_field(db: Session, client: AnonymousClient, payload: FieldCreate) -> FieldOut:
    metrics = validate_field_geometry(payload.geometry)
    field = Field(
        field_id=new_id("field"),
        client_id=client.client_id,
        name=payload.name.strip(),
        geometry_geojson=metrics["geometry_geojson"],
        area_ha=metrics["area_ha"],
        centroid_lat=metrics["centroid_lat"],
        centroid_lon=metrics["centroid_lon"],
        bbox_json=json.dumps(metrics["bbox"]),
    )
    db.add(field)
    db.commit()
    return field_to_out(field)


def update_field(db: Session, field: Field, name: str | None, geometry: dict | None) -> FieldOut:
    changed = False
    if name is not None and name.strip() and name.strip() != field.name:
        field.name = name.strip()
        changed = True
    if geometry is not None:
        metrics = validate_field_geometry(geometry)
        field.geometry_geojson = metrics["geometry_geojson"]
        field.area_ha = metrics["area_ha"]
        field.centroid_lat = metrics["centroid_lat"]
        field.centroid_lon = metrics["centroid_lon"]
        field.bbox_json = json.dumps(metrics["bbox"])
        changed = True
        # A geometry change invalidates dependent analyses (docs: never keep old scores).
        _invalidate_analyses(db, field)
    if changed:
        field.updated_at = utcnow_iso()
        db.commit()
    return field_to_out(field)


def _invalidate_analyses(db: Session, field: Field) -> None:
    for job in field.analyses:
        if job.status in ("queued", "running"):
            job.status = "failed"
            job.error_json = json.dumps({
                "code": "superseded_by_geometry_update",
                "message": "Field geometry changed; this analysis was invalidated. Start a new analysis.",
            })
    db.commit()


def delete_field(db: Session, field: Field) -> None:
    db.delete(field)
    db.commit()


def get_owned_field(db: Session, client: AnonymousClient, field_id: str) -> Field:
    field = db.get(Field, field_id)
    if field is None or field.client_id != client.client_id:
        # Existence of other keys' fields is never confirmed.
        raise NotFoundError("Field not found for this access key.")
    return field


def list_fields(db: Session, client: AnonymousClient) -> list[FieldOut]:
    fields = db.query(Field).filter(Field.client_id == client.client_id).order_by(Field.updated_at.desc()).all()
    return [field_to_out(f) for f in fields]


def save_profile(db: Session, field: Field, profile_in) -> None:
    data = profile_in.model_dump(by_alias=True)
    existing = field.profile
    if existing is None:
        existing = FarmProfile(field_id=field.field_id)
        db.add(existing)
        field.profile = existing
    existing.irrigation_type = data["irrigation_type"]
    existing.irrigation_method = data.get("irrigation_method")
    existing.water_availability = data.get("water_availability")
    existing.water_volume_note = data.get("water_volume_note")
    existing.purposes_json = json.dumps(data.get("purposes", []))
    priorities = data["priorities"]
    existing.priorities_json = json.dumps(priorities)
    existing.constraints_json = json.dumps(data.get("constraints")) if data.get("constraints") is not None else None
    existing.updated_at = utcnow_iso()
    field.updated_at = utcnow_iso()
    db.commit()


def replace_crop_history(db: Session, field: Field, entries: list[dict]) -> None:
    field.crop_history.clear()
    for entry in entries:
        field.crop_history.append(CropHistoryEntry(
            id=new_id("hist"),
            field_id=field.field_id,
            crop_year=entry["crop_year"],
            season_label=entry.get("season_label"),
            crop_id=entry.get("crop_id") if entry.get("status") == "planted" else None,
            status=entry["status"],
            planted_at=entry.get("planted_at"),
            harvested_at=entry.get("harvested_at"),
        ))
    field.updated_at = utcnow_iso()
    db.commit()
