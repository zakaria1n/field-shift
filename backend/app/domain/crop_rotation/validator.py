"""Rotation sequence constraints (whole-sequence validation).

Rules are explicit, bounded and auditable; each carries a rule id surfaced in
the UI:
- V-CONSEC-SAME-CROP (hard): the same crop cannot occupy consecutive years.
- V-GROUP-CONSEC (soft): consecutive years from the same rotation group are
  penalized in scoring, not forbidden (e.g. wheat -> barley remains possible).
- V-GROUP-MAX (hard): more than two of three years in one rotation group is
  rejected as family buildup.
- V-DUP-CROP (hard): a crop appears at most once in the plan horizon.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field

from app.domain.crop_loader import get_crop
from app.domain.crop_rotation.history import _group_kind

FALLOW_SLOT = "fallow"


@dataclass
class SlotPlan:
    slot_id: str
    year_number: int
    crop_id: str | None = None  # None => fallow / cover period

    @property
    def is_fallow(self) -> bool:
        return self.crop_id is None

    def group(self) -> str | None:
        if self.is_fallow:
            return "fallow"
        crop = get_crop(self.crop_id or "")
        return _group_kind(crop.rotation_group) if crop else None


@dataclass
class Violation:
    rule_id: str
    severity: str  # hard | soft
    message_en: str
    message_ar: str
    slot_ids: list[str] = dc_field(default_factory=list)


def validate_sequence(slots: list[SlotPlan]) -> list[Violation]:
    violations: list[Violation] = []
    n = len(slots)

    for i in range(1, n):
        a, b = slots[i - 1], slots[i]
        if not a.is_fallow and not b.is_fallow and a.crop_id == b.crop_id:
            violations.append(Violation(
                rule_id="V-CONSEC-SAME-CROP", severity="hard", slot_ids=[a.slot_id, b.slot_id],
                message_en=f"{a.crop_id} cannot repeat in consecutive years (years {a.year_number} and {b.year_number}).",
                message_ar=f"لا يمكن تكرار {a.crop_id} في سنتين متتاليتين (السنة {a.year_number} و{b.year_number}).",
            ))

    groups = [(s.group(), s) for s in slots]
    for i in range(1, n):
        g_a, s_a = groups[i - 1]
        g_b, s_b = groups[i]
        if g_a and g_a == g_b and g_a not in ("fallow",) :
            violations.append(Violation(
                rule_id="V-GROUP-CONSEC", severity="soft", slot_ids=[s_a.slot_id, s_b.slot_id],
                message_en=(
                    f"Years {s_a.year_number} and {s_b.year_number} come from the same crop family group "
                    f"({g_a}); a break crop between them is usually healthier for the soil."
                ),
                message_ar=(
                    f"السنتان {s_a.year_number} و{s_b.year_number} من نفس مجموعة العائلة ({g_a})؛ "
                    "محصول فاصل بينهما أفضل عادة لصحة التربة."
                ),
            ))

    counts: dict[str, list[SlotPlan]] = {}
    for s in slots:
        g = s.group()
        if g and g != "fallow":
            counts.setdefault(g, []).append(s)
    for g, group_slots in counts.items():
        if len(group_slots) > 2:
            violations.append(Violation(
                rule_id="V-GROUP-MAX", severity="hard",
                slot_ids=[s.slot_id for s in group_slots],
                message_en=(
                    f"The plan uses the '{g}' family group in {len(group_slots)} of {n} years, "
                    "which builds up family-specific pests and diseases."
                ),
                message_ar=(
                    f"الخطة تستخدم مجموعة '{g}' في {len(group_slots)} من {n} سنوات، "
                    "وهذا يراكم آفات وأمراضًا خاصة بالعائلة."
                ),
            ))

    seen: dict[str, SlotPlan] = {}
    for s in slots:
        if s.crop_id:
            if s.crop_id in seen:
                violations.append(Violation(
                    rule_id="V-DUP-CROP", severity="hard", slot_ids=[seen[s.crop_id].slot_id, s.slot_id],
                    message_en=f"{s.crop_id} appears more than once within the plan horizon.",
                    message_ar=f"يظهر {s.crop_id} أكثر من مرة داخل أفق الخطة.",
                ))
            else:
                seen[s.crop_id] = s

    return violations


def has_hard_violation(violations: list[Violation]) -> bool:
    return any(v.severity == "hard" for v in violations)
