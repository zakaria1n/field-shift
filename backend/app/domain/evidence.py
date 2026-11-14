"""Evidence assembly for rotations: rule ids, observations, sources, gaps."""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field

from app.domain.crop_rotation.history import RotationHistoryProfile
from app.domain.crop_rotation.validator import SlotPlan, Violation
from app.domain.crop_suitability.eligibility import CropEligibilityResult
from app.domain.scoring.engine import RotationScore

PROVISIONAL_NOTE_EN = (
    "Crop trait ranges come from the team's provisional reference table "
    "(agronomic_review_status=unverified_team_reference); exclusions and scores "
    "using them carry this uncertainty."
)
PROVISIONAL_NOTE_AR = (
    "مدى صفات المحاصيل مصدرها الجدول المبدئي للفريق (unverified_team_reference)؛ "
    "الاستبعادات والنتائج المعتمدة عليه تحمل هذا الارتياب."
)


@dataclass
class Evidence:
    rule_ids: list[str] = dc_field(default_factory=list)
    observation_ids: list[str] = dc_field(default_factory=list)
    source_ids: list[str] = dc_field(default_factory=list)
    notes_en: list[str] = dc_field(default_factory=list)
    notes_ar: list[str] = dc_field(default_factory=list)
    missing_information: list[str] = dc_field(default_factory=list)
    provisional_data_used: bool = False


def build_evidence(
    slots: list[SlotPlan],
    score: RotationScore,
    violations: list[Violation],
    eligible_by_crop: dict[str, CropEligibilityResult],
    history: RotationHistoryProfile,
    observation_ids: list[str],
    available_source_ids: list[str],
) -> Evidence:
    ev = Evidence(
        rule_ids=sorted(set(score.rule_ids)),
        observation_ids=list(observation_ids),
        source_ids=sorted(set(available_source_ids)),
    )

    for v in violations:
        ev.rule_ids.append(v.rule_id)

    for slot in slots:
        if slot.crop_id:
            res = eligible_by_crop.get(slot.crop_id)
            if res:
                for note in res.notes_en:
                    if note not in ev.notes_en:
                        ev.notes_en.append(note)
                for note in res.notes_ar:
                    if note not in ev.notes_ar:
                        ev.notes_ar.append(note)
                if res.crop.is_provisional_data:
                    ev.provisional_data_used = True
                if res.suitability.get("soil_ph_fit") is None:
                    ev.missing_information.append("soil_ph_estimate")

    if score.indicator_status.get("yield") == "unavailable":
        ev.missing_information.append("yield_reference_gaez")
        ev.notes_en.append(
            "Yield reference is unavailable (no verified GAEZ layer in this deployment); "
            "its scoring weight was redistributed. No yield number is shown rather than an invented one."
        )
        ev.notes_ar.append(
            "مرجع المردودية غير متوفر (لا طبقة GAEZ موثقة في هذا النشر)؛ "
            "أُعيد توزيع وزنه في التنقيط. لا رقم مردودية يُعرض بدلًا من اختراعه."
        )
    if score.indicator_status.get("water") == "unavailable":
        ev.missing_information.append("climate_observation")
    if score.redistribution_note:
        ev.notes_en.append(score.redistribution_note)
        ev.notes_ar.append("أُعيد توزيع أوزان المؤشرات غير المتوفرة على المؤشرات المتاحة.")

    if history.coverage != "full":
        ev.missing_information.append("crop_history_full_coverage")

    if ev.provisional_data_used:
        ev.notes_en.append(PROVISIONAL_NOTE_EN)
        ev.notes_ar.append(PROVISIONAL_NOTE_AR)

    ev.rule_ids = sorted(set(ev.rule_ids))
    return ev
