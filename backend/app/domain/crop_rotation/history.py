"""Rotation history assessment: qualitative signals from the last three years.

Family repetition, fallow presence and coverage are treated as qualitative
hints. No soil-nitrogen quantities are inferred from crop names.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field

from app.domain.crop_loader import get_crop


@dataclass
class HistorySeason:
    crop_year: int
    season_label: str | None
    crop_id: str | None
    status: str  # planted | fallow | unknown


@dataclass
class RotationHistoryProfile:
    years_covered: list[int] = dc_field(default_factory=list)
    family_sequence: list[str | None] = dc_field(default_factory=list)  # per year, primary crop group
    crops_seen: list[str] = dc_field(default_factory=list)
    all_cereal_history: bool = False
    consecutive_same_family_years: int = 0
    has_legume_history: bool = False
    has_fallow_history: bool = False
    unknown_years: int = 0
    coverage: str = "unknown"  # full | partial | unknown
    notes_en: list[str] = dc_field(default_factory=list)
    notes_ar: list[str] = dc_field(default_factory=list)
    rule_ids: list[str] = dc_field(default_factory=list)

    @property
    def enough_for_baseline(self) -> bool:
        return self.coverage == "full"


def assess_history(seasons: list[HistorySeason]) -> RotationHistoryProfile:
    profile = RotationHistoryProfile()
    if not seasons:
        profile.coverage = "unknown"
        profile.notes_en.append("No crop history provided.")
        profile.notes_ar.append("لم يتم تقديم أي تاريخ زراعي.")
        return profile

    by_year: dict[int, list[HistorySeason]] = {}
    for s in seasons:
        by_year.setdefault(s.crop_year, []).append(s)

    years = sorted(by_year)
    profile.years_covered = years
    primary_family_by_year: list[str | None] = []

    for year in years:
        entries = by_year[year]
        planted = [e for e in entries if e.status == "planted" and e.crop_id]
        fallow = [e for e in entries if e.status == "fallow"]
        unknown = [e for e in entries if e.status == "unknown"]
        if unknown and not planted:
            profile.unknown_years += 1
            primary_family_by_year.append(None)
            continue
        for e in planted:
            crop = get_crop(e.crop_id or "")
            if crop is not None:
                if crop.crop_id not in profile.crops_seen:
                    profile.crops_seen.append(crop.crop_id)
                if crop.rotation_group and "legume" in (crop.rotation_group or ""):
                    profile.has_legume_history = True
        if fallow:
            profile.has_fallow_history = True
        # primary family = family of the first planted entry that year
        for e in planted:
            crop = get_crop(e.crop_id or "")
            if crop is not None:
                primary_family_by_year.append(_group_kind(crop.rotation_group))
                break
        else:
            primary_family_by_year.append("fallow" if fallow else None)

    known = [f for f in primary_family_by_year if f is not None and f != "fallow"]
    profile.family_sequence = primary_family_by_year

    if len(known) == len([f for f in primary_family_by_year if f != "fallow"]):
        full = all(f is not None for f in primary_family_by_year)
        profile.coverage = "full" if (full and len(primary_family_by_year) >= 2) else "partial"
    else:
        profile.coverage = "partial" if known else "unknown"

    run = 1
    best_run = 0
    for i in range(1, len(primary_family_by_year)):
        a, b = primary_family_by_year[i - 1], primary_family_by_year[i]
        if a is not None and a == b and a != "fallow":
            run += 1
            best_run = max(best_run, run)
        else:
            run = 1
    profile.consecutive_same_family_years = best_run

    cereal_kinds = {"cereal"}
    planted_groups = [_group_kind(get_crop(c).rotation_group) for c in profile.crops_seen if get_crop(c)]
    profile.all_cereal_history = bool(planted_groups) and all(g in cereal_kinds for g in planted_groups)

    if profile.all_cereal_history:
        profile.notes_en.append("Recent history is cereal-dominant; diversification potential exists.")
        profile.notes_ar.append("التاريخ الأخير يغلب عليه الحبوب؛ توجد إمكانية للتنويع.")
        profile.rule_ids.append("R-HIST-CEREAL-DOMINANT")
    if profile.has_legume_history:
        profile.rule_ids.append("R-HIST-LEGUME-PRESENT")
    if profile.unknown_years or profile.coverage != "full":
        profile.notes_en.append("History is incomplete; baseline comparison is limited.")
        profile.notes_ar.append("التاريخ غير مكتمل؛ المقارنة مع الممارسة الحالية محدودة.")
        profile.rule_ids.append("R-HIST-COVERAGE-PARTIAL")

    return profile


def _group_kind(rotation_group: str | None) -> str | None:
    """Coarse family kind from the rotation_group label."""
    if not rotation_group:
        return None
    g = rotation_group.lower()
    if "legume" in g:
        return "legume"
    if "cereal" in g or "pseudo" in g:
        return "cereal"
    if "brassica" in g:
        return "brassica"
    if "solanaceae" in g:
        return "solanaceae"
    if "cucurbit" in g:
        return "cucurbit"
    if "allium" in g:
        return "allium"
    if "beet" in g or "chenopodiaceae" in g:
        return "chenopod"
    if "leafy" in g or "compositae" in g:
        return "compositae"
    if "umbellifer" in g:
        return "umbellifer"
    if "oil" in g:
        return "oilseed"
    if "root" in g:
        return "root"
    return g.split("(")[0].strip() or rotation_group
