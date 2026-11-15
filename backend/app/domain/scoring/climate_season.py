"""Growing-season climate exposure for rotation slots.

Why this module exists (defect verified 2026-11-15): POWER's climatology
T2M_MAX / T2M_MIN parameters behave as monthly EXTREME envelopes, not means
of daily maxima/minima — their annual values equal the extreme month (e.g.
Paris T2M_MAX ANN 39.61 == July), and monthly T2M_MAX at Meknes reads 46.5 C
in August while station climatology puts the mean daily max near 35 C.
Comparing that envelope against crop MEAN-temperature tolerances scored
every crop ~0 everywhere (winter wheat punished for August heat it never
experiences).

Verified statistic: monthly T2M (mean air temperature) tracks station
climatology closely (Paris Jan 3.0/Jul 19.3; Meknes Jan 10.75/Jul 27.6), so
the scoring uses it to determine each crop's thermally feasible growing
window and measures mean-temperature deviation there. The envelope arrays
are used only as bounded modifiers (they genuinely indicate that extreme
heat/cold can occur in a month), never as the main signal.
"""
from __future__ import annotations

from app.domain.crop_loader import CropTraits, get_crop
from app.domain.crop_rotation.history import _group_kind  # noqa: F401
from app.domain.crop_rotation.validator import FALLOW_SLOT, SlotPlan
from app.domain.crop_suitability.eligibility import FieldContext

MONTH_ORDER = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN",
               "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]

# bounded weight of the extreme-envelope modifier (mean temps carry the score)
ENVELOPE_MODIFIER_WEIGHT = 0.25


def feasible_months(crop: CropTraits, monthly_mean: dict[str, float | None]) -> list[str]:
    """Months whose verified mean temperature lies inside the crop's absolute
    survival range. Empty when the crop tolerates no month at this site."""
    out = []
    for m in MONTH_ORDER:
        v = monthly_mean.get(m)
        if v is None:
            continue
        lo = crop.temp_abs_min_c if crop.temp_abs_min_c is not None else -999.0
        hi = crop.temp_abs_max_c if crop.temp_abs_max_c is not None else 999.0
        if lo <= v <= hi:
            out.append(m)
    return out


def mean_deviation_from_optimal(crop: CropTraits, monthly_mean: dict[str, float | None],
                                months: list[str]) -> float | None:
    """Mean signed distance from the crop's optimal band across its window,
    normalized by the width of the optimal band. 0 = whole window optimal."""
    if not months:
        return None
    if crop.temp_opt_min_c is None or crop.temp_opt_max_c is None:
        return None
    band = max(crop.temp_opt_max_c - crop.temp_opt_min_c, 1.0)
    devs = []
    for m in months:
        v = monthly_mean.get(m)
        if v is None:
            continue
        if v > crop.temp_opt_max_c:
            devs.append(v - crop.temp_opt_max_c)
        elif v < crop.temp_opt_min_c:
            devs.append(crop.temp_opt_min_c - v)
        else:
            devs.append(0.0)
    if not devs:
        return None
    return sum(devs) / len(devs) / band


def _crop_climate_margin(crop: CropTraits, ctx: FieldContext) -> tuple[float | None, list[str]]:
    """One crop's climate margin from verified monthly means, with a bounded
    extreme-envelope modifier. Falls back to the legacy annual-extremes
    comparison only when verified monthly means are unavailable."""
    monthly_mean = ctx.monthly_mean_temp_c or {}
    has_verified = ctx.monthly_mean_temp_c_filled and len(monthly_mean) == 12

    if not has_verified:
        # Legacy fallback: annual extremes (kept for degraded observations).
        rules = ["R-CLIMATE-ANNUAL-EXTREMES-FALLBACK"]
        heat = _heat_margin(crop, ctx.hottest_month_max_temp_c)
        cold = _cold_margin(crop, ctx.coldest_month_min_temp_c)
        parts = [m for m in (heat, cold) if m is not None]
        return (min(parts), rules) if parts else (None, rules)

    rules = ["R-CLIMATE-GROWING-SEASON"]
    window = feasible_months(crop, monthly_mean)
    if not window:
        # no thermally feasible month at this site
        return 0.0, rules + ["R-CLIMATE-NO-FEASIBLE-MONTH"]

    dev = mean_deviation_from_optimal(crop, monthly_mean, window)
    margin = 1.0 if dev is None else max(0.0, 1.0 - dev)

    # bounded extreme-envelope modifier over the feasible window
    envelope_penalty = 0.0
    months_with_max = {m: ctx.monthly_max_temp_c.get(m) for m in window}
    months_with_min = {m: ctx.monthly_min_temp_c.get(m) for m in window}
    if crop.temp_abs_max_c is not None:
        hot_months = [m for m, v in months_with_max.items()
                      if v is not None and v > crop.temp_abs_max_c]
        envelope_penalty += ENVELOPE_MODIFIER_WEIGHT * len(hot_months) / len(window)
    if crop.temp_abs_min_c is not None:
        cold_months = [m for m, v in months_with_min.items()
                       if v is not None and v < crop.temp_abs_min_c]
        envelope_penalty += ENVELOPE_MODIFIER_WEIGHT * len(cold_months) / len(window)
    margin -= envelope_penalty
    if envelope_penalty:
        rules.append("R-CLIMATE-EXTREME-ENVELOPE")

    return max(0.0, margin), rules


def climate_indicator(slots: list[SlotPlan], ctx: FieldContext,
                      monthly_precip: dict[str, float | None] | None) -> tuple[float | None, list[str]]:
    rules: list[str] = []
    margins: list[float] = []
    for slot in slots:
        if slot.is_fallow:
            margins.append(0.5)  # neutral: no climate exposure, no production
            continue
        crop = get_crop(slot.crop_id or "")
        if crop is None:
            margins.append(0.5)
            rules.append("R-CLIMATE-UNKNOWN-CROP")
            continue
        margin, crop_rules = _crop_climate_margin(crop, ctx)
        if margin is None:
            margins.append(0.5)
            rules.append("R-CLIMATE-TEMP-UNKNOWN")
            continue
        margins.append(margin)
        rules.extend(crop_rules)

    value = sum(margins) / len(margins) if margins else None

    # Rain concentration: precipitation packed into few months stresses
    # rainfed crops between events; measurable from POWER monthly normals.
    if monthly_precip and ctx.irrigation_type in ("rainfed", "unknown", "mixed"):
        vals = [v for v in monthly_precip.values() if v is not None]
        if len(vals) == 12 and sum(vals) > 0:
            ordered = sorted(vals, reverse=True)
            wet_share = sum(ordered[:4]) / sum(vals)
            concentration = max(0.0, min(1.0, (wet_share - 0.33) / 0.5))
            stress = 1.0 - 0.25 * concentration
            value = value * stress if value is not None else None
            rules.append("R-CLIMATE-RAIN-CONCENTRATION")
        elif len(vals) == 12 and sum(vals) == 0:
            # An observed dry year is not missing data. Its concentration
            # ratio is undefined; water demand remains evaluated separately.
            rules.append("R-CLIMATE-RAIN-CONCENTRATION-UNDEFINED-ZERO-RAIN")

    return value, sorted(set(rules))


def _heat_margin(crop: CropTraits, hottest_max: float | None) -> float | None:
    if crop.temp_abs_max_c is None or hottest_max is None:
        return None
    headroom = crop.temp_abs_max_c - hottest_max
    return max(0.0, min(1.0, 0.5 + headroom / 20.0))


def _cold_margin(crop: CropTraits, coldest_min: float | None) -> float | None:
    if crop.temp_abs_min_c is None or coldest_min is None:
        return None
    headroom = coldest_min - crop.temp_abs_min_c
    return max(0.0, min(1.0, 0.5 + headroom / 15.0))
