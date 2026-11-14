# Field Shift — Adapting Farms with NASA Data

Crop-rotation decision support for farmers worldwide, built for the
[NASA Space Apps Challenge 2026](https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/).

Field Shift turns a drawn field boundary, a short farmer questionnaire and
four linked priorities into up to three feasible multi-year crop rotation
plans. Every recommendation carries rule-level explanations and full data
provenance — live NASA POWER observations are labelled live, cached responses
carry their fetch time, and unavailable sources are shown as unavailable
instead of guessed.

**English and Arabic (RTL)** · **No accounts** — an anonymous browser key
guards your saved data · **SQLite only**

---

## Implemented features

| Area | Status |
|---|---|
| Welcome, language switch (EN/AR with RTL) | ✅ implemented |
| Worldwide map: place search, satellite/standard basemaps, polygon draw/edit, geodesic area (ha) | ✅ implemented |
| Guided questionnaire: irrigation + conditional method/availability, 3-year multi-season crop history (multi-crop, fallow, unknown), purposes, banned-crop constraints | ✅ implemented |
| Priority mixer: four linked weights that always total exactly 100 | ✅ implemented |
| Analysis pipeline with factual stage/source status (live / cached / unavailable) | ✅ implemented |
| NASA POWER climatology integration (live HTTP, cached fallback with timestamp) | ✅ implemented |
| Crop eligibility engine (farmer bans, rainfed water minimums, temperature warnings) | ✅ implemented |
| Rotation engine: history assessment, whole-sequence validation, deterministic scoring, up to three distinct plans | ✅ implemented |
| Plan details with evidence, rule IDs and data limitations | ✅ implemented |
| Crop substitution restricted to whole-sequence-feasible options, Similar Impact only within documented tolerance | ✅ implemented |
| Modified-rotation evaluation, before/after comparison (unknown when data missing), explicit adoption | ✅ implemented |
| SQLite persistence + returning-user dashboard, timeline, insights, plan management, settings | ✅ implemented |
| Backend test suite (39 pytest cases) and frontend test suite (13 vitest cases) | ✅ implemented |

## Planned / not implemented (explicitly)

- **GAEZ yield references** — the interface exists; live layer access is not
  prepared/licensed for this build, so the yield indicator reports
  *unavailable* and its scoring weight is redistributed. No yield numbers are
  invented.
- **SoilGrids soil estimates** — the REST service is documented as paused and
  is unreachable in this deployment; the insights page says so and shows
  nothing rather than estimates. The adapter also supports clearly-labelled
  prepared fixtures.
- **Planting calendars** — the verified calendar table is intentionally
  empty; no global planting months exist anywhere in the code. Windows appear
  only when a reviewed country/zone row is loaded.
- **SMAP, Sentinel-2, MapSPAM, WorldCereal, GPM, CHIRPS adapters** — designed
  for (provider interfaces + registry) but not connected in the MVP.
- **LLM explanations, market/profit intelligence, yield prediction,
  notifications** — out of scope by project decision; extension points exist
  but nothing is called.

## Architecture

```text
backend/
  app/
    api/            # FastAPI routers: fields, analysis, rotations, dashboard
    services/       # use-case layer: geometry, field store, analysis pipeline, plan service
    domain/         # the science: crop loader, eligibility, history, rotation
                    # generation/validation, scoring, evidence, modification
    data_providers/ # NASA POWER, SoilGrids, GAEZ, crop calendar + SQLite cache
    db/             # SQLAlchemy models, versioned SQLite migrations
    schemas/        # Pydantic API contracts
  tests/            # pytest suite (39 tests)

frontend/
  src/
    app/            # shells, routing, shared components
    features/       # welcome, field-map, farm-profile, priorities, analysis,
                    # rotations, plan-editor, comparison, my-farm, settings
    api/            # typed HTTP client (carries the anonymous key header)
    state/          # wizard store, anonymous key
    i18n/           # en.json / ar.json, direction switching
```

Anonymous persistence: the browser generates a random key once
(`crypto.getRandomValues`) and sends it as `X-FieldShift-Access-Key`. The
backend stores only its SHA-256 hash. Losing browser storage loses access to
saved fields and plans — there is no account, no cross-device sync, and the
UI warns about this.

## Scientific integrity rules baked into the code

- Trait ranges are provisional (`unverified_team_reference`); temperature
  extremes only warn, they never hard-exclude a crop.
- Hard exclusions are limited to farmer-declared bans and the rainfed
  below-absolute-rain-minimum rule, each carrying a provisional-data caveat.
- Missing indicator ⇒ `unavailable` + weight redistribution, never zero,
  never a fabricated number.
- No profit scoring, no water-savings percentages, no yield forecasts.
- Scores are normalized weighted references (0–100), labelled as such in the
  UI.

## Run it

Requirements: Python 3.11+, Node 20+.

```bash
# backend
cd backend
python -m pip install -r requirements.txt
python -m uvicorn app.main:app --reload --port 8000
# API docs: http://127.0.0.1:8000/docs

# frontend
cd frontend
npm install
npm run dev
# app: http://localhost:5173 (proxies /api to port 8000)
```

Configuration lives in `backend/.env` (see `.env.example`): `DATA_MODE`
(live/cached/demo_fixture), provider toggles, CORS origins, area limits.

### Tests

```bash
cd backend && python -m pytest tests/ -q        # 39 tests
cd frontend && npm test                          # 13 tests
```

### End-to-end journey

Draw field → questionnaire → priorities → live NASA analysis → three plans →
details → customize (feasible substitutes only) → evaluate → compare →
confirm → reload → dashboard restores the plan. This flow was exercised
against the real backend and NASA POWER during development; the automated
suites cover the REST journey and the engine rules.

## Data sources and attribution

- **NASA POWER** climatology API — https://power.larc.nasa.gov/ (MERRA-2,
  ~0.5° grid; centroid approximation, labelled in every response)
- **FAO GAEZ v5** — interface prepared, not connected (see above)
- **ISRIC SoilGrids** — adapter with honest unavailability state
- Crop knowledge CSV — team-compiled provisional reference
  (`data/crop_knowledge_global_DRAFT.csv`, `agronomic_review_status`
  column respected by the loader)
- Map tiles: © OpenStreetMap contributors; satellite imagery © Esri
- Place search: Nominatim (OpenStreetMap)

Uses NASA open data. This is an independent student project and is not
endorsed by NASA.

## Known limitations

- NASA POWER Regional Insights polygon statistics are not used; the point
  climatology at the field centroid is the supported path (labelled).
- The scientific engine is a transparent rule/heuristic system, not a
 calibrated agronomic model; local agronomist review is advised before
 costly decisions.
- Background analyses run in-process; a backend restart can interrupt a
 running job (documented, retryable).
- One SQLite file, WAL mode; no concurrent multi-server deployment.

## License

MIT for the code (see `LICENSE`). Included team datasets carry the same
terms and keep their provisional-data flags. External data sources remain
governed by their own licenses.
