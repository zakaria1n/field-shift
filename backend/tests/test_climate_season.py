"""Regression tests for the growing-season climate exposure fix.

Defect being guarded against: POWER T2M_MAX/T2M_MIN climatology values are
monthly EXTREME envelopes (Paris T2M_MAX ANN 39.61 == July; Meknes August
46.54), and the previous scoring compared that envelope against crop
MEAN-temperature tolerances, scoring cool-season crops ~0 everywhere.
"""
import dataclasses
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import pytest

from app.domain.crop_loader import get_crop
from app.domain.crop_rotation.validator import SlotPlan
from app.domain.crop_suitability.eligibility import FieldContext
from app.domain.scoring.climate_season import (
    climate_indicator,
    feasible_months,
    mean_deviation_from_optimal,
)

MEKNES_MONTHLY_MEAN = {  # verified POWER climatology, matches station normals
    "JAN": 10.75, "FEB": 11.68, "MAR": 14.25, "APR": 16.58,
    "MAY": 20.12, "JUN": 24.19, "JUL": 27.61, "AUG": 28.46,
    "SEP": 24.69, "OCT": 20.87, "NOV": 14.93, "DEC": 12.05,
}
MEKNES_MONTHLY_MAX = {  # verified EXTREME envelope: ANN 46.54 == AUG
    "JAN": 25.62, "FEB": 28.65, "MAR": 34.49, "APR": 34.38,
    "MAY": 40.08, "JUN": 45.01, "JUL": 46.27, "AUG": 46.54,
    "SEP": 44.5, "OCT": 38.4, "NOV": 31.2, "DEC": 28.46,
}
MEKNES_MONTHLY_MIN = {  # verified EXTREME envelope: ANN -3.54 == JAN
    "JAN": -3.54, "FEB": -1.52, "MAR": -0.07, "APR": 3.76,
    "MAY": 6.0, "JUN": 9.23, "JUL": 12.68, "AUG": 15.05,
    "SEP": 12.66, "OCT": 4.6, "NOV": 2.21, "DEC": -0.92,
}


def make_ctx(monthly=True):
    return FieldContext(
        centroid_lat=33.9, centroid_lon=-5.55,
        annual_precipitation_mm=420.0,
        monthly_mean_temp_c=dict(MEKNES_MONTHLY_MEAN) if monthly else {},
        monthly_max_temp_c=dict(MEKNES_MONTHLY_MAX) if monthly else {},
        monthly_min_temp_c=dict(MEKNES_MONTHLY_MIN) if monthly else {},
        hottest_month_max_temp_c=46.54 if monthly else None,
        coldest_month_min_temp_c=-3.54 if monthly else None,
        annual_mean_temp_c=18.89 if monthly else None,
        irrigation_type="rainfed", irrigation_method=None,
        water_availability=None, banned_crop_ids=[], purposes=["sell"],
        monthly_mean_temp_c_filled=monthly,
    )


def test_observed_zero_rain_is_not_missing_or_division_by_zero():
    ctx = dataclasses.replace(make_ctx(), annual_precipitation_mm=0.0)
    slots = [SlotPlan('y1', 1, 'bread_wheat')]
    score, rules = climate_indicator(slots, ctx, {m: 0.0 for m in MEKNES_MONTHLY_MEAN})
    assert score is not None and 0 <= score <= 1
    assert 'R-CLIMATE-RAIN-CONCENTRATION-UNDEFINED-ZERO-RAIN' in rules


def test_bread_wheat_window_excludes_the_hottest_months():
    """The original defect: August's 46.5 C extreme envelope scored the whole
    rotation ~0. Bread wheat's absolute mean range (5-27 C) excludes JUL
    (27.61) and AUG (28.46) at Meknes, so those months must never be part of
    its exposure window."""
    wheat = get_crop("bread_wheat")
    window = feasible_months(wheat, MEKNES_MONTHLY_MEAN)
    assert "JUL" not in window and "AUG" not in window
    assert {"NOV", "DEC", "JAN", "FEB", "MAR", "APR"} <= set(window)


def test_cool_season_crop_not_scored_zero_on_risk():
    """The regression: bread wheat used to score ~0 because August's 46.5 C
    envelope was compared against its 27 C mean tolerance."""
    ctx = make_ctx()
    slots = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, "faba_bean"),
             SlotPlan("y3", 3, "barley")]
    value, rules = climate_indicator(slots, ctx, None)
    assert value is not None
    assert value > 0.3, f"cool-season rotation scored {value}; window logic failed"
    assert "R-CLIMATE-GROWING-SEASON" in rules


def test_tighter_tolerance_scores_lower_with_same_window():
    """A crop whose absolute max sits below the extreme envelope of many of
    its window months must score lower than a wide-tolerance crop whose
    window months all stay inside its envelope — this is what the bounded
    envelope modifier is for."""
    ctx = make_ctx()
    tight = climate_indicator([SlotPlan("y1", 1, "bread_wheat")], ctx, None)[0]
    wide = climate_indicator([SlotPlan("y1", 1, "maize")], ctx, None)[0]
    assert tight is not None and wide is not None
    # bread wheat: many window months breach its 27 C envelope; maize's wide
    # envelope (30 C) is breached in fewer proportionally -> tighter < wider
    assert tight < wide


def test_crop_without_feasible_month_scores_zero():
    ctx = make_ctx()
    # a tropical crop needing 45-55 C means: no Meknes month qualifies
    crop = SimpleNamespace(
        temp_abs_min_c=45.0, temp_abs_max_c=55.0,
        temp_opt_min_c=48.0, temp_opt_max_c=52.0,
        fixes_nitrogen=False, rotation_group="cereal",
    )
    slots = [SlotPlan("y1", 1, "bread_wheat")]
    import app.domain.scoring.climate_season as cs
    orig = cs.get_crop
    cs.get_crop = lambda cid: crop
    try:
        value, rules = climate_indicator(slots, ctx, None)
    finally:
        cs.get_crop = orig
    assert value == 0.0
    assert "R-CLIMATE-NO-FEASIBLE-MONTH" in rules


def test_annual_extremes_fallback_when_monthly_missing():
    """Degraded observations (no monthly arrays) keep the documented legacy
    comparison so availability degrades instead of silently changing."""
    ctx = dataclasses.replace(make_ctx(monthly=False), hottest_month_max_temp_c=36.0)
    slots = [SlotPlan("y1", 1, "bread_wheat")]
    value, rules = climate_indicator(slots, ctx, None)
    assert value is not None
    assert "R-CLIMATE-ANNUAL-EXTREMES-FALLBACK" in rules


def test_mean_deviation_normalization():
    wheat = get_crop("bread_wheat")
    perfect = {m: 19.0 for m in ["JAN", "FEB", "MAR"]}
    assert mean_deviation_from_optimal(wheat, perfect, ["JAN", "FEB", "MAR"]) == 0.0
