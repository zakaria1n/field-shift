# 07 — Hackathon MVP, delivery plan, test cases, judging demo

## Priority order (no timelines promised)

**P0 — functioning backbone**
1. Polygon map + area + name + SQLite field save.
2. One-question-at-a-time profile: irrigation, last 3 years crop history, purposes, priority mixer.
3. Real NASA POWER integration with an actual JSON response, error/cached status and period.
4. Reviewed small crop subset + explicit GAEZ/suitability reference for demonstration AOI (if access verified); transparent missing-data state.
5. Engine produces up to three viable rotation sequences with reasons and baseline where known; no fabricated outcomes.
6. Plan detail and editable crop slots restricted to feasible options, reevaluation, before/after, explicit adopt.
7. Saved plan visible on returning-user Home, same browser, no login.
8. English/Arabic including RTL and all action labels.

**P1 — helpful if P0 works**: SoilGrids clipped layers through stable access, SMAP L4 broad moisture, Sentinel-2 NDVI, FAO-local calendar, comparison graphs with real data.

**P2 — backlog**: WorldCereal, MapSPAM historical production, better irrigation water modeling, monitoring/notifications from verified sources, export plan. LLM and Market Intelligence **not in scope**; add later only as separate optional modules.

## Minimal defensible scientific engine

- Use **at least one NASA observation** to produce visible indicators tied to rotation screening, risk or evidence.
- Use conservative local suitability/reference when available; do not claim global Kc/month correctness.
- Rotation rules at minimum: zone-specific seasonal fit (where verified), family repetition conflicts (as qualified rules), rainfed/irrigated compatibility, previous crop history, water constraints, known exclusions.
- Ranking criteria chosen from evidence-supported, comparable indicators. If soil health/yield/water units are not calibrated, label qualitative references, not precise percent improvements.
- Current plan as comparator if history allows reconstruction. Else explicitly `history incomplete`.

## Functional test matrix

| ID | Test scenario | Expected |
|---|---|---|
| T01 | GPS denied | map/search/draw works; no mistaken GPS field |
| T02 | Invalid polygon crossing itself | validation error; no saved invalid AOI |
| T03 | small field inside one SMAP pixel | regional context badge, not precision claim |
| T04 | Arabic selected | complete RTL layout, crop IDs remain stable, English units legible |
| T05 | Crop history two crops in same year | both persisted with season differentiation |
| T06 | Farmer unknown history | allow flow, lower historical certainty |
| T07 | rainfed with no irrigation | irrigated-only variants excluded with reason |
| T08 | slider moved to 80% | other sliders rebalance; sum exactly 100 |
| T09 | sell purpose selected | purpose saved; no fabricated money/profit ranking |
| T10 | optional SoilGrids REST unavailable | use approved WebDAV cache / partial-data warning; no fake success |
| T11 | POWER returns error | retry, cache if legitimate, otherwise no NASA-backed recommendation claim |
| T12 | GAEZ LUT unavailable for a crop | cannot claim its potential yield; no fake calendar |
| T13 | 3 recommended plans available | distinct multi-season sequences, evidence and selection |
| T14 | only 2 valid rotations | return 2 with explanation, no invented third |
| T15 | replace crop in slot with invalid next-crop family | not selectable or evaluation fails with explainable conflict |
| T16 | replace all three crops | full rotation is revalidated; no stale score reuse |
| T17 | `Similar Impact` | only appears after comparable actual engine evaluation; disappears if unknown |
| T18 | press `Evaluate Changes` | original remains active until explicit adoption |
| T19 | choose original after editing | original version active, modified draft discarded or archived |
| T20 | save and refresh | Home restores chosen plan from SQLite using same anonymous browser key |
| T21 | clear localStorage/change browser | warn about lost anonymous access; no fake cross-device sync |
| T22 | update field polygon | dependent analyses invalidated, must re-run |
| T23 | plan timeline status manually changed | UI displays `Farmer reported`, not satellite detected |
| T24 | SQLite absent/corrupted | clear error, no data leakage between anonymous keys |

## Demo walkthrough for judges

**Scene A — Input:** show map zoomed to demo farm, polygon drawn and renamed. Open English/Arabic toggle.

**Scene B — Farm profile:** last 3 years wheat/barley/chickpea or other **explicitly hypothetical or farmer-reported** history, rainfed, multi-select goals. Set priorities weighted water/soil.

**Scene C — Data:** open `Analysis` and show actual NASA POWER observations + source timestamp. If prerecorded permitted, identify cached source and when fetched. No fake `connected` labels for offline fixtures.

**Scene D — Plans:** explain crop constraints, family tradeoffs and why 3 multi-season proposals differ. Open details and scientific evidence.

**Scene E — Interaction:** select plan A, replace two crops only from the feasible list, click `Evaluate`, show source-based before/after and risks, then adopt either version.

**Scene F — Real product continuation:** refresh browser → `My Farm Home` persists chosen plan, timeline, evidence, edit/re-evaluate. No login.

## Evidence and fixture strategy

For a hard-to-reach data service, prepare a **real downloaded excerpt** for a specifically named demo region and record metadata/time/license. Do not fake values under a real-source logo. Keep all demonstration fixtures labelled `SAMPLE` vs actual provider responses. A UI design image with fake numbers is **not** a fixture.

## Quality gate before submission

- All internal links and assets work in ZIP.
- App runs without LLM/market keys.
- NASA response genuinely incorporated into at least one analytical choice.
- All temperature/rain/pH ranges marked draft until reviewed; no universal month.
- Bilingual UI with proper RTL.
- No registration screen, account requirement or paid API requirement without disclosed fallback.
- All three listed plans feasible (or explain why fewer).
- No unsupported numerical yield/profit/soil gains.
- Sources and open-data licenses acknowledged.
