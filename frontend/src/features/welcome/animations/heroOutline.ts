/** The golden parcel trace (reference: 01_Hero_Parcel_Outline.png) — thin,
 * warm, softly glowing. Geometry from the Phase 1 hand-traced SVG. */

/** Provisional trace of the visible parcel, in hero-bitmap coordinates
 * (visually checked at native aspect per the manifest). */
export const PARCEL_PATH = 'M 980 332 L 1365 421 L 1185 758 L 736 624 Z'

/** Parcel corner vertices, for the completion dots. */
export const PARCEL_CORNERS: Array<[number, number]> = [
  [980, 332],
  [1365, 421],
  [1185, 758],
  [736, 624],
]

export const GOLD = '#F6C445'

/** Draw window inside global progress: starts after a short beat, completes
 * before the hero hands over to the soil scene. */
export const OUTLINE_DRAW: [number, number] = [0.02, 0.14]

/** Visibility windows: hero, then again during the rotation scene. */
export const OUTLINE_VISIBILITY: Array<[number, number, number]> = [
  [0, 0.155, 0.19],
  [0.66, 0.7, 0.86],
  [0.9, 1, 1],
] as Array<[number, number, number]>

export const OUTLINE_STROKE_WIDTH = 2.5
export const OUTLINE_FILL_MAX = 0.12
