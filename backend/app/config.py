"""Central configuration. Secrets come from environment/.env — never hard-coded."""
from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BACKEND_DIR.parent


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # live | cached | demo_fixture
    data_mode: str = "live"

    power_enabled: bool = True
    soilgrids_enabled: bool = True
    gaez_enabled: bool = True
    # GAEZ management-intensity assumption: "high" (attainable ceiling) or
    # "low". Water supply comes from the farmer's irrigation answer; this
    # setting documents that intensity is assumed, not collected.
    gaez_input_level: str = "high"
    search_enabled: bool = True

    power_community: str = "AG"
    power_timeout_seconds: int = 25
    power_max_retries: int = 2

    provider_cache_ttl_seconds: int = 86400
    geographic_timeout_seconds: int = 15
    geographic_cache_ttl_seconds: int = 604800
    soilgrids_timeout_seconds: int = 20

    database_url: str = f"sqlite:///{BACKEND_DIR / 'fieldshift.db'}"

    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    min_field_area_ha: float = 0.01
    max_field_area_ha: float = 50000.0
    rotation_horizon_years: int = 3

    # Data files
    crop_knowledge_csv: Path = PROJECT_ROOT / "data" / "crop_knowledge_global_DRAFT.csv"
    crop_calendar_csv: Path = PROJECT_ROOT / "data" / "crop_calendar_by_zone_EMPTY_TEMPLATE.csv"
    crop_water_reference_csv: Path = PROJECT_ROOT / "data" / "crop_water_fao56_reference_NOT_GLOBAL.csv"

    # Demo fixture directory (clearly-labelled SAMPLE data only, never shown as live)
    fixtures_dir: Path = PROJECT_ROOT / "data" / "fixtures"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
