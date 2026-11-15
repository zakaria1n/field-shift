"""Pydantic API schemas (v1 contract)."""
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator, model_validator

# ---------------------------------------------------------------- fields


class FieldCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    geometry: dict[str, Any]


class FieldUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    geometry: Optional[dict[str, Any]] = None


class FieldOut(BaseModel):
    field_id: str
    name: str
    area_ha: float
    centroid_lat: float
    centroid_lon: float
    bbox: list[float]
    geometry_geojson: dict[str, Any]
    created_at: str
    updated_at: str
    geometry_status: str = "valid"
    vertex_count: Optional[int] = None
    has_profile: bool = False
    has_active_plan: bool = False
    geographic_validation: dict[str, Any] | None = None


class FieldValidationIn(BaseModel):
    geometry: dict[str, Any]


class FieldListOut(BaseModel):
    fields: list[FieldOut]


# ---------------------------------------------------------------- farm profile

IrrigationType = Literal["rainfed", "irrigated", "mixed", "unknown"]
IrrigationMethod = Literal["drip", "sprinkler", "surface", "other", "unknown"]
WaterAvailability = Literal["limited", "regular", "unknown"]
HistoryStatus = Literal["planted", "fallow", "unknown"]
Purpose = Literal["sell", "livestock_feed", "household_food", "soil_restoration"]

PRIORITY_KEYS = ("water", "soil", "yield", "risk")


class CropHistoryEntryIn(BaseModel):
    crop_year: int = Field(ge=1900, le=2100)
    season_label: Optional[str] = Field(default=None, max_length=60)
    crop_id: Optional[str] = Field(default=None, max_length=80)
    status: HistoryStatus
    planted_at: Optional[str] = None
    harvested_at: Optional[str] = None

    @model_validator(mode="after")
    def planted_requires_crop(self):
        if self.status == "planted" and not self.crop_id:
            raise ValueError("crop_id is required when status is 'planted'")
        return self


class PrioritiesIn(BaseModel):
    water: int = Field(ge=0, le=100)
    soil: int = Field(ge=0, le=100)
    yield_: int = Field(ge=0, le=100, alias="yield")
    risk: int = Field(ge=0, le=100)

    model_config = {"populate_by_name": True}

    def as_dict(self) -> dict[str, int]:
        return {"water": self.water, "soil": self.soil, "yield": self.yield_, "risk": self.risk}


class FarmProfileIn(BaseModel):
    irrigation_type: IrrigationType
    irrigation_method: Optional[IrrigationMethod] = None
    water_availability: Optional[WaterAvailability] = None
    water_volume_note: Optional[str] = Field(default=None, max_length=300)
    purposes: list[Purpose] = Field(default_factory=list)
    priorities: PrioritiesIn
    constraints: Optional[dict[str, Any]] = None

    @field_validator("irrigation_method")
    @classmethod
    def method_only_when_irrigated(cls, v, info):
        if v and v != "unknown" and info.data.get("irrigation_type") == "rainfed":
            raise ValueError("irrigation_method requires irrigated or mixed irrigation_type")
        return v


class FarmProfileOut(BaseModel):
    field_id: str
    irrigation_type: str
    irrigation_method: Optional[str]
    water_availability: Optional[str]
    water_volume_note: Optional[str]
    purposes: list[str]
    priorities: dict[str, int]
    constraints: Optional[dict[str, Any]]
    updated_at: str


# ---------------------------------------------------------------- crops


class CropOut(BaseModel):
    crop_id: str
    name_en: str
    name_ar: str
    scientific_name: Optional[str]
    rotation_group: Optional[str]
    agronomic_review_status: Optional[str]
    calendar_status: Optional[str]
    fixes_nitrogen: Optional[bool] = None
    animal_feed: Optional[str] = None
    traits: dict[str, Any] = Field(default_factory=dict)


class CropListOut(BaseModel):
    crops: list[CropOut]
    catalog_notice: str


# ---------------------------------------------------------------- analysis


class AnalysisStartIn(BaseModel):
    pass  # reserved: date window overrides


class StageOut(BaseModel):
    key: str
    status: Literal["pending", "running", "complete", "failed", "skipped", "partial"]
    detail: Optional[str] = None


class SourceStatusOut(BaseModel):
    source_id: str
    status: Literal["pending", "running", "live", "cached", "missing", "unavailable", "demo_fixture", "failed"]
    detail: Optional[str] = None
    fetched_at: Optional[str] = None
    data_period: Optional[str] = None
    reason_code: Optional[str] = None


class AnalysisJobOut(BaseModel):
    job_id: str
    field_id: str
    status: Literal["queued", "running", "complete", "partial", "failed"]
    stages: list[StageOut]
    sources: list[SourceStatusOut]
    error: Optional[dict[str, Any]] = None
    started_at: Optional[str] = None
    finished_at: Optional[str] = None


# ---------------------------------------------------------------- observations


class ObservationOut(BaseModel):
    indicator: str
    value: Optional[float] = None
    unit: Optional[str] = None
    source_id: str
    source_layer: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    spatial_support: Optional[str] = None
    quality_status: str
    meta: dict[str, Any] = Field(default_factory=dict)


class InsightsOut(BaseModel):
    field_id: str
    last_analysis_id: Optional[str] = None
    last_analysis_at: Optional[str] = None
    climate: list[ObservationOut] = []
    soil: list[ObservationOut] = []
    suitability: list[ObservationOut] = []
    limitations: list[str] = []


# ---------------------------------------------------------------- rotations


class SlotOut(BaseModel):
    slot_id: str
    year_number: int
    crop_id: Optional[str]
    name_en: Optional[str] = None
    name_ar: Optional[str] = None
    rotation_group: Optional[str] = None
    fallow: bool = False
    planting_window: Optional[dict[str, Any]] = None


class IndicatorOut(BaseModel):
    key: str
    label_en: str
    label_ar: str
    value: Optional[float] = None  # normalized 0..1 when available
    status: Literal["available", "unavailable", "partial"]
    unit_note: Optional[str] = None
    contribution_note: Optional[str] = None
    rule_ids: list[str] = []


class ScoreBreakdownOut(BaseModel):
    total: Optional[float] = None
    weights_applied: dict[str, float] = {}
    weight_redistribution_note: Optional[str] = None
    indicators: list[IndicatorOut] = []
    evaluated_dimensions: list[str] = []
    partial_dimensions: list[str] = []
    yield_reference_coverage: dict[str, int] = {}
    comparison_basis: str | None = None
    data_quality_note: str | None = None
    unsupported_claims_note: str = (
        "Qualitative reference indicators only. No profit, water-savings %, "
        "yield forecast or soil-health point gains are computed."
    )


class EvidenceRefOut(BaseModel):
    rule_ids: list[str] = []
    observation_ids: list[str] = []
    source_ids: list[str] = []
    notes: list[str] = []
    missing_information: list[str] = []


class RotationOut(BaseModel):
    plan_id: Optional[str] = None
    version_id: Optional[str] = None
    rank: int
    label: str  # "Plan A"/"Plan B"/... set by backend per analysis
    status: Literal["candidate", "chosen", "archived"]
    is_recommended: bool = False
    horizon_years: int
    slots: list[SlotOut]
    score: ScoreBreakdownOut
    summary_en: str
    summary_ar: str
    main_limitation_en: Optional[str] = None
    main_limitation_ar: Optional[str] = None
    evidence: EvidenceRefOut
    similar_to_current_practice: Optional[bool] = None


class RotationListOut(BaseModel):
    field_id: str
    analysis_id: str
    rotations: list[RotationOut]
    insufficient_data_note: Optional[str] = None
    current_practice_note: Optional[str] = None


class SubstituteCandidateOut(BaseModel):
    crop_id: str
    name_en: str
    name_ar: str
    rotation_group: Optional[str]
    why_available: list[str]
    similar_impact: bool = False
    similarity_note: Optional[str] = None


class SubstitutesOut(BaseModel):
    slot_id: str
    crop_id: Optional[str]
    candidates: list[SubstituteCandidateOut]


class EditSlotIn(BaseModel):
    slot_id: str
    crop_id: Optional[str] = None  # None => fallow


class EvaluateIn(BaseModel):
    edits: list[EditSlotIn] = Field(min_length=1)


class ComparisonRowOut(BaseModel):
    indicator: str
    label_en: str
    label_ar: str
    original_value: Optional[float]
    modified_value: Optional[float]
    delta: Optional[float]
    status: Literal["changed", "unchanged", "unknown", "added", "removed"]
    note_en: Optional[str] = None
    note_ar: Optional[str] = None


class EvaluationOut(BaseModel):
    feasibility: Literal["feasible", "needs_review", "infeasible"]
    conflicts: list[dict[str, Any]] = []
    modified_slots: ScoreBreakdownOut | None = None
    comparison: list[ComparisonRowOut] = []
    sequence_after: list[SlotOut] = []
    sequence_before: list[SlotOut] = []
    notes: list[str] = []


class AdoptIn(BaseModel):
    edits: Optional[list[EditSlotIn]] = None  # None/empty => adopt the original candidate


class AdoptedPlanOut(BaseModel):
    plan_id: str
    version_id: str
    field_id: str
    label: str
    status: str
    horizon_years: int
    slots: list[SlotOut]
    score: ScoreBreakdownOut
    adopted_at: str


# ---------------------------------------------------------------- dashboard / events


class EventIn(BaseModel):
    event_type: Literal["planned", "planted", "harvested", "skipped"]
    crop_slot_id: Optional[str] = None
    version_id: Optional[str] = None
    event_date: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class EventOut(EventIn):
    id: str
    created_at: str
    reported_by: Literal["farmer"] = "farmer"


class DashboardOut(BaseModel):
    field_id: str
    field_name: str
    area_ha: float
    active_plan: Optional[AdoptedPlanOut] = None
    last_analysis: Optional[dict[str, Any]] = None
    profile_summary: Optional[dict[str, Any]] = None
    quick_actions: list[str] = ["view_plan", "timeline", "insights", "reevaluate", "add_field"]


# ---------------------------------------------------------------- misc


class PlaceResult(BaseModel):
    display_name: str
    lat: float
    lon: float
    type: Optional[str] = None


class SearchOut(BaseModel):
    results: list[PlaceResult]
    provider: str
    attribution: str


class HealthOut(BaseModel):
    status: str = "ok"
    data_mode: str
    providers: dict[str, str]
