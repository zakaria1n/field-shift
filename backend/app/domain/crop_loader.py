"""Crop knowledge loader for crop_knowledge_global_DRAFT.csv.

Data rules:
- blank numeric cells stay None (unknown), never zero;
- no planting-month field exists here and none is invented;
- the audit flag columns (agronomic_review_status,
  is_allowed_as_universal_hard_filter, calendar_status) must be respected by
  consumers.
"""
import csv
from dataclasses import dataclass, field
from functools import lru_cache
from typing import Any

from app.config import get_settings


def _blank_to_none(value: str | None) -> str | None:
    if value is None:
        return None
    value = value.strip()
    return value or None


def _num(value: str | None) -> float | None:
    value = _blank_to_none(value)
    if value is None:
        return None
    try:
        return float(value)
    except ValueError:
        return None


def _flag(value: str | None) -> bool | None:
    value = _blank_to_none(value)
    if value is None:
        return None
    return value.lower() == "yes"


@dataclass(frozen=True)
class CropTraits:
    crop_id: str
    name_en: str
    name_ar: str
    scientific_name: str | None
    ecocrop_family: str | None
    rotation_group: str | None
    temp_opt_min_c: float | None
    temp_opt_max_c: float | None
    temp_abs_min_c: float | None
    temp_abs_max_c: float | None
    rain_opt_min_mm: float | None
    rain_opt_max_mm: float | None
    rain_abs_min_mm: float | None
    rain_abs_max_mm: float | None
    ph_opt_min: float | None
    ph_opt_max: float | None
    ph_abs_min: float | None
    ph_abs_max: float | None
    growing_days_min: float | None
    growing_days_max: float | None
    soil_texture_opt: str | None
    soil_depth_opt: str | None
    soil_fertility_opt: str | None
    salinity_tol_opt: str | None
    drainage_opt: str | None
    photoperiod: str | None
    root_depth_min_m: float | None
    root_depth_max_m: float | None
    fixes_nitrogen: bool | None
    animal_feed: str | None
    calendar_rule_id: str | None
    calendar_status: str | None
    agronomic_review_status: str | None
    is_allowed_as_universal_hard_filter: bool
    source_note: str | None
    extras: dict[str, Any] = field(default_factory=dict)

    @property
    def is_provisional_data(self) -> bool:
        return self.agronomic_review_status == "unverified_team_reference"


@lru_cache(maxsize=1)
def load_crop_catalog() -> dict[str, CropTraits]:
    path = get_settings().crop_knowledge_csv
    catalog: dict[str, CropTraits] = {}
    with open(path, newline="", encoding="utf-8-sig") as fh:
        for row in csv.DictReader(fh):
            crop_id = (row.get("crop_id") or "").strip()
            if not crop_id:
                continue
            catalog[crop_id] = CropTraits(
                crop_id=crop_id,
                name_en=row.get("name_en") or crop_id,
                name_ar=row.get("name_ar") or crop_id,
                scientific_name=_blank_to_none(row.get("scientific_name")),
                ecocrop_family=_blank_to_none(row.get("ecocrop_family")),
                rotation_group=_blank_to_none(row.get("rotation_group")),
                temp_opt_min_c=_num(row.get("temp_opt_min_c")),
                temp_opt_max_c=_num(row.get("temp_opt_max_c")),
                temp_abs_min_c=_num(row.get("temp_abs_min_c")),
                temp_abs_max_c=_num(row.get("temp_abs_max_c")),
                rain_opt_min_mm=_num(row.get("rain_opt_min_mm")),
                rain_opt_max_mm=_num(row.get("rain_opt_max_mm")),
                rain_abs_min_mm=_num(row.get("rain_abs_min_mm")),
                rain_abs_max_mm=_num(row.get("rain_abs_max_mm")),
                ph_opt_min=_num(row.get("ph_opt_min")),
                ph_opt_max=_num(row.get("ph_opt_max")),
                ph_abs_min=_num(row.get("ph_abs_min")),
                ph_abs_max=_num(row.get("ph_abs_max")),
                growing_days_min=_num(row.get("growing_days_min")),
                growing_days_max=_num(row.get("growing_days_max")),
                soil_texture_opt=_blank_to_none(row.get("soil_texture_opt")),
                soil_depth_opt=_blank_to_none(row.get("soil_depth_opt")),
                soil_fertility_opt=_blank_to_none(row.get("soil_fertility_opt")),
                salinity_tol_opt=_blank_to_none(row.get("salinity_tol_opt")),
                drainage_opt=_blank_to_none(row.get("drainage_opt")),
                photoperiod=_blank_to_none(row.get("photoperiod")),
                root_depth_min_m=_num(row.get("root_depth_min_m")),
                root_depth_max_m=_num(row.get("root_depth_max_m")),
                fixes_nitrogen=_flag(row.get("fixes_nitrogen")),
                animal_feed=_blank_to_none(row.get("animal_feed")),
                calendar_rule_id=_blank_to_none(row.get("calendar_rule_id")),
                calendar_status=_blank_to_none(row.get("calendar_status")),
                agronomic_review_status=_blank_to_none(row.get("agronomic_review_status")),
                is_allowed_as_universal_hard_filter=(row.get("is_allowed_as_universal_hard_filter") or "false")
                    .strip().lower() == "true",
                source_note=_blank_to_none(row.get("source_note")),
            )
    return catalog


def get_crop(crop_id: str) -> CropTraits | None:
    return load_crop_catalog().get(crop_id)


def all_crops() -> list[CropTraits]:
    return list(load_crop_catalog().values())
