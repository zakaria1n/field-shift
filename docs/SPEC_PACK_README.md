# Field Shift — NASA Space Apps 2026 | Team Implementation Pack

**Version:** 1.0 specification draft • **Prepared:** 14 November 2026 • **Deliverable:** planning documents + curated provisional crop datasets + UI screen references. **This ZIP is not a running application.**

> **قرار نهائي / Frozen MVP:** Responsive **WEB application** (desktop and mobile), **English and Arabic** interfaces, **SQLite only**, **NO login, NO accounts, NO user authentication**, **NO LLM**, **NO Market Intelligence**. A Python scientific rules/rotation optimization engine drives recommendations. Later features must be modular, never required for core operation.

## Start here

| File / folder | Read for |
|---|---|
| `docs/01_HACKATHON_AND_PROBLEM.md` | What the NASA challenge asks, scope, scientific responsibility, demonstration |
| `docs/02_FUNCTIONAL_SPEC.md` | **All features**, first and returning-user experience, questionnaire, editing & comparing plans |
| `docs/03_UI_UX_DESIGN.md` | Design system, 16 views, RTL/EN rules, layouts and **exact UI image references** |
| `docs/04_DATA_SOURCES_AND_PROCESSING.md` | Each external source/tool: input, output, method, limits, transformations, caching |
| `docs/05_TECH_ARCHITECTURE.md` | Maintainable frontend/backend separation, SQLite schema, API contracts, engine architecture |
| `docs/06_CROP_CSV_AUDIT.md` | How the original 37-crop CSV was transformed; **no global month assumptions**; audit |
| `docs/07_TESTS_DEMO_AND_SCOPE.md` | MVP delivery order, regression tests, reproducible demo, failure cases |
| `docs/08_I18N_CONTENT.md` | English/Arabic translations, language/RTL, scientific language standards |
| `docs/09_OPEN_DECISIONS.md` | Unresolved implementation and agronomic decisions (not silently invented) |
| `docs/10_SOURCES_AND_ATTRIBUTIONS.md` | Verified official links, attribution, original team guide |
| `data/crop_knowledge_global_DRAFT.csv` | 37-crop general traits **draft** (NOT independently validated) |
| `data/crop_water_fao56_reference_NOT_GLOBAL.csv` | FAO-56 Kc/stage examples + their geographical context (not a global calendar) |
| `data/crop_calendar_by_zone_EMPTY_TEMPLATE.csv` | Country/zone-specific crop calendar schema — deliberately contains **zero fictional rows** |
| `data/crop_data_audit.csv` | 96 audit flags; potential conflicts, missing provenance and misleading planting months |
| `data/source_registry.csv` | External data adapter inventory |
| `data/ui_i18n_en_ar.csv` | Seed translations; expand in application source code |
| `data/original_team_crop_knowledge_UNVERIFIED.csv` | Original team CSV, untouched for comparison |
| `ui_reference/screens/` | Individual **desktop web UI visual references** (PNG) |
| `ui_reference/storyboards/` | Previously discussed and newly generated visual storyboards |
| `ui_reference/preview.html` | Local static clickable screen gallery; **reference only, no live app** |
| `references/Team_Guide_*_Original.pdf` | Team agricultural guide (English and Arabic) |

## Core experience — high-level

1. First visit → Welcome → map centered on geolocation **only if allowed** → search and draw **field polygon** → name field.
2. Simple question cards: irrigation system, irrigation method if needed, crops of **last three years** (multiple seasons allowed, `Unknown`), production purposes. Do **not** ask the farmer to type pH or temperature.
3. A linked **100% Priority Mixer** for water, soil, yield reference and climate risk. Selling/income can be declared as a purpose, **not given a fabricated profit score**.
4. Real analysis status screen: collect NASA data, integrate other available data, process indicators, validate crop constraints and generate viable multi-season rotations.
5. Three rotation choices, then plan details/evidence; choose a plan **or** modify 1–3+ crops; list only **compatible alternatives**; re-evaluate; compare original vs modified; accept either.
6. Save with SQLite; next visit → **My Farm Home**, chosen plan, timeline, sources/insights, re-evaluation and edit plan. No artificial live monitoring claims.

## Scope boundaries

- No universal planting month fixed in a globally used crop row. Timing is **field-location + crop + agroecological zone + rainfed/irrigated + local crop-calendar evidence**.
- NASA, SMAP and GAEZ grid values do not magically become accurate field measurements when clipped by a small polygon.
- GAEZ version 5 provides **precomputed modeled suitability/attainable yield**; not an open general-purpose POST service for custom SoilGrids/POWER inputs.
- Do not invent water-saving %, profit %, yield predictions, nitrogen gains or soil health points for demo screenshots. Concept images might contain illustrative numbers—**they are not real model outputs**.
- Do not create a `users` table, auth service, login UI, roles or passwords. Persistence for anonymous browsers is described in the architecture; losing the browser key can mean losing access to saved fields.

## Recommended build order

`GeoJSON field → questionnaire → NASA POWER → reviewed crop subset/GAEZ matched data → constraints → 3 rotations + evidence → edit/compare/apply → SQLite return visit → additional data adapters → optional feature polish.`

## Team note

Documentation distinguishes (a) **team source content**, (b) **verified external source capabilities**, (c) **proposed product logic**, and (d) **UI-only placeholders**. Nothing here claims that all data pipelines were tested against live services.
