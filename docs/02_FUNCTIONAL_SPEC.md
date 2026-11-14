# 02 — Functional specification (user stories, rules, states)

## Product principles

- **Web application**; mobile responsive, not native mobile app.
- **EN + Arabic** with proper RTL layouts; not Morocco-only.
- **No authentication or accounts**; anonymous browser persistence backed by **SQLite**.
- Simple farmer questions; complex data collected by backend wherever possible.
- User selects field location by searching/drawing a polygon; browser geolocation only centers map.
- Never request soil pH, rainfall, temperature as mandatory fields—they are estimated externally.
- No LLM or Market Intelligence in MVP; modular boundaries for later additions.

## First-visit journey — detailed, in order

### F01 — Welcome

**Input:** click `Analyze My Field`; optional language `EN | العربية`. **Output:** Map selection page. Avoid forced registration.

### F02 — Select and name a field

- User can permit geolocation to center map **or** search any world location and pan/zoom manually.
- Draw/edit/remove one or more polygon vertices using Leaflet-Geoman; field name editable.
- Frontend submits **GeoJSON Polygon or MultiPolygon** (depending on adopted validation rules) + name.
- Backend validates ring closure, lat/long bounds, self-intersections, minimum usable geometry and reasonable area; area is **geodesically** calculated in hectares (not naïve degrees²).
- Save field in SQLite and return `field_id`, `area_ha`, `geometry_status`.
- Handle no GPS permission, invalid polygon, tiny/huge polygon and missing tile imagery without blocking manual search.

### F03 — Guided Farm Questions (one at a time)

**Q1 – Irrigation status**: rainfed / irrigated / mixed / unknown. **Conditional:** if irrigated/mixed, ask method drip/sprinkler/surface/other/unknown; availability limited/regular/unknown; optionally volume if farmer knows. Distinguish `water availability` from `irrigation efficiency`.

**Q2 – Crop history for preceding three agricultural years**: each year may contain one or multiple season entries with crop IDs and optionally season start/end dates. Other choices: fallow, unknown. Never force a single crop per calendar year; crop seasons can span years. `Unknown` lets user continue, with explicit data coverage flag.

**Q3 – Production purposes** (MULTI-SELECT): sell, livestock feed, household food, soil restoration/cover. *Selling* is a declared purpose, not automatically market/profit scoring.

**Q4 – Optional critical constraints**: banned crops, seed/equipment/labor restrictions, specific water cap, planned farm horizon. Show only if applicable; unknown is allowed.

**Optional later:** lab soil results, residues removed/retained, fertilizer/manure use, actual historic yields. No obligatory sensors.

### F04 — Priority Mixer (a dedicated page)

4 **scored** weights: water conservation, soil/rotation health, reference yield potential, climate/resilience risk. All >=0; sum = **100**. Changing one slider redistributes remaining weight of others fairly; precision and keyboard controls; avoid 100% total being disrupted by rounding. Clearly explain that `yield` != `profit`. The farmer may select **sell/profit as a production purpose**, but because no reliable price/cost data is implemented, **profit cannot be a fifth scored slider**. Do not silently pretend yield measures earnings.

### F05 — Data Collection / Analysis (visible processing screen)

Display actual stages: geometry validated; NASA climate fetching; soil estimates / GAEZ lookup; crop candidate filtering; rotation building/evaluation. Status via backend `queued / running / complete / partial / failed`; source-level `live / cached / missing / unavailable / demo`. If fast, still show meaningful result summary; never fake percent progress or artificial wait. On error show `Retry` and `Continue with limitations` ONLY if scientifically safe.

### F06 — Rotation Explorer

Show **three distinct multi-season plans**, not merely top three isolated crops. Each card: crop timeline with year and season, 2–4 key qualitative indicators, main limitation, reason for ranking, `View Details`. If current crop history is adequate, show `Current practice` as a baseline comparison; do not insert fictitious current pattern as one of the three recommended options. If fewer than 3 valid choices, show fewer and explain why—never fabricate choices.

### F07 — Plan Details

- Full crop sequence, sow/harvest windows only where **geographically validated**.
- Reasons for suitability and tradeoffs; soil/rotation, water, reference yields (GAEZ if matched), risks, sources and uncertainty badges.
- Buttons: `Use This Plan` (saves original candidate) and `Customize This Plan`.
- No meaningless 81/100 soil-health 'truth', water saved percentage, profit percentage or absolute forecast without validated method.

### F08 — Customize Crop(s)

- The farmer can select **any 1, 2, 3, or more slots**, including editing one multiple times before evaluation.
- Replacement list MUST be **eligible for field + specific season/slot + neighbor rotations + irrigation constraints**, not simply any globally listed crop.
- Current slot remains visible; search/filter only allowed crop list; include 'Why available?' and 'Why missing?' for rejected candidates if transparency is useful; do not offer an infeasible crop as selectable.
- `Similar Impact` badge shown **only after engine evaluation** finds no hard constraint violations, differences within defined thresholds for relevant indicators, and adequate supporting data. Never infer equivalence solely from plant family.
- Selection edits stay **draft**; nothing is persisted as active before evaluation/confirmation.

### F09 — Evaluate Changes (state/modal)

On `Evaluate Changes` backend re-runs hard constraints on FULL modified sequence, produces new scores/evidence, validates multi-edit interactions and reports `feasible / needs review / infeasible`. The frontend does not write `Apply Changes` before response. If invalid, show the exact conflict and let user edit.

### F10 — Compare Original vs Modified

Side by side full sequences, what changed, water/soil/yield reference/risk indicators, positive and negative tradeoffs. If an indicator is missing show `unknown` rather than fake '0 change'. User chooses either `Keep Original` or `Use Modified Plan` explicitly; neither is saved until confirmed. Original plan remains immutable as a reference snapshot.

### F11 — Confirmation

Save chosen plan/version, show confirmation and `Go to My Farm`. Fields and plans stored in SQLite, with timestamps and lineage.

## Returning-user journey

### F12 — My Farm Home

On return in same browser: load saved fields and chosen plan from SQLite via anonymous browser storage key. Display name, area, active plan, season progress **only if manually entered dates/status or derivable schedule**, latest analysis timestamp, clear `View Plan`, `Edit`, `Re-evaluate`, `Field Insights` and `Add Field`. No fake real-time forecasts.

### F13 — My Rotation Timeline

Multi-season/year crop slots, plant/harvest windows if supported, user-editable actual status `planned / planted / harvested / skipped`; local-date timezone. A status change does not pretend that sensors confirmed planting.

### F14 — Field Insights

Climate (NASA), soil estimates, optional vegetation and regional moisture, original source/period/spatial support/confidence, known missing data. Re-fetch on user action, not aggressive live polling by default.

### F15 — Plan Management

Review, duplicate, compare versions, edit/re-run constraints, show chosen vs original and previous versions; explicit save on change.

### F16 — Farm & Language Settings

Rename field, revise geometry, update crop history/irrigation/goals, `EN|AR`, export user data/plan JSON if implemented, clear local browser token with warning about lost anonymous access. No Account/Login/Profile/Logout menu in MVP.

## Cross-screen logic

- Changes to field polygon, irrigation or past crops invalidate dependent cached analyses and must prompt re-analysis; never silently keep old scores.
- A user can navigate backward; answers persist while session remains active.
- Crop information includes `name_en`, `name_ar`, `crop_id`, `scientific_name`; translate UI text, never translate identifiers.
- Accessibility: large tap targets, RTL, keyboard focus, contrast, text+icon status, reduced-motion support.
- Limit crop options to verified supported crop subset per region; 37-row source file does not imply 37 scientifically validated global recommendations.
- If one satellite source is down, show partial results with explicit gaps; if required agronomic data absent, do not score or suggest unsupported crops.

## Input/output contracts (conceptual)

| Feature | Input | Output |
|---|---|---|
| Geometry | geojson, name | `field_id`, area, bbox |
| Farm profile | irrigation, past crop seasons, purposes | normalized validated profile |
| Priority mixer | four slider weights | nonnegative weights summing 100 |
| Analysis | field_id + profile + date window | versioned indicators with provenance |
| Crop filtering | indicators + traits + crop calendar + constraints | feasible candidate crops and exclusions |
| Rotation generation | candidates, history, horizon, season slots | feasible sequences / explicit insufficiency |
| Ranking | sequences + priorities + evidence | comparable scores + sensitivity/limitations |
| Modification | base plan + edits | proposed version, eligibility check |
| Evaluate | full proposed version | before/after evidence, feasibility, trade-offs |
| Confirm | selected version ID | saved active plan |
| Returning home | anonymous browser access key | saved fields, plan, timeline |
