"""Location-specific crop calendar loader.

The shipped CSV (crop_calendar_by_zone_EMPTY_TEMPLATE.csv) intentionally holds
ZERO rows — the project forbids fabricated global planting months. This loader
ingests verified rows only: rows with review_status not in an accepted set, or
is_active=False, are rejected at load time and reported. Matching a location
requires the country (ISO2) of the field; without it, calendars stay
`calendar_unavailable` and the UI shows no planting windows.
"""
import csv
import logging
from dataclasses import dataclass

from app.config import get_settings

log = logging.getLogger("fieldshift.calendar")

ACCEPTED_REVIEW_STATUS = {"reviewed", "verified_source"}

REQUIRED_COLUMNS = [
    "calendar_rule_id", "country_iso2", "agroecological_zone_id", "crop_id",
    "cropping_system", "irrigation_type", "planting_start_month",
    "planting_end_month", "harvest_start_month", "harvest_end_month",
    "hemisphere", "source_name", "source_url", "source_year", "review_status",
    "notes",
]


@dataclass(frozen=True)
class CalendarRule:
    calendar_rule_id: str
    country_iso2: str
    agroecological_zone_id: str | None
    crop_id: str
    cropping_system: str | None
    irrigation_type: str | None
    planting_start_month: int
    planting_end_month: int
    harvest_start_month: int
    harvest_end_month: int
    hemisphere: str | None
    source_name: str | None
    source_url: str | None
    source_year: str | None
    review_status: str
    notes: str | None


class CropCalendarStore:
    def __init__(self) -> None:
        self.rules: list[CalendarRule] = []
        self.rejected_rows: int = 0
        self.loaded: bool = False

    def load(self, path=None) -> "CropCalendarStore":
        settings = get_settings()
        path = path or settings.crop_calendar_csv
        if not path.exists():
            log.warning("crop calendar CSV missing: %s", path)
            self.loaded = True
            return self
        with open(path, newline="", encoding="utf-8-sig") as fh:
            reader = csv.DictReader(fh)
            missing = [c for c in REQUIRED_COLUMNS if c not in (reader.fieldnames or [])]
            if missing:
                log.error("calendar CSV missing columns %s; ignoring file", missing)
                self.loaded = True
                return self
            for row in reader:
                if not row.get("crop_id"):
                    continue
                status = (row.get("review_status") or "").strip().lower()
                if status not in ACCEPTED_REVIEW_STATUS or row.get("is_active", "").strip().lower() == "false":
                    self.rejected_rows += 1
                    continue
                try:
                    self.rules.append(CalendarRule(
                        calendar_rule_id=row["calendar_rule_id"],
                        country_iso2=(row.get("country_iso2") or "").strip().upper(),
                        agroecological_zone_id=row.get("agroecological_zone_id") or None,
                        crop_id=row["crop_id"],
                        cropping_system=row.get("cropping_system") or None,
                        irrigation_type=row.get("irrigation_type") or None,
                        planting_start_month=int(row["planting_start_month"]),
                        planting_end_month=int(row["planting_end_month"]),
                        harvest_start_month=int(row["harvest_start_month"]),
                        harvest_end_month=int(row["harvest_end_month"]),
                        hemisphere=row.get("hemisphere") or None,
                        source_name=row.get("source_name") or None,
                        source_url=row.get("source_url") or None,
                        source_year=row.get("source_year") or None,
                        review_status=status,
                        notes=row.get("notes") or None,
                    ))
                except (KeyError, ValueError) as exc:
                    self.rejected_rows += 1
                    log.warning("calendar row rejected (%s): %s", row.get("calendar_rule_id"), exc)
        self.loaded = True
        return self

    def windows_for(self, crop_id: str, country_iso2: str | None) -> dict | None:
        """Planting/harvest windows only when a reviewed row matches location."""
        if not self.loaded:
            self.load()
        if not country_iso2:
            return None
        for rule in self.rules:
            if rule.crop_id == crop_id and rule.country_iso2 == country_iso2.upper():
                return {
                    "calendar_rule_id": rule.calendar_rule_id,
                    "planting_months": [rule.planting_start_month, rule.planting_end_month],
                    "harvest_months": [rule.harvest_start_month, rule.harvest_end_month],
                    "cropping_system": rule.cropping_system,
                    "irrigation_type": rule.irrigation_type,
                    "source": {"name": rule.source_name, "url": rule.source_url, "year": rule.source_year},
                    "review_status": rule.review_status,
                    "notes": rule.notes,
                }
        return None


_store = CropCalendarStore()


def get_calendar_store() -> CropCalendarStore:
    return _store
