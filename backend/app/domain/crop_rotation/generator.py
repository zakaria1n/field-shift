"""Rotation candidate generation and diversity-aware top-3 selection.

Exhaustive enumeration over the eligible pool (bounded), whole-sequence
validation, fresh scoring, then three meaningfully different picks: the best
overall plan plus the best plans that differ in first-year crop / composition.
Fewer than three candidates is a legitimate outcome and is explained, never
padded with fabricated options.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field
from itertools import product
from typing import Any

from app.domain.crop_loader import get_crop
from app.domain.crop_rotation.history import RotationHistoryProfile
from app.domain.crop_rotation.validator import FALLOW_SLOT, SlotPlan, Violation, has_hard_violation, validate_sequence
from app.domain.crop_suitability.eligibility import CropEligibilityResult, FieldContext
from app.domain.scoring.engine import RotationScore, score_rotation

HORIZON_YEARS = 3
MAX_POOL = 14


@dataclass
class RotationCandidate:
    slots: list[SlotPlan]
    score: RotationScore
    violations: list[Violation] = dc_field(default_factory=list)
    summary_en: str = ""
    summary_ar: str = ""
    main_limitation_en: str | None = None
    main_limitation_ar: str | None = None
    signature: tuple = ()

    def crop_signature(self) -> tuple:
        return tuple(s.crop_id for s in self.slots)


def _slot_summaries(slots: list[SlotPlan]) -> tuple[list[str], list[str]]:
    en, ar = [], []
    for s in slots:
        if s.is_fallow:
            en.append(f"Year {s.year_number}: fallow / cover period")
            ar.append(f"السنة {s.year_number}: راحة / تغطية")
        else:
            crop = get_crop(s.crop_id or "")
            en.append(f"Year {s.year_number}: {crop.name_en if crop else s.crop_id}")
            ar.append(f"السنة {s.year_number}: {crop.name_ar if crop else s.crop_id}")
    return en, ar


def _describe(cand: RotationCandidate, ctx: FieldContext, history: RotationHistoryProfile) -> RotationCandidate:
    en_parts, ar_parts = _slot_summaries(cand.slots)
    ind = cand.score.indicators

    drivers_en: list[str] = []
    drivers_ar: list[str] = []
    if "R-SOIL-LEGUME-HINT" in cand.score.rule_ids:
        drivers_en.append("includes a legume phase in the rotation")
        drivers_ar.append("يتضمن مرحلة بقوليات في الدورة")
    if "R-SOIL-BREAK-MONOCULTURE" in cand.score.rule_ids:
        drivers_en.append("breaks your cereal-heavy recent history")
        drivers_ar.append("يكسر هيمنة الحبوب في تاريخك الأخير")
    if "R-SOIL-FAMILY-DIVERSITY" in cand.score.rule_ids and ind.get("soil", 0) and ind["soil"] >= 0.7:
        drivers_en.append("high crop-family diversity across years")
        drivers_ar.append("تنوع عالٍ لمجموعات المحاصيل بين السنوات")
    if "R-WATER-RAINFED-RATIO" in cand.score.rule_ids and (ind.get("water") or 0) >= 0.7:
        drivers_en.append("water demand matches observed rainfall")
        drivers_ar.append("الاحتياج المائي يوافق الأمطار المرصودة")
    if "R-WATER-IRRIGATED-EFFICIENCY" in cand.score.rule_ids and (ind.get("water") or 0) >= 0.7:
        drivers_en.append("water demand fits your irrigation capacity")
        drivers_ar.append("الاحتياج المائي يوافق طاقة سقيك")
    if "R-WATER-FALLOW" in cand.score.rule_ids and "soil_restoration" in ctx.purposes:
        drivers_en.append("includes a rest period supporting soil restoration")
        drivers_ar.append("يتضمن فترة راحة تدعم استصلاح التربة")

    cand.summary_en = (
        "Three-year sequence — " + "; ".join(en_parts)
        + (". Chosen because it " + " and ".join(drivers_en[:2]) + "." if drivers_en else ".")
    )
    cand.summary_ar = (
        "دورة من ثلاث سنوات — " + "؛ ".join(ar_parts)
        + ("." + (" مختارة لأنها " + " و".join(drivers_ar[:2]) + ".") if drivers_ar else "")
    )

    # Main limitation: strongest soft warning or weakest indicator.
    soft = [v for v in cand.violations if v.severity == "soft"]
    if soft:
        cand.main_limitation_en = soft[0].message_en
        cand.main_limitation_ar = soft[0].message_ar
    else:
        weakest = min(
            (k for k in ("water", "soil", "risk", "yield") if ind.get(k) is not None),
            key=lambda k: ind[k],
            default=None,
        )
        labels_en = {"water": "water fit", "soil": "rotation health", "risk": "climate resilience", "yield": "yield reference"}
        labels_ar = {"water": "ملاءمة المياه", "soil": "صحة الدورة", "risk": "الصمود المناخي", "yield": "مرجع المردودية"}
        if weakest and ind[weakest] is not None and ind[weakest] < 0.6:
            cand.main_limitation_en = f"Relative weakness: {labels_en[weakest]} ({ind[weakest]:.2f} normalized reference)."
            cand.main_limitation_ar = f"نقطة ضعف نسبية: {labels_ar[weakest]} ({ind[weakest]:.2f} مرجع معياري)."
    return cand


def generate_candidates(
    ctx: FieldContext,
    eligible: list[CropEligibilityResult],
    priorities: dict[str, int],
    history: RotationHistoryProfile,
    yield_refs: dict[str, float | None] | None = None,
    monthly_precip: dict[str, float | None] | None = None,
    horizon_years: int = HORIZON_YEARS,
) -> tuple[list[RotationCandidate], str | None]:
    """Return ranked, distinct candidates plus an insufficiency note (or None)."""
    pool = sorted(
        (r for r in eligible if r.is_eligible),
        key=lambda r: -(sum(v for v in r.suitability.values() if v is not None) / max(1, len(r.suitability))),
    )[:MAX_POOL]
    if not pool:
        return [], "No eligible crops for this field after hard constraints; rotation generation is not possible."

    choices: list[str | None] = [r.crop.crop_id for r in pool]
    allow_fallow = "soil_restoration" in ctx.purposes or bool(history.has_fallow_history)
    if allow_fallow:
        choices.append(None)  # one fallow/cover slot per plan keeps sequences meaningful

    scored: list[RotationCandidate] = []
    for combo in product(choices, repeat=horizon_years):
        slots = [SlotPlan(f"y{i+1}", i + 1, cid) for i, cid in enumerate(combo)]
        violations = validate_sequence(slots)
        if has_hard_violation(violations):
            continue
        score = score_rotation(slots, ctx, priorities, history, yield_refs, monthly_precip, list(ctx.purposes))
        scored.append(RotationCandidate(
            slots=slots, score=score, violations=violations,
            signature=combo,
        ))

    if not scored:
        return [], "Eligible crops exist but no full rotation satisfies the sequence constraints."

    scored.sort(key=lambda c: (-(c.score.total if c.score.total is not None else -1),
                               "|".join(s.crop_id or "fallow" for s in c.slots)))

    def composition(c: RotationCandidate) -> frozenset[str]:
        return frozenset(s.crop_id or "fallow" for s in c.slots)

    # Meaningfully different plans: distinct crop compositions, best first.
    selected: list[RotationCandidate] = []
    used_compositions: set[frozenset[str]] = set()
    for cand in scored:
        comp = composition(cand)
        if comp in used_compositions:
            continue
        selected.append(cand)
        used_compositions.add(comp)
        if len(selected) == 3:
            break

    selected = [_describe(c, ctx, history) for c in selected]
    note = None
    if len(selected) < 3:
        note = (
            f"Only {len(selected)} distinct rotation composition(s) satisfy the field constraints; "
            "fewer options are shown rather than fabricated ones."
        )
    return selected, note
