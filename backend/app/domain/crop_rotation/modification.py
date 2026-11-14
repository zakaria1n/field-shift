"""Evaluation of modified rotations and substitute eligibility.

Every modification re-runs the full sequence validation and scoring from
scratch (no cached score reuse). The original plan stays untouched until the
farmer explicitly adopts a version.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field

from app.domain.crop_loader import get_crop
from app.domain.crop_rotation.generator import RotationCandidate
from app.domain.crop_rotation.history import RotationHistoryProfile
from app.domain.crop_rotation.validator import FALLOW_SLOT, SlotPlan, Violation, has_hard_violation, validate_sequence
from app.domain.crop_suitability.eligibility import CropEligibilityResult, FieldContext
from app.domain.scoring.engine import (
    INDICATOR_META,
    SIMILAR_INDICATOR_TOLERANCE,
    SIMILAR_TOTAL_TOLERANCE,
    RotationScore,
    score_rotation,
)


@dataclass
class EvaluationResult:
    feasibility: str  # feasible | needs_review | infeasible
    conflicts: list[Violation] = dc_field(default_factory=list)
    score: RotationScore | None = None
    notes_en: list[str] = dc_field(default_factory=list)
    notes_ar: list[str] = dc_field(default_factory=list)


def apply_edits(base_slots: list[SlotPlan], edits: list[dict]) -> list[SlotPlan]:
    """Return a NEW slot list with edits applied; base list is never mutated."""
    by_id = {s.slot_id: s for s in base_slots}
    out: list[SlotPlan] = []
    for slot in base_slots:
        out.append(SlotPlan(slot.slot_id, slot.year_number, slot.crop_id))
    for edit in edits:
        slot = by_id.get(edit["slot_id"])
        if slot is None:
            continue
        crop_id = edit.get("crop_id")
        if crop_id == FALLOW_SLOT:
            crop_id = None
        for s in out:
            if s.slot_id == slot.slot_id:
                s.crop_id = crop_id
    return out


def evaluate_sequence(
    slots: list[SlotPlan],
    ctx: FieldContext,
    priorities: dict[str, int],
    history: RotationHistoryProfile,
    yield_refs: dict[str, float | None] | None = None,
    monthly_precip: dict[str, float | None] | None = None,
    eligible_by_crop: dict[str, CropEligibilityResult] | None = None,
) -> EvaluationResult:
    eligible_by_crop = eligible_by_crop or {}
    violations = validate_sequence(slots)

    # Field-level feasibility for any non-fallow slot crop not in the eligible
    # set (e.g. hand-typed edits): it must at least not be hard-excluded.
    for slot in slots:
        if not slot.crop_id:
            continue
        res = eligible_by_crop.get(slot.crop_id)
        if res is not None and not res.is_eligible:
            for reason in res.exclusions:
                if reason.severity == "hard":
                    violations.append(Violation(
                        rule_id=reason.rule_id, severity="hard", slot_ids=[slot.slot_id],
                        message_en=f"{slot.crop_id}: {reason.message_en}",
                        message_ar=f"{slot.crop_id}: {reason.message_ar}",
                    ))

    feasibility = "feasible"
    if has_hard_violation(violations):
        feasibility = "infeasible"
    elif any(v.severity == "soft" for v in violations):
        feasibility = "needs_review"

    score = score_rotation(slots, ctx, priorities, history, yield_refs, monthly_precip)
    notes_en: list[str] = []
    notes_ar: list[str] = []
    if feasibility == "infeasible":
        notes_en.append("The modified sequence violates hard constraints; show the conflicts before any adoption.")
        notes_ar.append("التسلسل المعدل يخالف قيودًا صارمة؛ اعرض التعارضات قبل أي اعتماد.")

    return EvaluationResult(
        feasibility=feasibility, conflicts=violations, score=score,
        notes_en=notes_en, notes_ar=notes_ar,
    )


def compare_scores(before: RotationScore, after: RotationScore) -> list[dict]:
    """Indicator-by-indicator comparison; unknown when either side lacks data."""
    rows: list[dict] = []
    for meta in INDICATOR_META:
        key = meta["key"]
        b, a = before.indicators.get(key), after.indicators.get(key)
        if b is None and a is None:
            rows.append({
                "indicator": key, "label_en": meta["label_en"], "label_ar": meta["label_ar"],
                "original_value": None, "modified_value": None, "delta": None,
                "status": "unknown",
                "note_en": "Indicator unavailable on both versions.", "note_ar": "المؤشر غير متوفر في النسختين.",
            })
        elif b is None or a is None:
            side = "original" if b is None else "modified"
            rows.append({
                "indicator": key, "label_en": meta["label_en"], "label_ar": meta["label_ar"],
                "original_value": b, "modified_value": a, "delta": None,
                "status": "unknown",
                "note_en": f"Unavailable in the {side} version; no delta is computed.",
                "note_ar": ("غير متوفر في النسخة الأصلية" if side == "original" else "غير متوفر في النسخة المعدلة")
                           + "؛ لا يُحسب فرق.",
            })
        else:
            delta = round(a - b, 4)
            rows.append({
                "indicator": key, "label_en": meta["label_en"], "label_ar": meta["label_ar"],
                "original_value": round(b, 4), "modified_value": round(a, 4), "delta": delta,
                "status": "changed" if abs(delta) > 1e-9 else "unchanged",
                "note_en": None, "note_ar": None,
            })
    return rows


def substitute_candidates(
    base: RotationCandidate,
    slot_id: str,
    eligible: list[CropEligibilityResult],
    ctx: FieldContext,
    priorities: dict[str, int],
    history: RotationHistoryProfile,
    yield_refs: dict[str, float | None] | None,
    monthly_precip: dict[str, float | None] | None,
) -> list[dict]:
    """Eligible replacements for one slot; only whole-sequence-feasible crops.

    `similar_impact` is set only after re-evaluating the full rotation with the
    candidate in place and confirming documented tolerances hold.
    """
    others = {s.crop_id for s in base.slots if s.slot_id != slot_id}
    current = next((s.crop_id for s in base.slots if s.slot_id == slot_id), None)
    others.add(current)  # keeping the current crop is not a substitution
    candidates: list[dict] = []
    for res in eligible:
        cid = res.crop.crop_id
        if cid in others:
            # Already present in another slot; duplicate-crop rule would reject it.
            continue
        modified = [
            SlotPlan(s.slot_id, s.year_number, cid if s.slot_id == slot_id else s.crop_id)
            for s in base.slots
        ]
        evaluation = evaluate_sequence(modified, ctx, priorities, history, yield_refs, monthly_precip)
        if evaluation.feasibility == "infeasible":
            continue

        similar = False
        similarity_note = None
        if base.score.total is not None and evaluation.score.total is not None \
                and base.score.indicator_status.get("yield") != "unavailable" \
                and evaluation.score.indicator_status.get("yield") != "unavailable":
            total_delta = abs(evaluation.score.total - base.score.total)
            max_indicator_delta = max(
                abs((evaluation.score.indicators.get(k) or 0.0) - (base.score.indicators.get(k) or 0.0))
                for k in ("water", "soil", "yield", "risk")
            )
            if total_delta <= SIMILAR_TOTAL_TOLERANCE and max_indicator_delta <= SIMILAR_INDICATOR_TOLERANCE:
                similar = True
                similarity_note = (
                    "Re-evaluating the whole rotation shows indicator differences within documented "
                    "tolerance; the crops are still not identical."
                )

        why: list[str] = []
        if res.suitability.get("water_fit") is not None and res.suitability["water_fit"] >= 0.5:
            why.append("water demand compatible with this field")
        if res.crop.fixes_nitrogen:
            why.append("nitrogen-fixing trait (qualitative rotation hint)")
        if not any(v.rule_id == "V-GROUP-CONSEC" for v in evaluation.conflicts):
            why.append("no family-group conflict with neighbouring years")

        current = next((s.crop_id for s in base.slots if s.slot_id == slot_id), None)
        current_crop = get_crop(current) if current else None
        same_group = current_crop and _same_group(current_crop.rotation_group, res.crop.rotation_group)
        if same_group:
            why.append("same crop family group as the current slot crop")

        candidates.append({
            "crop_id": cid,
            "name_en": res.crop.name_en,
            "name_ar": res.crop.name_ar,
            "rotation_group": res.crop.rotation_group,
            "why_available": why,
            "similar_impact": similar,
            "similarity_note": similarity_note,
        })
    return candidates


def _same_group(a: str | None, b: str | None) -> bool:
    from app.domain.crop_rotation.history import _group_kind
    if not a or not b:
        return False
    return _group_kind(a) == _group_kind(b)
