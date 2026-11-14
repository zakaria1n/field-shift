"""History assessment, sequence validation, scoring and generation tests."""
from app.domain.crop_rotation.generator import generate_candidates
from app.domain.crop_rotation.history import HistorySeason, assess_history
from app.domain.crop_rotation.modification import apply_edits, evaluate_sequence
from app.domain.crop_rotation.validator import SlotPlan, validate_sequence
from app.domain.crop_suitability.eligibility import FieldContext, screen_all
from app.domain.scoring.engine import score_rotation


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


def _history(*crops):
    years = (2024, 2025, 2026)
    entries = []
    for year, crop in zip(years, crops):
        if crop == "unknown":
            entries.append(HistorySeason(year, None, None, "unknown"))
        elif crop == "fallow":
            entries.append(HistorySeason(year, None, None, "fallow"))
        else:
            entries.append(HistorySeason(year, None, crop, "planted"))
    return assess_history(entries)


def test_history_detects_cereal_dominance():
    hist = _history("bread_wheat", "durum_wheat", "barley")
    assert hist.all_cereal_history
    assert "R-HIST-CEREAL-DOMINANT" in hist.rule_ids


def test_history_unknown_is_partial_coverage():
    hist = _history("bread_wheat", "unknown", "barley")
    assert hist.coverage != "full"
    assert not hist.enough_for_baseline


def test_validator_hard_rules():
    slots = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, "bread_wheat"), SlotPlan("y3", 3, "barley")]
    violations = validate_sequence(slots)
    assert any(v.rule_id == "V-CONSEC-SAME-CROP" and v.severity == "hard" for v in violations)

    slots = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, "durum_wheat"), SlotPlan("y3", 3, "barley")]
    violations = validate_sequence(slots)
    assert any(v.rule_id == "V-GROUP-MAX" and v.severity == "hard" for v in violations), "3 cereals must fail"

    slots = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, "faba_bean"), SlotPlan("y3", 3, "barley")]
    violations = validate_sequence(slots)
    assert not any(v.severity == "hard" for v in violations), "wheat-faba-barley is valid"


def test_validator_fallow_limit():
    slots = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, None), SlotPlan("y3", 3, None)]
    violations = validate_sequence(slots)
    assert any(v.rule_id == "V-FALLOW-MAX" for v in violations)


def test_validator_duplicate_crop():
    slots = [SlotPlan("y1", 1, "onion"), SlotPlan("y2", 2, "faba_bean"), SlotPlan("y3", 3, "onion")]
    violations = validate_sequence(slots)
    assert any(v.rule_id == "V-DUP-CROP" for v in violations)


def test_scoring_redistributes_unavailable_yield():
    slots = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, "faba_bean"), SlotPlan("y3", 3, "barley")]
    ctx = _ctx()
    hist = _history("bread_wheat", "durum_wheat", "barley")
    priorities = {"water": 20, "soil": 20, "yield": 50, "risk": 10}
    score = score_rotation(slots, ctx, priorities, hist, yield_refs={})
    assert score.indicator_status["yield"] == "unavailable"
    assert "yield" not in score.weights_applied
    assert abs(sum(score.weights_applied.values()) - 1.0) < 1e-6
    assert score.total is not None
    assert score.redistribution_note and "yield" in score.redistribution_note


def test_scoring_is_deterministic():
    slots = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, "faba_bean"), SlotPlan("y3", 3, "barley")]
    ctx = _ctx()
    hist = _history("bread_wheat", "durum_wheat", "barley")
    p = {"water": 30, "soil": 40, "yield": 10, "risk": 20}
    s1 = score_rotation(slots, ctx, p, hist, yield_refs={})
    s2 = score_rotation(slots, ctx, p, hist, yield_refs={})
    assert s1.total == s2.total
    # weights shift the outcome
    s3 = score_rotation(slots, ctx, {"water": 90, "soil": 5, "yield": 2, "risk": 3}, hist, yield_refs={})
    assert s3.total != s1.total


def test_generator_three_distinct_plans():
    ctx = _ctx()
    results = screen_all(ctx)
    eligible = [r for r in results if r.is_eligible]
    hist = _history("bread_wheat", "durum_wheat", "barley")
    candidates, note = generate_candidates(ctx, eligible, {"water": 25, "soil": 40, "yield": 15, "risk": 20}, hist)
    assert len(candidates) == 3
    assert note is None
    compositions = [frozenset(s.crop_id or "fallow" for s in c.slots) for c in candidates]
    assert len(set(compositions)) == 3, "plans must differ in composition"
    totals = [c.score.total for c in candidates]
    assert totals == sorted(totals, reverse=True)


def test_generator_respects_banned_crops():
    ctx = _ctx(banned_crop_ids=["onion", "barley"])
    results = screen_all(ctx)
    eligible = [r for r in results if r.is_eligible]
    hist = _history("bread_wheat", "durum_wheat", "barley")
    candidates, _ = generate_candidates(ctx, eligible, {"water": 25, "soil": 40, "yield": 15, "risk": 20}, hist)
    used = {s.crop_id for c in candidates for s in c.slots}
    assert "onion" not in used and "barley" not in used


def test_apply_edits_does_not_mutate_base():
    base = [SlotPlan("y1", 1, "bread_wheat"), SlotPlan("y2", 2, "faba_bean"), SlotPlan("y3", 3, "barley")]
    modified = apply_edits(base, [{"slot_id": "y1", "crop_id": "onion"}])
    assert base[0].crop_id == "bread_wheat"
    assert modified[0].crop_id == "onion"


def test_evaluate_sequence_reports_infeasible_on_hard_conflict():
    ctx = _ctx()
    hist = _history("bread_wheat", "durum_wheat", "barley")
    slots = [SlotPlan("y1", 1, "onion"), SlotPlan("y2", 2, "faba_bean"), SlotPlan("y3", 3, "onion")]
    result = evaluate_sequence(slots, ctx, {"water": 25, "soil": 40, "yield": 15, "risk": 20}, hist)
    assert result.feasibility == "infeasible"
    assert any(v.rule_id == "V-DUP-CROP" for v in result.conflicts)
