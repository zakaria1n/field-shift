/** The golden parcel trace (reference: 01_Hero_Parcel_Outline.png) — thin,
 * warm, softly glowing. Geometry from the Phase 1 hand-traced SVG. */

/** Provisional trace of the visible parcel, in hero-bitmap coordinates
 * (visually checked at native aspect per the manifest). */
export const PARCEL_PATH = 'M 961 332 L 1365 421 L 1185 758 L 724 624 Z'

/** Parcel corner vertices, for the completion dots. */
export const PARCEL_CORNERS: Array<[number, number]> = [
  [961, 332],
  [1365, 421],
  [1185, 758],
  [724, 624],
]

export const GOLD = '#F6C445'

/** The hero outline draws ONCE on page entry (time-based, scroll-free):
 * short beat after the hero appears, then a single eased pass. */
export const AUTO_OUTLINE = { delayMs: 700, durationMs: 2200 } as const

/** Visibility windows: hero, then again during the rotation scene. */
export const OUTLINE_VISIBILITY: Array<[number, number, number]> = [
  [0, 0.155, 0.19],
  [0.695, 0.725, 0.86],
  [0.9, 1, 1],
] as Array<[number, number, number]>

export const OUTLINE_STROKE_WIDTH = 2.5
export const OUTLINE_FILL_MAX = 0.12
