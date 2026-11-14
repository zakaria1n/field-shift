"""SQLite persistence models (SQLAlchemy 2.0).

No users/accounts table:
anonymous_clients only stores a hash of the browser capability key.
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Boolean, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex}"


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


class AnonymousClient(Base):
    __tablename__ = "anonymous_clients"

    client_id: Mapped[str] = mapped_column(String, primary_key=True)
    access_key_hash: Mapped[str] = mapped_column(String, unique=True, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    fields: Mapped[list["Field"]] = relationship(back_populates="client", cascade="all, delete-orphan")


class Field(Base):
    __tablename__ = "fields"

    field_id: Mapped[str] = mapped_column(String, primary_key=True)
    client_id: Mapped[str] = mapped_column(ForeignKey("anonymous_clients.client_id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    geometry_geojson: Mapped[str] = mapped_column(Text, nullable=False)
    area_ha: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lat: Mapped[float] = mapped_column(Float, nullable=False)
    centroid_lon: Mapped[float] = mapped_column(Float, nullable=False)
    bbox_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    client: Mapped[AnonymousClient] = relationship(back_populates="fields")
    profile: Mapped["FarmProfile | None"] = relationship(
        back_populates="field", uselist=False, cascade="all, delete-orphan"
    )
    crop_history: Mapped[list["CropHistoryEntry"]] = relationship(
        back_populates="field", cascade="all, delete-orphan"
    )
    analyses: Mapped[list["AnalysisJob"]] = relationship(back_populates="field", cascade="all, delete-orphan")
    plans: Mapped[list["RotationPlan"]] = relationship(back_populates="field", cascade="all, delete-orphan")
    events: Mapped[list["ActualFieldEvent"]] = relationship(back_populates="field", cascade="all, delete-orphan")


class FarmProfile(Base):
    __tablename__ = "farm_profiles"

    field_id: Mapped[str] = mapped_column(ForeignKey("fields.field_id"), primary_key=True)
    irrigation_type: Mapped[str] = mapped_column(String, nullable=False)  # rainfed|irrigated|mixed|unknown
    irrigation_method: Mapped[str | None] = mapped_column(String)
    water_availability: Mapped[str | None] = mapped_column(String)
    water_volume_note: Mapped[str | None] = mapped_column(String)
    purposes_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    priorities_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    constraints_json: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    field: Mapped[Field] = relationship(back_populates="profile")


class CropHistoryEntry(Base):
    """One season entry for one year. A year can hold several entries (multi-season)."""

    __tablename__ = "crop_history"
    __table_args__ = (Index("ix_crop_history_field_year", "field_id", "crop_year"),)

    id: Mapped[str] = mapped_column(String, primary_key=True)
    field_id: Mapped[str] = mapped_column(ForeignKey("fields.field_id"), nullable=False)
    crop_year: Mapped[int] = mapped_column(Integer, nullable=False)
    season_label: Mapped[str | None] = mapped_column(String)
    crop_id: Mapped[str | None] = mapped_column(String)  # None => fallow/unknown per status
    status: Mapped[str] = mapped_column(String, nullable=False)  # planted|fallow|unknown
    planted_at: Mapped[str | None] = mapped_column(String)
    harvested_at: Mapped[str | None] = mapped_column(String)

    field: Mapped[Field] = relationship(back_populates="crop_history")


class AnalysisJob(Base):
    __tablename__ = "analysis_jobs"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    field_id: Mapped[str] = mapped_column(ForeignKey("fields.field_id"), nullable=False)
    status: Mapped[str] = mapped_column(String, nullable=False, default="queued")  # queued|running|complete|partial|failed
    stages_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    source_status_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    result_json: Mapped[str | None] = mapped_column(Text)  # candidate rotations + baseline
    error_json: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[str | None] = mapped_column(String)
    finished_at: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    field: Mapped[Field] = relationship(back_populates="analyses")
    observations: Mapped[list["Observation"]] = relationship(back_populates="analysis", cascade="all, delete-orphan")
    rotation_plan: Mapped["RotationPlan | None"] = relationship(back_populates="analysis")


class Observation(Base):
    """One provenance-complete indicator record (raw or derived)."""

    __tablename__ = "observations"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    field_id: Mapped[str] = mapped_column(ForeignKey("fields.field_id"), nullable=False)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analysis_jobs.id"), nullable=False)
    indicator: Mapped[str] = mapped_column(String, nullable=False)
    value_num: Mapped[float | None] = mapped_column(Float)
    value_json: Mapped[str | None] = mapped_column(Text)
    unit: Mapped[str | None] = mapped_column(String)
    source_id: Mapped[str] = mapped_column(String, nullable=False)
    source_layer: Mapped[str | None] = mapped_column(String)
    period_start: Mapped[str | None] = mapped_column(String)
    period_end: Mapped[str | None] = mapped_column(String)
    spatial_support: Mapped[str | None] = mapped_column(String)
    quality_status: Mapped[str] = mapped_column(String, nullable=False)  # live|cached|demo_fixture|derived|farmer|missing|unavailable
    meta_json: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    analysis: Mapped[AnalysisJob] = relationship(back_populates="observations")


class RotationPlan(Base):
    __tablename__ = "rotation_plans"

    plan_id: Mapped[str] = mapped_column(String, primary_key=True)
    field_id: Mapped[str] = mapped_column(ForeignKey("fields.field_id"), nullable=False)
    name: Mapped[str] = mapped_column(String, nullable=False)
    chosen_version_id: Mapped[str | None] = mapped_column(String)
    analysis_id: Mapped[str] = mapped_column(ForeignKey("analysis_jobs.id"), nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)
    updated_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    field: Mapped[Field] = relationship(back_populates="plans")
    analysis: Mapped[AnalysisJob] = relationship(back_populates="rotation_plan")
    versions: Mapped[list["RotationVersion"]] = relationship(
        back_populates="plan", cascade="all, delete-orphan"
    )


class RotationVersion(Base):
    __tablename__ = "rotation_versions"

    version_id: Mapped[str] = mapped_column(String, primary_key=True)
    plan_id: Mapped[str] = mapped_column(ForeignKey("rotation_plans.plan_id"), nullable=False)
    base_version_id: Mapped[str | None] = mapped_column(String)
    status: Mapped[str] = mapped_column(String, nullable=False)  # candidate|chosen|archived|draft_evaluated
    label: Mapped[str | None] = mapped_column(String)  # "Original", "Modified 2026-11-14", ...
    sequence_json: Mapped[str] = mapped_column(Text, nullable=False)
    score_json: Mapped[str] = mapped_column(Text, nullable=False)
    evidence_json: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    plan: Mapped[RotationPlan] = relationship(back_populates="versions")


class ActualFieldEvent(Base):
    """Farmer-reported activities. Never presented as satellite-verified."""

    __tablename__ = "actual_field_events"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    field_id: Mapped[str] = mapped_column(ForeignKey("fields.field_id"), nullable=False)
    version_id: Mapped[str | None] = mapped_column(String)
    crop_slot_id: Mapped[str | None] = mapped_column(String)
    event_type: Mapped[str] = mapped_column(String, nullable=False)  # planned|planted|harvested|skipped
    event_date: Mapped[str | None] = mapped_column(String)
    notes: Mapped[str | None] = mapped_column(String)
    created_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)

    field: Mapped[Field] = relationship(back_populates="events")


class ProviderCache(Base):
    """Response cache for external providers, with explicit fetch timestamps."""

    __tablename__ = "provider_cache"

    cache_key: Mapped[str] = mapped_column(String, primary_key=True)
    source_id: Mapped[str] = mapped_column(String, nullable=False)
    payload_json: Mapped[str] = mapped_column(Text, nullable=False)
    fetched_at: Mapped[str] = mapped_column(String, nullable=False)
    data_period: Mapped[str | None] = mapped_column(String)


class SchemaVersion(Base):
    __tablename__ = "schema_migrations"

    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    applied_at: Mapped[str] = mapped_column(String, nullable=False, default=utcnow_iso)


class CropCalendarRow(Base):
    """Location-specific crop calendar rows loaded from the verified CSV.

    The shipped CSV is intentionally EMPTY; adapters may add rows only
    from reviewed sources. `is_active=False` rows are never used in placement.
    """

    __tablename__ = "crop_calendar"

    calendar_rule_id: Mapped[str] = mapped_column(String, primary_key=True)
    country_iso2: Mapped[str | None] = mapped_column(String)
    agroecological_zone_id: Mapped[str | None] = mapped_column(String)
    crop_id: Mapped[str] = mapped_column(String, nullable=False)
    cropping_system: Mapped[str | None] = mapped_column(String)
    irrigation_type: Mapped[str | None] = mapped_column(String)
    planting_start_month: Mapped[int] = mapped_column(Integer, nullable=False)
    planting_end_month: Mapped[int] = mapped_column(Integer, nullable=False)
    harvest_start_month: Mapped[int] = mapped_column(Integer, nullable=False)
    harvest_end_month: Mapped[int] = mapped_column(Integer, nullable=False)
    hemisphere: Mapped[str | None] = mapped_column(String)
    source_name: Mapped[str | None] = mapped_column(String)
    source_url: Mapped[str | None] = mapped_column(String)
    source_year: Mapped[str | None] = mapped_column(String)
    review_status: Mapped[str] = mapped_column(String, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    notes: Mapped[str | None] = mapped_column(String)
