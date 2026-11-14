# 03 — UI/UX & visual design specification

> **Design decision:** `Nature × Earth Intelligence` / clean premium AgriTech. Real functional web application, desktop-first for the jury **and responsive for farmer mobile**. Not a native mobile application. Source image boards are illustrative, not code or measured data.

## Visual direction

- **Primary forest:** `#173E32` (nav/header/title/dark hero).
- **Action leaf green:** `#299A61` (buttons, progress, selection).
- **Cream canvas:** `#F6F7F1` (page background).
- **Sky blue:** `#4D87A8` (climate/water/linked analytic indicators).
- **Amber:** `#D59A39` (warnings needing review).
- **Text:** `#17352D`; **border:** `#DCE6DC`; **white:** `#FFFFFF`.
- Success/error cannot be communicated by color alone; always text/shape/icon. Recommended WCAG AA contrast and visible focus.
- Typography: humanist UI sans, readable English+Arabic (install only via standard web fonts; do NOT bundle paid font files). Use browser fonts if external fonts unavailable.
- Visual motifs: satellite/aerial field photo, calm map, crop images/icons, light card shadows, 16–20px corners, 8pt spacing scale, restrained illustrations.
- Animation: micro-feedback only, no intro 3D farming film, no fake loading percentages. Respect reduced motion.

## Global shell

**Before a plan:** Top bar `Field Shift` logo / language toggle (`EN | العربية`) / help; steps progress; `Back`, `Next`/`Analyze`.

**After plan saved:** desktop app shell left sidebar or top nav `Home · My Fields · My Plan · Insights · Settings`. Mobile bottom nav `Home · Fields · Plan · Insights`, Settings in overflow. No Profile/Sign in/Log out: **no accounts**.

**Desktop:** map view 70% canvas, 30% side form; selection and details can be split panels. **Mobile:** map-first, bottom sheet; one question per screen; plan cards stacked, edit crops in full-width sheet/modal.

## Screen inventory / matching PNG files

| Step | Route proposal | Screenshot | Important elements and actions |
|---|---|---|---|
| 01 | `/welcome` | `../ui_reference/screens/01_welcome.png` | Mission in one line, hero visual, `Analyze My Field`, EN/AR |
| 02 | `/fields/new` | `../ui_reference/screens/02_select_field.png` | Satellite map, search, GPS **only centering**, polygon drawing/editing, area, editable field name |
| 03 | `/setup/questions` | `../ui_reference/screens/03_farm_questions.png` | Single question card, multiple choice, seasonal crop history (multi-crop), irrigation conditional questions, skip unknown |
| 04 | `/setup/priorities` | `../ui_reference/screens/04_priority_mixer.png` | 4 weighted linked sliders (sum 100%), plant goals/selling not fake profit score |
| 05 | `/analyses/:id/progress` | `../ui_reference/screens/05_analysis_progress.png` | Real stages (NASA/soil/suitability/rotation), progress based on actual backend status |
| 06 | `/fields/:id/rotations` | `../ui_reference/screens/06_rotation_explorer.png` | Three timelines/plans with options and clear `View Details` |
| 07 | `/rotations/:id` | `../ui_reference/screens/07_plan_details.png` | Timeline, benefits, disadvantages, provenance, `Use Plan` OR `Customize` |
| 08 | `/rotations/:id/customize` | `../ui_reference/screens/08_crop_customizer.png` | Change 1–3+ slots, valid replacement list per slot, computed `Similar Impact` if safe |
| 09 | `/rotations/:id/evaluate` | `../ui_reference/screens/09_evaluation_progress.png` | Re-analysis of full proposed plan (can be modal) |
| 10 | `/rotations/:id/compare` | `../ui_reference/screens/10_compare_changes.png` | Original vs modified, differences, benefit & drawback, choose one |
| 11 | `/rotations/:id/confirmation` | `../ui_reference/screens/11_confirm_plan.png` | Plan stored, `Go to My Farm` |
| 12 | `/home` | `../ui_reference/screens/12_returning_home.png` | On return: field and active plan, timeline, `Edit`, `Insights`, `Re-evaluate` |
| 13 | `/fields/:id/timeline` | `../ui_reference/screens/13_rotation_timeline.png` | Saved crop schedule, actual status editable by farmer, no fictitious auto-progress |
| 14 | `/fields/:id/insights` | `../ui_reference/screens/14_field_insights.png` | Climate, soil, yield reference, update dates, quality and source details |
| 15 | `/fields/:id/plans` | `../ui_reference/screens/15_plan_management.png` | Chosen version, alternatives, previous versions, edit/re-evaluate |
| 16 | `/settings` | `../ui_reference/screens/16_settings.png` | EN/AR, field name, change location, anonymous local data limitations |

PNG files are design **wireframes**, not real application screenshots. Composite imagegen mood boards are under `../ui_reference/storyboards/`. Review exact component hierarchy and content here when illustrated image has inaccurate dummy values, unwanted icons, extra controls or fake NASA logo.

## Questionnaire layout (Q-by-Q, not long form)

- Stepper progress and compact `Back/Continue`; one primary question at once.
- Questions: irrigation type → if relevant, method/availability → prior 3 growing years (each can have multiple crops/seasons/fallow/unknown) → multi-select production purposes → optional prohibitions/constraints.
- Help bubble: explains WHY question is necessary. Do not ask for pH or yearly rainfall.
- Preserve completed answers when back/forward.

## Priority Mixer interaction

- Four vertical rows with a **horizontal slider** and live percentage: Water, Soil, Yield Reference, Climate Risk.
- Single 100%-wide stacked visual bar reinforces interdependence.
- Changing one value redistributes other percentages while retaining sum 100 exactly; if all others are 0, distribute evenly; let farmer reset to suggested defaults.
- Selling/profit is present in **production-purpose multi-select**, with text: 'Market and profit estimate not yet available in this version'. Never present unsupported profit optimization.

## Analysis screen

Show exact stages: `Field checked → Climate data (NASA POWER) → Soil/suitability → Crop candidates → Rotation assessment`. Source-level status `pending/running/success/unavailable/cached`. If an optional source fails, show a warning and continue only if validity preserved. No arbitrary 76%, no unverified 'live data' checkmarks. Route automatically to 3 rotations once complete.

## Crop plan editor

Plan timeline horizontally on desktop, vertically/scrollable on phone. Each crop slot is clickable. A drawer lists ONLY eligible substitutions with search, readable name, season match and why selectable. `Similar Impact` is earned from actual engine comparison, not static icon by group. Farmer may change one/multiple/all slots; a clear dirty-state indicator reminds them to click `Evaluate Changes`. Save only after comparison and explicit choice.

## Plan detail and comparison

- Front and center: timeline across seasons and years, potential benefits and explicit tradeoffs.
- Indicators: relative risk, water requirement **only where evidence supports**, reference yield from GAEZ (scenario labelled), nutrient/rotation qualitative rule outcomes, uncertainty.
- 'Why recommended?' uses deterministic explanations linked to input observations and rule IDs.
- **Compare:** full original vs modified, changed slots highlighted, deltas only if comparable model and units support them. Show Unknown rather than `0` when data missing.

## Returning Home after adoption

- Field selector and field map thumbnail, saved plan name, active year/season **only if known**, 'Data last refreshed', `View Plan / Timeline / Insights / Re-evaluate / Edit`.
- Never show fake live weather alerts or satellite real-time crop monitoring. Optional later: refresh + watch lists after appropriate data source exists.
- `No saved plan` home should let the farmer resume the wizard or select an existing field, not show empty dashboard.

## i18n / RTL

- English: `lang=en` / LTR. Arabic: `lang=ar` / RTL root; CSS logical properties `margin-inline-start`, `padding-inline-end`, etc.
- Render mixed scientific identifiers, e.g. `NASA POWER`, `NDVI`, `SMAP`, crop IDs, in isolated LTR spans; numbers/units keep legible ordering.
- Use the same UX flow and semantics, not crude string reversal or icons flipped indiscriminately (maps, satellite imagery, play icons and chart axes may have fixed semantics).
- `Intl.NumberFormat`, date localization (calendar language), avoid hard-coded global crop months and timezone assumptions.

## Image reference limitations / design QA

Image-generation boards might contain **made-up yield values, water savings, profit, NASA marks or generic country dates**. Use layout, proportions, visual palette and information hierarchy from those images, **not** numerical content or scientific conclusions. The implementation copy and business rules in these markdown files override image text.

## Accessibility test list

- 360px and 390px mobile; 768px tablet; 1280/1440px desktop.
- Zoom to 200%, keyboard navigation for map fallback/alternative drawing options, text alternative for crop icons, sliders keyboard usable, focus clear, dialog focus trap, screenreader progress announcement.
- API network failure & empty state visually coherent in both languages.
