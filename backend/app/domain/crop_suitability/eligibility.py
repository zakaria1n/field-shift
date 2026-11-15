"""Crop eligibility and suitability assessment.

Hard exclusions stay conservative: only farmer constraints and absolute-range
checks against observed climate; optimal ranges inform suitability only.
- Hard exclusions use ONLY farmer constraints and the CSV's absolute-range
  columns (temp_abs_*, rain_abs_min) against observed field climate, each
  carrying an explicit provisional-data caveat.
- General/optimal ranges produce suitability components and warnings, never
  automatic exclusion.
- Missing trait values are insufficient_data notes, never zeros.
"""
from __future__ import annotations

from dataclasses import dataclass, field as dc_field

from app.domain.crop_loader import CropTraits


@dataclass(frozen=True)
class FieldContext:
    """Climate/soil observations plus farmer profile for one field."""

    centroid_lat: float
    centroid_lon: float
    annual_precipitation_mm: float | None
    monthly_mean_temp_c: dict[str, float | None]  # JAN..DEC
    monthly_max_temp_c: dict[str, float | None]
    monthly_min_temp_c: dict[str, float | None]
    hottest_month_max_temp_c: float | None
    coldest_month_min_temp_c: float | None
    annual_mean_temp_c: float | None
    irrigation_type: str  # rainfed|irrigated|mixed|unknown
    irrigation_method: str | None
    water_availability: str | None
    banned_crop_ids: list[str] = dc_field(default_factory=list)
    purposes: list[str] = dc_field(default_factory=list)
    soil_ph: float | None = None  # None when soil estimates unavailable
    soil_ph_provenance: dict = dc_field(default_factory=dict)  # sample_mode/proxy/confidence
    monthly_mean_temp_c_filled: bool = False  # True when verified monthly means are available
    country_iso2: str | None = None


@dataclass
class ExclusionReason:
    rule_id: str
    severity: str  # hard | soft
    message_en: str
    message_ar: str
    provisional_data_caveat: bool = True


@dataclass
class CropEligibilityResult:
    crop: CropTraits
    decision: str  # eligible | excluded | insufficient_data
    exclusions: list[ExclusionReason] = dc_field(default_factory=list)
    suitability: dict[str, float | None] = dc_field(default_factory=dict)  # 0..1 components
    notes_en: list[str] = dc_field(default_factory=list)
    notes_ar: list[str] = dc_field(default_factory=list)

    @property
    def is_eligible(self) -> bool:
        return self.decision == "eligible"


def _clamp01(v: float) -> float:
    return max(0.0, min(1.0, v))


def _range_score(value: float | None, opt_min: float | None, opt_max: float | None,
                 abs_min: float | None, abs_max: float | None) -> float | None:
    """1.0 inside optimal range, decaying linearly to 0.0 at absolute bounds."""
    if value is None or (opt_min is None and opt_max is None):
        return None
    lo = opt_min if opt_min is not None else abs_min
    hi = opt_max if opt_max is not None else abs_max
    if lo is not None and value < lo:
        if abs_min is None or abs_min >= lo:
            return 0.0
        return _clamp01((value - abs_min) / (lo - abs_min))
    if hi is not None and value > hi:
        if abs_max is None or abs_max <= hi:
            return 0.0
        return _clamp01((abs_max - value) / (abs_max - hi))
    return 1.0


def evaluate_crop(crop: CropTraits, ctx: FieldContext) -> CropEligibilityResult:
    exclusions: list[ExclusionReason] = []
    notes_en: list[str] = []
    notes_ar: list[str] = []

    if crop.crop_id in ctx.banned_crop_ids:
        exclusions.append(ExclusionReason(
            rule_id="R-FARMER-BAN", severity="hard", provisional_data_caveat=False,
            message_en="Excluded by a crop restriction you declared.",
            message_ar="مستبعد بسبب قيد أعلنتَه بنفسك.",
        ))

    # Rainfed fields: below the crop's absolute minimum rain the crop cannot
    # complete its cycle without irrigation (threshold source: provisional CSV).
    if ctx.irrigation_type in ("rainfed", "unknown") and ctx.annual_precipitation_mm is not None \
            and crop.rain_abs_min_mm is not None and ctx.annual_precipitation_mm < crop.rain_abs_min_mm:
        exclusions.append(ExclusionReason(
            rule_id="R-RAIN-ABS-MIN", severity="hard",
            message_en=(
                f"Observed annual precipitation ({ctx.annual_precipitation_mm:.0f} mm) is below this crop's "
                f"absolute minimum ({crop.rain_abs_min_mm:.0f} mm) and the field is not irrigated."
            ),
            message_ar=(
                f"أمطار السنة المرصودة ({ctx.annual_precipitation_mm:.0f} مم) أقل من الحد الأدنى المطلق "
                f"لهذا المحصول ({crop.rain_abs_min_mm:.0f} مم) والأرض غير سقوية."
            ),
        ))
    elif ctx.irrigation_type == "rainfed" and ctx.annual_precipitation_mm is not None \
            and crop.rain_opt_min_mm is not None and ctx.annual_precipitation_mm < crop.rain_opt_min_mm:
        notes_en.append(
            "Optimal rain requirement not met by observed rainfall; rainfed yield expectation should be cautious."
        )
        notes_ar.append("أمطار أقل من المدى الأمثل؛ يُنصح بالحذر في توقعات المردود البوري.")

    # Temperature absolute ranges describe conditions DURING the crop's growth
    # period. Without a verified local calendar we cannot map that period to
    # specific months, so annual extremes only raise warnings (severity soft)
    # and reduce suitability — they never hard-exclude a crop.
    if ctx.hottest_month_max_temp_c is not None and crop.temp_abs_max_c is not None \
            and ctx.hottest_month_max_temp_c > crop.temp_abs_max_c:
        exclusions.append(ExclusionReason(
            rule_id="W-TEMP-ABS-MAX", severity="soft",
            message_en=(
                f"Annual hottest-month maximum ({ctx.hottest_month_max_temp_c:.0f} °C) is outside this crop's "
                f"reference growth-period tolerance ({crop.temp_abs_max_c:.0f} °C); the crop would need a "
                "season that avoids peak heat. Warning only — growth-window placement is not verified here."
            ),
            message_ar=(
                f"أقصى حرارة سنوية ({ctx.hottest_month_max_temp_c:.0f}°س) خارج مدى تحمل هذا المحصول "
                f"({crop.temp_abs_max_c:.0f}°س)؛ يحتاج موسمًا يتجنب ذروة الحرارة. تنبيه فقط دون استبعاد."
            ),
        ))
    if ctx.coldest_month_min_temp_c is not None and crop.temp_abs_min_c is not None \
            and ctx.coldest_month_min_temp_c < crop.temp_abs_min_c:
        exclusions.append(ExclusionReason(
            rule_id="W-TEMP-ABS-MIN", severity="soft",
            message_en=(
                f"Annual coldest-month minimum ({ctx.coldest_month_min_temp_c:.0f} °C) is below this crop's "
                f"reference growth-period tolerance ({crop.temp_abs_min_c:.0f} °C); frost exposure should be "
                "checked locally. Warning only — growth-window placement is not verified here."
            ),
            message_ar=(
                f"أدنى حرارة سنوية ({ctx.coldest_month_min_temp_c:.0f}°س) أقل من مدى تحمل هذا المحصول "
                f"({crop.temp_abs_min_c:.0f}°س)؛ تحقق محليًا من خطر الصقيع. تنبيه فقط دون استبعاد."
            ),
        ))

    if any(e.severity == "hard" for e in exclusions):
        decision = "excluded"
    else:
        decision = "eligible"

    suitability: dict[str, float | None] = {
        "temperature_fit": _range_score(
            ctx.annual_mean_temp_c, crop.temp_opt_min_c, crop.temp_opt_max_c,
            crop.temp_abs_min_c, crop.temp_abs_max_c,
        ),
        # Irrigated fields are not judged against rainfall; water fit stays
        # neutral-positive there and capacity concerns surface as notes.
        "water_fit": 1.0 if ctx.irrigation_type == "irrigated" else _range_score(
            ctx.annual_precipitation_mm,
            crop.rain_opt_min_mm, crop.rain_opt_max_mm, crop.rain_abs_min_mm, crop.rain_abs_max_mm,
        ),
        "soil_ph_fit": _range_score(ctx.soil_ph, crop.ph_opt_min, crop.ph_opt_max, crop.ph_abs_min, crop.ph_abs_max),
    }

    if ctx.irrigation_type in ("irrigated", "mixed") and crop.rain_opt_min_mm is not None \
            and ctx.annual_precipitation_mm is not None and ctx.annual_precipitation_mm < crop.rain_opt_min_mm * 0.7:
        notes_en.append("Crop water demand exceeds local rainfall; plan irrigation capacity accordingly.")
        notes_ar.append("احتياج المحصول المائي يتجاوز الأمطار المحلية؛ جهّز سقيًا كافيًا.")

    if ctx.soil_ph is None:
        notes_en.append("Soil pH estimate unavailable; soil fit not assessed.")
        notes_ar.append("تقدير pH التربة غير متوفر؛ لم يُقيَّم ملاءمة التربة.")
    elif ctx.soil_ph_provenance.get("proxy"):
        notes_en.append(
            "Soil pH is a nearby-proxy estimate (sampled outside the drawn "
            "polygon): it informs suitability as soft context only and is "
            "never used as a hard constraint."
        )
        notes_ar.append(
            "قيمة pH التربة تقدير من جوار الأرض (خارج الحدود المرسومة): "
            "تُستخدم كمؤشر سياقي فقط وليست قيدًا صارمًا."
        )

    if crop.is_provisional_data:
        notes_en.append("Trait ranges come from the team's provisional reference table and are not independently validated.")
        notes_ar.append("مصدر مدى الصفات هو الجدول المبدئي للفريق ولم يُتحقق منه بشكل مستقل.")

    return CropEligibilityResult(
        crop=crop, decision=decision, exclusions=exclusions,
        suitability=suitability, notes_en=notes_en, notes_ar=notes_ar,
    )


def screen_all(ctx: FieldContext, crops: list[CropTraits] | None = None) -> list[CropEligibilityResult]:
    crops = crops if crops is not None else list(_catalog_values())
    return [evaluate_crop(c, ctx) for c in crops]


def _catalog_values():
    from app.domain.crop_loader import all_crops
    return all_crops()
