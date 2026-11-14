# 06 — Crop data: corrections, trust status, source audit

## Exactly what was inspected

File: `data/original_team_crop_knowledge_UNVERIFIED.csv`, originally uploaded by the team. It has **37 crop rows and 46 columns**. Its values are **team-compiled reference data**, not individually independently checked by this pack against Ecocrop/FAO-56. DO NOT treat this pack as scientific certification.

## Core problem found: fixed month ≠ worldwide growing calendar

The original columns `fao56_plant_month` and `fao56_stage_region` contain illustrative examples such as:

| Crop | Original example month | Example geographic context |
|---|---|---|
| bread_wheat | November | Mediterranean |
| barley | December | California Desert, USA |
| maize | April | Spain / California |
| sorghum | May/June | USA/Pakistan/Mediterranean |
| cabbage | September | California Desert, USA |
| lettuce | Nov/Jan | Mediterranean |

**Decision:** strip these month/region/example FAO-56 fields from `crop_knowledge_global_DRAFT.csv`. Keep them separately as **non-global references** (`crop_water_fao56_reference_NOT_GLOBAL.csv`) with `is_globally_applicable=false`. Calendar operational data must instead be keyed by **country + agroecological zone + crop + cropping system + irrigation + source/period**. Empty verified calendar table is intentional; do not fabricate global planting months.

## Other audit findings

1. **5 records** have example `season_total_days` outside `growing_days_min..max`, specifically: `durum_wheat` (240 vs 120–180), `sugar_beet` (230 vs 60–140), `eggplant` (140 vs 70–120), `lettuce` (105 vs 35–85), `artichoke` (360 vs 210–270). This may reflect differing location, cultivar or period definitions. Do not forcibly average or overwrite either value without source verification.
2. FAO56 Kc values often derive from a **crop group header**, and can be strongly climate, wind, humidity, growth stage and variety dependent; original initial/mid/end coefficients are not reliable universal water-use predictions. They remain separately in `crop_water_fao56_reference_NOT_GLOBAL.csv`.
3. Some numeric traits are empty; preserve **blank as unknown**, not zero; do not silently invent temperature, rain or soil tolerance.
4. `fixes_nitrogen=yes` for a legume is a **potential biological trait**, not quantification of net nitrogen delivered to following crops. Soil N mass balance requires prior yield, fertilization, residues, inoculation, soil and water context.
5. Terms like rain `optimum mm` or growth `days` may represent different climate vs crop-stage reference periods. Confirm definitions and provenance before quantitative crop exclusion.
6. Original data from several sources (Ecocrop/FAO56) is mixed without row-specific, field-specific citations. Add a source URL and scope per verified parameter in future revision.
7. `Crop name en/ar` and stable `crop_id` are useful to UI, but local varieties/subtypes are not provided. Avoid pretending every crop variant has identical needs.
8. No measured yield, buyer demand, market prices or current soil nutrient observations are present; **do not derive these from the crop table.**

## What is in each delivered CSV

### A) `crop_knowledge_global_DRAFT.csv`

37 rows. Carries `crop_id`, bilingual names, scientific name, family, rotation group, *provisional* ecological ranges and soil traits, rooting, nitrogen fixer/feed flag. **No planting-month field**, and explicit `agronomic_review_status=unverified_team_reference`, `calendar_status=requires_country_zone_crop_management_mapping`, `is_allowed_as_universal_hard_filter=false`.

**Interpretation:** a candidate knowledge catalog to be reviewed, not a final ruleset. These flag fields MUST be respected by backend data loaders.

### B) `crop_water_fao56_reference_NOT_GLOBAL.csv`

Holds original `Kc` and example growth-stage durations and original regional/month context, marked **not globally applicable**. Use only after verifying proper FAO-56 row, season, stage dates, site climate, ET0 and management. No production water-savings % directly computed from this file.

### C) `crop_calendar_by_zone_EMPTY_TEMPLATE.csv`

Header only; fields:

- `calendar_rule_id`, `country_iso2`, `agroecological_zone_id`, `crop_id`, `cropping_system`, `irrigation_type`
- `planting_start_month`, `planting_end_month`, `harvest_start_month`, `harvest_end_month`, `hemisphere`
- `source_name`, `source_url`, `source_year`, `review_status`, `notes`.

Operational loader must reject `unknown/unverified` calendar records for strict placement in a production recommendation. Fields are generic; valid months may cross the calendar-year boundary (e.g., autumn sowing/spring harvest), so implement intervals with crop-year semantics, not `start <= end` for all cases.

### D) `crop_data_audit.csv`

96 audit entries generated deterministically from the original file. Issues include example months, FAO-56 crop-group coefficient assumptions, contradictory example stage totals, some missing ranges and *all* 37 unverified provenance statuses. Re-read and resolve per crop and data field.

### E) `original_team_crop_knowledge_UNVERIFIED.csv`

Exact original for comparison; **never use directly for global scoring**. When revising a number, log crop ID, field, before/after, source URL, publication year, location/cultivar if applicable, reviewer and date.

## Safe scientific decision rules

- Basic `unknown` field → use a missing-data badge or ask optional farmer question, **not 0**.
- **Hard exclude** crop only for reviewed, high-confidence constraints (e.g., irrigation unavailable for a truly irrigation-required crop in selected local season).
- General ranges can supply explanations/warnings but not automatic absolute exclusion until reviewed.
- Planting calendars must be location-specific. No `November for wheat everywhere` assumption.
- Only expose crop as replacement if field+slot+surrounding-crop feasibility is verified. Do not globally list 37 crops by default.

## Agronomy verification checklist (for each promoted crop)

- [ ] Correct scientific species and local cultivar if relevant
- [ ] Temperature, rainfall and pH ranges from traceable authoritative references with clear timeframe/units
- [ ] Kc values linked to ET0 method, crop stage and regional assumptions if water modeling used
- [ ] FAO GAEZ LUT mapping and management scenario validated
- [ ] Crop calendar country/zone and cropping season verified
- [ ] Farm irrigation hard-constraint and historic family rotation rules reviewed
- [ ] Missing-data behavior specified
- [ ] Source URL, license, review date and evidence record available

## Why not discard the whole dataset?

Because the original has useful identifiers and a starting taxonomy for candidates and UI labels. We preserve it, isolate geographic claims and flag all unreviewed numerical ranges. A future agronomist review can promote a small validated subset without throwing away team work.

## Supporting sources

- Team original CSV (inside ZIP), not an independently verified agronomy journal.
- FAO-56 water guidance: https://www.fao.org/4/x0490e/x0490e00.htm
- FAO Crop Calendar coverage/region dependence: https://cropcalendar.apps.fao.org/
- GAEZ model/data distinctions: https://www.fao.org/land-water/resources/tools/databases/gaez/en
