# 05 — Maintainable technical architecture & interface contracts

## Frozen technology decisions

- **Frontend:** `React + TypeScript + Vite` for web, `Leaflet + Leaflet-Geoman`, modular CSS/Tailwind if desired, `react-i18next` or similarly scoped i18n.
- **Backend:** `Python + FastAPI + Pydantic + Shapely + pyproj + stdlib/csv + NumPy/Xarray/Rasterio` **only when needed**. Pandas optional for analytical processing; no need to load every global raster into memory.
- **Database:** **SQLite only** (SQLAlchemy or SQLModel optional), migrations through Alembic or versioned SQLite scripts.
- **Auth:** NONE—no login, registration, passwords, OAuth as app users, session server or account model. **External dataset providers may separately require API credentials**, kept on backend; that is not user auth.
- **Core intelligence:** deterministic, testable scientific crop-filter + rotation generator + multi-objective scorer, **not LLM**.
- **Later additions:** defined interfaces for LLM explainer and market connector, **do not instantiate or call in MVP**.

## Suggested project tree (source-code blueprint, not included as a complete app)

```text
field-shift/
├── frontend/
│   └── src/
│       ├── app/                # routes, application shell, language provider
│       ├── features/
│       │   ├── field-map/      # Leaflet, geoman, geometry editor
│       │   ├── farm-profile/   # question by question, conditional fields
│       │   ├── priorities/     # 100% linked weights
│       │   ├── analysis/       # job polling and source statuses
│       │   ├── rotations/      # plan list, details, evidence
│       │   ├── plan-editor/    # candidate substitutions, draft edits
│       │   ├── comparison/     # before/after
│       │   ├── my-farm/        # returning home/timeline/insights
│       │   └── settings/       # language/field edit
│       ├── components/         # shared map cards, crop chips, empty states
│       ├── i18n/               # en.json, ar.json
│       ├── api/                # typed HTTP clients
│       ├── state/              # query cache, wizard state, browser key
│       └── styles/             # tokens, logical properties, RTL
├── backend/
│   └── app/
│       ├── main.py             # FastAPI composition
│       ├── api/                # routes and schemas; no core business logic
│       ├── domain/             # crop, season, field, plan entities
│       ├── services/
│       │   ├── environmental_analysis.py
│       │   ├── crop_suitability.py
│       │   ├── rotation_generator.py
│       │   ├── rotation_scoring.py
│       │   ├── replacement_eligibility.py
│       │   ├── comparison.py
│       │   └── evidence.py
│       ├── data_providers/
│       │   ├── interfaces.py
│       │   ├── nasa_power.py
│       │   ├── gaez_raster.py
│       │   ├── soilgrids_raster.py
│       │   ├── smap_appeears.py       # enhancement
│       │   └── sentinel2_statistics.py # enhancement
│       ├── repository/         # SQLite SQLModel/SQLAlchemy/query code
│       ├── jobs/               # analysis queue/status, retries
│       ├── config.py           # secrets, paths, feature toggles
│       └── tests/
├── data/
│   ├── crop_knowledge_global_DRAFT.csv
│   ├── crop_calendar_by_zone_*.csv
│   └── source_registry.csv
├── docs/
└── README.md
```

**Architectural rule:** UI screens must call typed APIs. API routers delegate to services. Services use `Provider Interfaces` rather than importing NASA/GAEZ clients directly. Scoring never calls external HTTP. Add providers/features without rewriting the editor.

## Anonymous persistence design (NO AUTH)

Need identify saved fields on return **without accounts**. Recommended hackathon method:

- Generate a high-entropy random `browser_access_key` once on initial load, save to `localStorage` (anonymous, no personal identity).
- Backend stores only **hash** of this capability token with fields/plans. All endpoints under a field require the key. Use `crypto.getRandomValues` client-side. Do not send key in URL or expose it in logs.
- The key is access control for an anonymous browser, **not a full authentication system**. It prevents casual ID enumeration, but cannot protect devices shared with other users, stolen browser storage, cross-device access, or XSS. Backend still validates ownership via the capability check.
- SQLite creates fields/analyses/plans and stores them; the browser key is an anonymous handle, **no `users` or `accounts` table**.
- If localStorage erased or the user switches browser/device, their saved plan may become inaccessible. Explain this clearly; optional JSON export for backup.
- Data sensitivity: polygon location can be sensitive; privacy statement, limited collection, deletion endpoint, no public listing of all fields, avoid exposing source GIS AOI through analytics.

## SQLite schema (suggestion, normalized)

```sql
CREATE TABLE anonymous_clients (
  client_id TEXT PRIMARY KEY,
  access_key_hash TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);
CREATE TABLE fields (
  field_id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  geometry_geojson TEXT NOT NULL,
  area_ha REAL NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(client_id) REFERENCES anonymous_clients(client_id)
);
CREATE TABLE farm_profiles (
  field_id TEXT PRIMARY KEY,
  irrigation_type TEXT NOT NULL,
  irrigation_method TEXT,
  water_availability TEXT,
  purposes_json TEXT NOT NULL,
  priorities_json TEXT NOT NULL,
  limitations_json TEXT,
  updated_at TEXT NOT NULL,
  FOREIGN KEY(field_id) REFERENCES fields(field_id)
);
CREATE TABLE crop_history (
  id TEXT PRIMARY KEY,
  field_id TEXT NOT NULL,
  crop_year INTEGER NOT NULL,
  season_label TEXT,
  crop_id TEXT,
  status TEXT NOT NULL,
  planted_at TEXT, harvested_at TEXT,
  FOREIGN KEY(field_id) REFERENCES fields(field_id)
);
CREATE TABLE analysis_jobs (
  id TEXT PRIMARY KEY, field_id TEXT NOT NULL,
  status TEXT NOT NULL, started_at TEXT, finished_at TEXT,
  source_status_json TEXT, error_json TEXT,
  FOREIGN KEY(field_id) REFERENCES fields(field_id)
);
CREATE TABLE observations (
  id TEXT PRIMARY KEY, field_id TEXT NOT NULL,
  analysis_id TEXT NOT NULL, indicator TEXT NOT NULL,
  value_num REAL, unit TEXT, source_id TEXT NOT NULL,
  source_layer TEXT, period_start TEXT, period_end TEXT,
  spatial_support TEXT, quality_status TEXT, meta_json TEXT,
  FOREIGN KEY(field_id) REFERENCES fields(field_id)
);
CREATE TABLE rotation_plans (
  plan_id TEXT PRIMARY KEY, field_id TEXT NOT NULL,
  name TEXT NOT NULL, chosen_version_id TEXT, created_at TEXT NOT NULL,
  FOREIGN KEY(field_id) REFERENCES fields(field_id)
);
CREATE TABLE rotation_versions (
  version_id TEXT PRIMARY KEY, plan_id TEXT NOT NULL,
  base_version_id TEXT, status TEXT NOT NULL,
  sequence_json TEXT NOT NULL, score_json TEXT NOT NULL,
  evidence_json TEXT NOT NULL, created_at TEXT NOT NULL,
  FOREIGN KEY(plan_id) REFERENCES rotation_plans(plan_id)
);
CREATE TABLE actual_field_events (
  id TEXT PRIMARY KEY, field_id TEXT NOT NULL,
  version_id TEXT, crop_slot_id TEXT,
  event_type TEXT NOT NULL, event_date TEXT, notes TEXT,
  FOREIGN KEY(field_id) REFERENCES fields(field_id)
);
```

SQL is a **proposed starter schema**, not a migrated DB. Add indexed foreign keys; enable SQLite FK pragma, WAL when appropriate, transactions for plan adoption, migration versioning. `anonymous_clients` is NOT user authentication or a person profile.

## Internal REST contracts (OUR proposed routes; NOT official NASA endpoints)

| Method | Route | Input | Output |
|---|---|---|---|
| `POST` | `/api/v1/fields` | name, GeoJSON | field_id, area_ha |
| `GET` | `/api/v1/fields` | anonymous key | fields owned by browser key |
| `PATCH` | `/api/v1/fields/{id}` | geometry/name | revised field, invalidated analyses |
| `PUT` | `/api/v1/fields/{id}/profile` | questionnaire & priorities | normalized persisted profile |
| `POST` | `/api/v1/fields/{id}/analyses` | date window | job id |
| `GET` | `/api/v1/analyses/{job_id}` | job id | actual stage/source status |
| `GET` | `/api/v1/fields/{id}/insights` | field id | indicators + quality + provenance |
| `GET` | `/api/v1/fields/{id}/rotations` | analysis version | 0..N feasible plans (target 3) |
| `GET` | `/api/v1/rotations/{id}` | plan id | timeline + reasons + sources |
| `GET` | `/api/v1/rotations/{id}/slots/{slot}/substitutes` | current slot/context | eligible crops and known similarity scores |
| `POST` | `/api/v1/rotations/{id}/evaluate` | draft edits (full seq) | feasibility + comparison; not saved active |
| `POST` | `/api/v1/rotations/{id}/adopt` | version id | transactional active version |
| `GET` | `/api/v1/fields/{id}/active-plan` | field id | persisted chosen version |
| `PUT` | `/api/v1/fields/{id}/events` | status/date user reports | event saved |
| `DELETE` | `/api/v1/fields/{id}` | field id, explicit confirm | deleted field-associated data |

For each route, document `400/401-equivalent/403/404/409/422/503` handling as suitable. `401` here must not lead to login; missing/invalid anonymous access key leads to generic anonymous access error.

## Engine structure and pseudocode

```python
# Conceptual, not a calibrated agronomic model.
profile = load_profile(field_id)
observations = get_normalized_observations(field_id)
reviewed_traits = load_reviewed_crop_subset()

eligible, excluded, unknown = screen_crops(
    reviewed_traits, observations,
    irrigation=profile.irrigation,
    crop_calendar=local_zone_calendar,
    constraints=profile.hard_constraints,
)

rotations = generate_sequences(
    eligible=eligible,
    past_three_years=profile.crop_history,
    seasons=available_season_slots,
    horizon_years=3,
    forbidden_same_family_repeats=validated_rule_set,
)

viable = [r for r in rotations if check_whole_rotation(r).is_feasible]
scored = [score_with_provenance(r, profile.priority_weights) for r in viable]
plans = diversity_aware_top_k(scored, k=3)
```

Notes: (1) `3-year` horizon is design default, not mandatory for all geographic contexts; adjust season count if crops overlap or multi-season harvest. (2) Avoid arbitrary agronomy thresholds hard-coded without source. (3) `Unknown data` is not a true negative. (4) Crop family alone doesn't scientifically prove compatible/nutrient positive. (5) Output fewer than 3 if data inadequate.

## Scoring policy

- First **hard constraints**, then normalize evidence-supported indicators, then apply user weights with sum 1.0.
- Indicators: water risk/relative requirement, rotation-health proxy, attainable-yield reference, climate vulnerability. Specify per-indicator units/method, calibration set, applicability and missing-value handling before allowing final 0–100 scores.
- `Yield Reference` may come from GAEZ, not actual next harvest prediction. `Water savings %` only if computed with comparable verified local ET0/Kc/irrigation assumptions. `Soil Health +28%` prohibited without validated physical model. `Market/Profit` entirely disabled as scoring terms.
- Return score breakdown, source IDs, decisions and constraints so the frontend can explain without LLM.

## Job orchestration

- Hackathon simple mode: FastAPI background task or in-process job queue with SQLite status; clearly note process restarts may interrupt jobs. Reliable future production: task worker adapter (Celery/RQ) optional **without switching database** as requested, though a distributed broker would require reevaluation; do not add it in MVP.
- Never block browser waiting for multi-minute raster extraction. Poll job and show factual state; retries bounded.

## Config / testability

- Environment `DATA_MODE=live|cached|demo_fixture`, `POWER_ENABLED`, `GAEZ_LAYER_DIR`, `SOILGRIDS_ENABLED`, `SENTINEL_ENABLED`, external credentials and cache timeout.
- Unit tests against provider fixtures; integration only using authorized live services; screenshot tests for EN/AR.
- Add future features by new provider interface/adapters and feature modules, **not by editing core scoring logic with ad-hoc API calls**.
