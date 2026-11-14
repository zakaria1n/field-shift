"""Crop loader and eligibility engine tests."""
from app.domain.crop_loader import all_crops, get_crop
from app.domain.crop_suitability.eligibility import FieldContext, evaluate_crop, screen_all


def _ctx(**overrides):
    base = dict(
        centroid_lat=33.9, centroid_lon=-5.55,
        annual_precipitation_mm=420.0,
        monthly_mean_temp_c={}, monthly_max_temp_c={}, monthly_min_temp_c={},
        hottest_month_max_temp_c=35.0, coldest_month_min_temp_c=2.0,
        annual_mean_temp_c=17.0,
        irrigation_type="rainfed", irrigation_method=None, water_availability=None,
        banned_crop_ids=[], purposes=["sell"], soil_ph=None, country_iso2="MA",
    )
    base.update(overrides)
    return FieldContext(**base)


def test_catalog_loads_37_crops_with_none_not_zero():
    crops = all_crops()
    assert len(crops) == 37
    wheat = get_crop("bread_wheat")
    assert wheat.temp_opt_min_c == 15.0
    assert wheat.fixes_nitrogen is False
    assert wheat.agronomic_review_status == "unverified_team_reference"
    assert wheat.is_allowed_as_universal_hard_filter is False
    faba = get_crop("faba_bean")
    assert faba.fixes_nitrogen is True


def test_rainfed_below_absolute_rain_hard_excludes():
    ctx = _ctx(annual_precipitation_mm=250.0)  # maize rain_abs_min > 250
    maize = get_crop("maize")
    result = evaluate_crop(maize, ctx)
    hard = [e for e in result.exclusions if e.severity == "hard"]
    assert any(e.rule_id == "R-RAIN-ABS-MIN" for e in hard)
    assert result.decision == "excluded"


def test_irrigated_field_not_rain_excluded():
    ctx = _ctx(annual_precipitation_mm=150.0, irrigation_type="irrigated", irrigation_method="drip")
    maize = get_crop("maize")
    result = evaluate_crop(maize, ctx)
    assert not any(e.rule_id == "R-RAIN-ABS-MIN" for e in result.exclusions)
    # capacity advisory appears instead
    assert result.notes_en


def test_farmer_ban_hard_excludes_without_data_caveat():
    ctx = _ctx(banned_crop_ids=["tomato"])
    tomato = get_crop("tomato")
    result = evaluate_crop(tomato, ctx)
    assert result.decision == "excluded"
    ban = next(e for e in result.exclusions if e.rule_id == "R-FARMER-BAN")
    assert ban.provisional_data_caveat is False


def test_temperature_extremes_are_warnings_not_exclusions():
    # Hottest month 40C is above most abs maxima; coldest 0C below some abs minima.
    ctx = _ctx(hottest_month_max_temp_c=40.0, coldest_month_min_temp_c=0.0)
    results = screen_all(ctx)
    wheat = next(r for r in results if r.crop.crop_id == "bread_wheat")
    soft_rules = [e.rule_id for e in wheat.exclusions if e.severity == "soft"]
    assert wheat.decision == "eligible"
    assert soft_rules, "expected temperature warnings for cool-season crop at extreme heat"


def test_missing_climate_observations_do_not_exclude():
    ctx = _ctx(annual_precipitation_mm=None, hottest_month_max_temp_c=None, coldest_month_min_temp_c=None)
    results = screen_all(ctx)
    excluded = [r for r in results if r.decision == "excluded"]
    assert not excluded, "no crop should be hard-excluded without observed data"
