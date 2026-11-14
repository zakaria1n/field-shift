# 09 — Open decisions, scientific risks and technical trade-offs

This file is deliberately explicit so the team does **not** mistake recommendations for already settled requirements.

## Confirmed by user

- Global product; Morocco only a demonstration example.
- Responsive **Web Application**; English + Arabic; SQLite only; **no authentication/accounts/users**.
- No LLM and no Market Intelligence in the MVP. Future features must remain pluggable.
- Automatic climate/soil estimates where possible; farmer only provides unknown local management/history/purposes.
- Ask irrigation type and if irrigated, method; past three agricultural years with multiple crops per year and `Unknown` allowed.
- Farmer multi-select purposes, linked 100% scored objective sliders.
- Polygon field drawing; analysis progress visible; three rotation plans (when feasible); detail; edit one or all crop slots; re-evaluate; compare original/new; explicitly adopt; return to a saved `My Farm Home`.
- No full 3D required; premium `Clean AgriTech + Earth Intelligence` style; mobile responsive.

## Proposed defaults (not directly agreed one by one)

1. Three-year planning horizon **default**. A season is not the same as a year: some regions need multiple slots/year and cross-year dates.
2. Start with a reviewed subset of 10–12 crops, not automatically all 37. Exact supported subset needs actual agronomist/data verification.
3. No custom ML model. Deterministic rules/optimization with auditable evidence.
4. Anonymous browser key + backend ownership check for persistence. No cross-device sync, no social login.
5. Crop family repetition and `N fixer` trait used as qualitative hints, not quantitative fertilization claims.
6. Use 4 scored priority sliders Water / Soil / Yield Reference / Climate Risk. Income/Profit is a purpose, not scored in MVP. If product wants a visual money slider, it must be visibly disabled until a valid economic model exists.
7. `GAEZ` available via prepared, correctly mapped scenario layer (access to specific crop layers still to be validated). Do not block the demo on its live site.

## Unverified high-risk integrations

- **SoilGrids REST:** officially paused in available documentation; WebDAV/WCS fallback and geoprocessing path require testing.
- **GAEZ v5:** data is precomputed, not custom user model execution. Which exact LUT/layer/period to use for selected crops, GIS resolution and license must be documented.
- **NASA POWER Regional Insights:** polygon capability documented, but selected parameter codes/quotas/live response and behavior for tiny farm AOI must be tested.
- **SMAP/AppEEARS:** account, queued tasks, ~9km support and project-specific layer selection.
- **Sentinel-2 Statistical API:** OAuth2, available credits, cloud masking, field minimum useful pixel count and signal stability.
- **Crop calendar:** globally complete up-to-date calendar not guaranteed; header-only template is intentional.
- **Crop trait CSV:** team source includes regional month examples and some incompatible season lengths; no independent numeric validation in this pack.
- **Quantitative water/soil/yield improvement metrics:** no calibrated in-house model; **do not implement unsupported percentage claims**.

## Concrete pre-code questions for the team

1. Can the demo AOI be supported by a confirmed, downloadable GAEZ v5 crop/LUT layer? If not, what official/traceable alternative suitability data are available?
2. Which 5–12 crops can a team member actually verify by crop/zone/management *before* enabling them in the engine?
3. Do we want full 3-year seasonal rotation, or calendar-aware `N season slots` that may span 2–5 years? Default 3 years with explicit adaptability suggested.
4. What scientifically reviewed crop-family repeat and legume rules do we apply? Avoid blanket universal forbidden periods.
5. Can we provide no-score qualitative tradeoffs where crop-specific water demand information is absent? (Yes recommended.)
6. What is the accepted cache/fixture policy for NASA and GAEZ when live services are slow during judging?
7. Which public map tile provider and imagery license will be used for polygon drawing?
8. Is the anonymous browser save limitation acceptable for the demo? (Proposed default yes; show warning.)
9. Who will sign off actual agricultural rules? Technical design cannot replace local agronomic expertise.

## Not yet in MVP; optional extension ports

- `market_port.py`: no runtime use/price/buyer claims until genuinely reliable live provider(s) and crop/region/harvest matching exist.
- `llm_explainer_port.py`: may later paraphrase validated evidence, cannot alter scientific recommendations; disabled by default.
- `notifications/monitoring`: needs real measured/forecast data and user consent/cadence; never portray simulated sample reminders as live alerts.
- `yield_prediction`: future trained/validated model with observed ground truth, explicitly separate from GAEZ attainable yield and MapSPAM 2020 reference.
