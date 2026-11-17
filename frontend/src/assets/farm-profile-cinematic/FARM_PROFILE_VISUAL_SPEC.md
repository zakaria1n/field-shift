# Farm Profile — visual specification

Phase 1 only. Six canonical references under `frontend/FieldShift_UI_Handoff/03_Farm_Profile_and_Priorities/` were inspected. The visual language uses dark emerald, restrained lime, warm upper-left light and transparent weather layers. Reference screenshots include UI; generated backgrounds contain no UI. The photographs are interpretation candidates, not exact copies of the mostly abstract backgrounds in the references.

- Intro: `backgrounds/intro.png`; keep centre/right quiet for real heading and independently generated parcel.
- Questionnaire: `backgrounds/questionnaire.png`; left text and right real 3D parcel; its foliage and horizon may need an overlay for contrast.
- Priorities: `backgrounds/priorities.png`; dark centre for real controls and separately rendered parcel.
- Mobile: cover cropping changes visible landmarks; test crop and text contrast, avoid mirroring text/scene for RTL automatically.
- Weather: `weather/cloud.png` and `weather/rain-cloud.png` are RGBA, alpha 0–254; inspect colored edge fringe at real scale. No rain animation is provided.
- `terrain-materials/dry-soil.png` is color only, not a PBR material. A 2x2 preview reveals repeat seams.

Generation: built-in imagegen. Prompts requested photorealistic, dark emerald clean agricultural backdrops without UI; isolated transparent realistic clouds; orthographic dry soil base color. No independent measured farm content is implied.
