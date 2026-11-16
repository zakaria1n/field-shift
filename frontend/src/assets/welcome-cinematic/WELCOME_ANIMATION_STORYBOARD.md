# Welcome scroll storyboard

Use normalized global progress p in [0,1]. Values are a proposed implementation contract, reversible in either direction, not timings. Navigation remains accessible; do not pin critical content behind scroll interception. All text, CTAs, progress indicators and cards are real HTML.

| Scene | p | Bottom → top layers | Initial → final; transition / fixed items | Risks / reduced motion |
|---|---|---|---|---|
| 0 Hero | 0–0.16 | hero-aerial, dark gradient, hero-field SVG, HTML/nav | SVG stroke-dashoffset 1→0; content opacity/translate; aerial fades to soil near end. Nav fixed only as existing behavior permits. | Cover crop and outline alignment; reduced motion show static completed path and content. |
| 1 Land | .16–.32 | soil-plate, missing seed overlay, field card, copy | Aerial→soil crossfade; seed visible at ground. Content/card enter. | Seed missing; no substitute dashboard data. Reduced motion static plate and HTML. |
| 2 Context | .32–.49 | same soil-plate, missing germination/sprout, context cards, copy | Seed→germination→sprout via aligned alpha crossfades. | Sequence missing. Use static plate until supplied; no fake morph. |
| 3 Conditions | .49–.66 | soil-plate, candidate seedling or verified replacement, environmental cards | Sprout→seedling→developed plant using identical anchor. | Candidate halo and separate-frame alignment unresolved; reduced motion static plant only if approved. |
| 4 Rotation | .66–.84 | soil plate→hero-aerial, optional field SVG, rotation cards | Crossfade close-up into aerial; copy and rotation card transition. | Planted aerial variant and final mature stage missing; do not claim a physically continuous zoom. |
| 5 CTA | .84–1 | hero-aerial fallback, dark overlay, CTA | Final content appears and links to `/fields/new`. | Reference overview asks wheat scene, which is missing; static fallback for reduced motion. |

Clip p into each scene with local t=clamp((p-start)/(end-start),0,1); use deterministic transforms and opacity based on t only. Do not accumulate state on scroll events. Ensure reverse scroll reproduces identical states. Keyboard/touch navigation and prefers-reduced-motion must work without scroll animation. Independent plant shadows, roots, parallax depth and separate background layers are NOT available.


## Update 2026-11-16 — seven candidate stages

`plant-growth/growth_00_seed.png` through `growth_06_developed.png` now exist as 1536×1024 RGBA assets, generated with the former plant as reference. Stage 01 was regenerated from stage 00 to retain the same seed with a tiny root. The old plant remains in `plants/seedling-candidate.png`; stage 04 is a regenerated variant rather than a duplicate. The intended anchor is approximately (768, 952), but seed contact and root tip differ and are not validated as identical. Alpha exists; broad semi-transparent golden halos remain. Early stages 01→02 change seed orientation/position, later leaves change shape and positions, and stage 03→04 jumps substantially in scale. The sequence is a review draft, not production-ready or a verified continuous biological animation. `previews/growth_contact_sheet.png` and `previews/growth_on_soil.png` are browser composites at identical CSS placement, not evidence of perfect soil contact. Fix halos, align anchors and generate bridging frames before implementation; do not claim simple crossfades are sufficient. Hero SVG is separate, visually inspected at its native aspect; responsive cover alignment still requires browser verification. No React animation was implemented.
