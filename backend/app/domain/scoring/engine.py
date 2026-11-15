"""Multi-objective rotation scoring.

Four indicators, one per farmer priority. Values are normalized 0..1
(higher = better for that objective) with documented formulas and per-rule
provenance. Missing indicator data is reported as unavailable and its weight
is redistributed proportionally — never scored as zero, never presented as a
real agronomic quantity. Profit/market values are out of scope entirely.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from typing import Any

from app.domain.crop_loader import CropTraits, get_crop
from app.domain.crop_rotation.validator import SlotPlan, FALLOW_SLOT
from app.domain.crop_suitability.eligibility import FieldContext

IRRIGATION_EFFICIENCY = {
    "drip": 0.95,
    "sprinkler": 0.80,
    "surface": 0.60,
    "other": 0.70,
    "unknown": 0.70,
}

INDICATOR_META = [
    {"key": "water", "label_en": "Water conservation fit", "label_ar": "ملاءمة توفير المياه"},
    {"key": "soil", "label_en": "Rotation / soil health", "label_ar": "صحة التربة والدورة الزراعية"},
    {"key": "yield", "label_en": "Yield reference (model)", "label_ar": "مرجع المردودية (نموذج)"},
    {"key": "risk", "label_en": "Climate resilience", "label_ar": "التقلب المناخي"},
]

# Substitution "Similar Impact" tolerance: only when the whole-sequence
# re-evaluation shows no hard violations, the total moves by at most this many
# points, and every available indicator stays within this band.
SIMILAR_TOTAL_TOLERANCE = 2.0
SIMILAR_INDICATOR_TOLERANCE = 0.05


@dataclass
class RotationScore:
    indicators: dict[str, float | None] = dc_field(default_factory=dict)
    indicator_status: dict[str, str] = dc_field(default_factory=dict)  # available | unavailable | partial
    indicator_notes: dict[str, list[str]] = dc_field(default_factory=dict)
    rule_ids: list[str] = dc_field(default_factory=list)
    source_ids: list[str] = dc_field(default_factory=list)
    weights_applied: dict[str, float] = dc_field(default_factory=dict)
    redistribution_note: str | None = None
    total: float | None = None
    yield_reference_coverage: dict[str, int] = dc_field(default_factory=dict)


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def water_indicator(slots: list[SlotPlan], ctx: FieldContext) -> tuple[float | None, list[str]]:
    rules: list[str] = []
    per_slot: list[float] = []
    precip = ctx.annual_precipitation_mm

    for slot in slots:
        if slot.crop_id == FALLOW_SLOT or slot.crop_id is None:
            # Neutral: no water demand, but no production either — a rest year
            # must not inflate the water or resilience score.
            per_slot.append(0.5)
            rules.append("R-WATER-FALLOW")
            continue
        crop = get_crop(slot.crop_id or "")
        if crop is None or crop.rain_opt_min_mm is None:
            per_slot.append(0.5)
            rules.append("R-WATER-UNKNOWN-DEMAND")
            continue
        demand = crop.rain_opt_min_mm
        if ctx.irrigation_type == "irrigated":
            # Demand met by rain leaves little pressure; the remainder is
            # scaled by how efficiently the available method delivers water.
            coverage = _clamp01((precip or 0.0) / max(demand, 1.0))
            efficiency = IRRIGATION_EFFICIENCY.get(ctx.irrigation_method or "unknown", 0.7)
            pressure = (1.0 - coverage) * (1.0 - efficiency)
            per_slot.append(_clamp01(1.0 - pressure))
            rules.append("R-WATER-IRRIGATED-EFFICIENCY")
        elif ctx.irrigation_type == "mixed":
            coverage = _clamp01((precip or 0.0) / max(demand, 1.0))
            pressure = (1.0 - coverage) * 0.5
            per_slot.append(_clamp01(1.0 - pressure))
            rules.append("R-WATER-MIXED")
        else:  # rainfed or unknown irrigation
            ratio = (precip or 0.0) / max(demand, 1.0)
            per_slot.append(_clamp01(ratio))
            rules.append("R-WATER-RAINFED-RATIO")

    if not per_slot:
        return None, rules
    value = sum(per_slot) / len(per_slot)
    if ctx.annual_precipitation_mm is None and ctx.irrigation_type in ("rainfed", "unknown"):
        return None, ["R-WATER-MISSING-OBSERVATION"]
    return value, sorted(set(rules))


def soil_indicator(slots: list[SlotPlan], history: Any, purposes: list[str]) -> tuple[float, list[str]]:
    rules: list[str] = []
    groups = [s.group() for s in slots if s.group() != "fallow"]
    crop_slots = [s for s in slots if not s.is_fallow]
    if not crop_slots:
        return 0.5, ["R-SOIL-FALLOW-ONLY"]

    diversity = len(set(g for g in groups if g)) / max(len(crop_slots), 1)
    rules.append("R-SOIL-FAMILY-DIVERSITY")

    legume_present = any(
        (get_crop(s.crop_id or "") is not None and get_crop(s.crop_id or "").fixes_nitrogen is True)
        for s in crop_slots
    )
    legume_bonus = 0.15 if legume_present else 0.0
    if legume_present:
        # Qualitative rotation hint only; no nitrogen quantity is claimed.
        rules.append("R-SOIL-LEGUME-HINT")

    consecutive_pairs = 0
    for i in range(1, len(slots)):
        g_a, g_b = slots[i - 1].group(), slots[i].group()
        if g_a and g_a == g_b and g_a != "fallow":
            consecutive_pairs += 1
    consecutive_penalty = 0.10 * consecutive_pairs
    if consecutive_pairs:
        rules.append("R-SOIL-CONSEC-GROUP-PENALTY")

    break_bonus = 0.0
    if getattr(history, "all_cereal_history", False) and legume_present:
        break_bonus = 0.10
        rules.append("R-SOIL-BREAK-MONOCULTURE")

    fallow_credit = 0.0
    fallow_slots = [s for s in slots if s.is_fallow]
    if fallow_slots and "soil_restoration" in purposes:
        fallow_credit = min(0.10, 0.05 * len(fallow_slots))
        rules.append("R-SOIL-FALLOW-CREDIT")

    value = _clamp01(0.6 * diversity + legume_bonus + fallow_credit + break_bonus - consecutive_penalty)
    return value, sorted(set(rules))


def yield_indicator(
    slots: list[SlotPlan],
    yield_refs: dict[str, float | None],
    pool_max: float | None,
) -> tuple[float | None, str, list[str]]:
    """Normalize attainable-yield references against the candidate pool max.

    Returns (value, status, rules); value None when no reference exists at all.
    """
    rules = ["R-YIELD-GAEZ-REFERENCE"]
    values: list[float] = []
    missing = 0
    for slot in slots:
        if slot.is_fallow:
            continue
        ref = yield_refs.get(slot.crop_id or "")
        if ref is None or pool_max in (None, 0):
            missing += 1
            continue
        values.append(_clamp01(ref / pool_max))
    if not values:
        return None, "unavailable", rules
    status = "partial" if missing else "available"
    return sum(values) / len(values), status, rules


def climate_indicator(slots: list[SlotPlan], ctx: FieldContext,
                      monthly_precip: dict[str, float | None] | None) -> tuple[float | None, list[str]]:
    """Growing-season climate exposure; see climate_season for the verified
    rationale (POWER T2M_MAX/T2M_MIN behave as extreme envelopes, so the
    score is driven by monthly mean temperature within each crop's thermal
    window, with a bounded envelope modifier)."""
    from app.domain.scoring.climate_season import climate_indicator as _season_indicator
    return _season_indicator(slots, ctx, monthly_precip)


def _heat_margin(crop: CropTraits, hottest_max: float | None) -> float | None:
    if crop.temp_abs_max_c is None or hottest_max is None:
        return None
    headroom = crop.temp_abs_max_c - hottest_max
    return _clamp01(0.5 + headroom / 20.0)


def _cold_margin(crop: CropTraits, coldest_min: float | None) -> float | None:
    if crop.temp_abs_min_c is None or coldest_min is None:
        return None
    headroom = coldest_min - crop.temp_abs_min_c
    return _clamp01(0.5 + headroom / 15.0)


def score_rotation(
    slots: list[SlotPlan],
    ctx: FieldContext,
    priorities: dict[str, int],
    history: Any,
    yield_refs: dict[str, float | None] | None = None,
    monthly_precip: dict[str, float | None] | None = None,
    purposes: list[str] | None = None,
) -> RotationScore:
    yield_refs = yield_refs or {}
    purposes = purposes or []
    total_weight = sum(priorities.get(k, 0) for k in ("water", "soil", "yield", "risk"))
    if total_weight <= 0:
        priorities = {"water": 25, "soil": 25, "yield": 25, "risk": 25}
        total_weight = 100

    water, water_rules = water_indicator(slots, ctx)
    soil, soil_rules = soil_indicator(slots, history, purposes)
    pool_max = max((v for v in yield_refs.values() if v is not None), default=None)
    yld, yld_status, yld_rules = yield_indicator(slots, yield_refs, pool_max)
    risk, risk_rules = climate_indicator(slots, ctx, monthly_precip)

    indicators: dict[str, float | None] = {"water": water, "soil": soil, "yield": yld, "risk": risk}
    status = {
        "water": "available" if water is not None else "unavailable",
        "soil": "available",
        "yield": yld_status,
        "risk": "available" if risk is not None else "unavailable",
    }

    # Redistribute weights of unavailable indicators proportionally.
    available = {k: v for k, v in indicators.items() if v is not None}
    weights_applied: dict[str, float] = {}
    redistribution_note = None
    if available and sum(priorities.get(k, 0) for k in available) > 0:
        avail_weight = sum(priorities.get(k, 0) for k in available)
        for k in available:
            weights_applied[k] = priorities.get(k, 0) / avail_weight
        unavailable_keys = [k for k in indicators if indicators[k] is None]
        if unavailable_keys:
            redistribution_note = (
                "Weight for unavailable indicator(s) "
                f"({', '.join(unavailable_keys)}) redistributed across available indicators."
            )
    else:
        # Everything unavailable: report honestly with no number.
        weights_applied = {}

    total = None
    if available and weights_applied:
        total = round(sum(weights_applied[k] * available[k] for k in available) * 100.0, 1)

    rule_ids = sorted(set(water_rules + soil_rules + yld_rules + risk_rules))
    source_ids = sorted({sid for sid in ("nasa_power", "gaez_v5") if sid != "gaez_v5" or yld_status != "unavailable"})

    return RotationScore(
        indicators=indicators,
        indicator_status=status,
        indicator_notes={},
        rule_ids=rule_ids,
        source_ids=source_ids,
        weights_applied={k: round(v, 4) for k, v in weights_applied.items()},
        redistribution_note=redistribution_note,
        total=total,
        yield_reference_coverage={"known": sum(1 for s in slots if not s.is_fallow and yield_refs.get(s.crop_id) is not None),
                                  "total": sum(1 for s in slots if not s.is_fallow)},
    )
