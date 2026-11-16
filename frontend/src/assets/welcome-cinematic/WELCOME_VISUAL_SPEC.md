# Visual specification

Preserve `frontend/src/features/welcome/Welcome.tsx`, existing copy/localization, navigation, `LanguageSwitch`, router and CTA `/fields/new`. Tokens: `frontend/tailwind.config.js` forest `#0E2921`, leaf `#229E65`; reference lime accents are brighter. Current app uses Plus Jakarta Sans / Cairo and Framer Motion. Reference shows cinematic aerial dark forest overlay, readable white text, lime emphasis. Avoid baked UI or demo observations as real farm data.

Hero uses `backgrounds/hero-aerial.webp` (source PNG 1672×941), dark CSS gradient over image. Separate `geometry/hero-field.svg`, viewBox 1672×941, pathLength=1; provisional corners trace the green parcel in the generated plate, not geographic field coordinates. Human art review needed before final use.

Exact cover transform for image dimensions W=1672 H=941, viewport w,h and object-position px,py in [0,1]: s=max(w/W,h/H), left=(w-sW)*px, top=(h-sH)*py. Put SVG and bitmap in the SAME absolutely-positioned wrapper with width sW, height sH, left/top as above; use viewBox `0 0 1672 941`, preserveAspectRatio `none` only because wrapper has source aspect ratio. Never overlay an independently sized `width:100%;height:100%` SVG over a cover image. Mobile crop may cut the parcel; change object-position for mobile and verify safe area.

`backgrounds/soil-plate.webp` is a single coherent soil plate (1671×941). It can support scenes 1–3 via reversible opacity/camera transforms, not separate depth planes. `plants/seedling-candidate.png` is RGBA but contains a broad translucent golden halo; it is not a clean verified cutout and does not establish a growth sequence. Both assets need visual QA at actual UI sizes. No product text or data is contained in the background plates.
