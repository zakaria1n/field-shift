# 01 — Hackathon, problem, challenge fit

## Identity

- **Event:** NASA Space Apps Challenge 2026, 14–15 November 2026.
- **Challenge:** **Field Shift: Adapting Farms with NASA Data** (user initially shared legacy path `/2026/challenges/adapting-farms-with-nasa-data`; indexed canonical challenge uses `field-shift-adapting-farms-with-nasa-data`).
- **Official challenge page:** https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/
- **Canonical 2026 event:** https://www.spaceappschallenge.org/2026/
- **Target:** Farmers globally, using Morocco as a demonstrable location—not a Morocco-only product.
- **Type:** Farmer-facing, interpretable **crop-rotation decision-support web app**; it does not autonomously control a farm.

## The real problem

Changing temperatures, irregular rain, water constraints and soil stress complicate multi-season crop planning. Public Earth observations are valuable but difficult for farmers to interpret. The app translates them, combined with crop traits, local soil estimates, agricultural history and farmer goals, into feasible and explained **rotation options**.

## Official challenge framing (paraphrased)

NASA's official Field Shift challenge requests a decision-support tool using **NASA Earth observations**, **local soil information**, **crop characteristics**, and **farmer priorities** so farmers can explore strategies improving soil health and adapting to environmental changes. Link: https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/ .

The attached team guide (Nov 13, 2026, Part B2 pp. 7–8) expands possible functionality: historical climate stress, water, bare-field windows, farmer trade-offs, comparing rotation strategies, visual explanations, and clear uncertainty. These are **team-design guidelines**, not automatically mandatory official clauses.

## Value proposition

**Input:** a real field polygon + farmer-supplied history, irrigation, purposes and relative priorities.

**Process:** NASA-driven environmental profile + crop requirements, location-specific suitability/timing and decision rules that check feasible sequences, not merely best individual crops.

**Output:** three rotation proposals (current practice included **when accurately known and feasible to compare**, otherwise clearly labelled 'current pattern unavailable' and three newly generated candidates), transparent strengths/weaknesses, confidence/coverage, crop replacement, comparison and saved chosen plan.

## Scientific requirements

1. NASA data must actually influence a decision or risk assessment. A decorative NASA image is insufficient.
2. Separately track **measured/observed**, **modeled**, **farmer-provided**, **assumed**, **unavailable**.
3. Do not equate potential/reference yields with field-specific predicted harvest.
4. Avoid fake percentages for water saved, nitrogen fixed, expected profit or soil-health improvement.
5. A single raster cell can encompass many small fields; declare source native resolution.
6. Encourage local agronomist/soil test review when recommendations materially affect farming costs or safety.
7. Human farmer retains the final choice; never automatically modify selected plans.

## Project scope agreed for the hackathon

**In:** global map-based field, question-by-question form, three-year crop history, irrigation method, multi-goal profile, linked priority sliders, NASA processing, crop filtering, rotation generation/scoring, evidence, plan replacement, re-analysis, SQLite persistence, returning-user home, EN/AR localization.

**Out:** LLM, generative agents, Market Intelligence/prices/buyers, authentic profit scoring, custom yield ML, account/login/authentication, payment, IoT sensors, real-time sensor network, guaranteed forecast/harvest prediction, universally precise field chemistry, 3D farm simulator.

## Show the judges

1. Map and polygon are real; land is not simply where the browser is located.
2. Actual NASA POWER response used for at least one visible climate indicator; show provenance/time and spatial scale.
3. Crop exclusion from a scientific or farmer hard constraint (clear reason).
4. Three different multi-year strategies and factual explanation of differences.
5. Change irrigation or priority: show recalculated ranking; change one crop: show valid alternatives and before/after comparison.
6. Save and reload the same plan in the same browser without logging in.
7. Distinguish live data, cached data, incomplete data and explicitly labeled demonstration data.

## Eligibility / attribution / presentation

Use at least one qualifying NASA resource per current organizers' guidance; external resources can complement it subject to license and attribution. Verify against event rules before final submission. Official project submission dates: Nov 14–15 2026 per event site (local timezone applies). No project should imply NASA endorsement; NASA imagery/logos/marks require separate usage compliance. Prefer neutral 'Uses NASA open data' attribution text, not a fabricated official logo lockup.

## Useful references

- Official challenge: https://www.spaceappschallenge.org/2026/challenges/field-shift-adapting-farms-with-nasa-data/
- Official event/timeline: https://www.spaceappschallenge.org/2026/
- NASA POWER: https://power.larc.nasa.gov/docs/services/api/application/insights/
- Original English team guide: `../references/Team_Guide_EN_Original.pdf` pp. 7–10
- Original Arabic team guide: `../references/Team_Guide_AR_Original.pdf`
