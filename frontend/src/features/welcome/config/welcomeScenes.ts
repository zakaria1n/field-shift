import heroAerialUrl from '../../../assets/welcome-cinematic/backgrounds/hero-aerial.webp'
import soilPlateUrl from '../../../assets/welcome-cinematic/backgrounds/soil-plate.webp'

/** Prepared Phase 1 background plates (optimized webp conversions). */
export const ASSETS = {
  heroAerial: heroAerialUrl,
  soilPlate: soilPlateUrl,
} as const

/** Scene timing contract (WELCOME_ANIMATION_STORYBOARD.md): normalized
 * progress p ∈ [0,1], reversible; content windows are sub-ranges of scenes. */
export const SCENES = {
  hero: { start: 0, end: 0.16, copyOut: [0.085, 0.13] as [number, number] },
  land: { start: 0.16, end: 0.32, copyIn: [0.165, 0.215] as [number, number], copyOut: [0.295, 0.335] as [number, number] },
  context: { start: 0.32, end: 0.49, copyIn: [0.335, 0.385] as [number, number], copyOut: [0.46, 0.5] as [number, number] },
  conditions: { start: 0.49, end: 0.66, copyIn: [0.505, 0.555] as [number, number], copyOut: [0.63, 0.67] as [number, number] },
  rotation: { start: 0.66, end: 0.84, copyIn: [0.675, 0.725] as [number, number], copyOut: [0.82, 0.86] as [number, number] },
  cta: { start: 0.84, end: 1, copyIn: [0.87, 0.925] as [number, number] },
} as const

export type SceneName = keyof typeof SCENES

export const SCENE_COUNT = 6

export function sceneAt(p: number): number {
  if (p < 0.16) return 0
  if (p < 0.32) return 1
  if (p < 0.49) return 2
  if (p < 0.66) return 3
  if (p < 0.84) return 4
  return 5
}

/** Where the nav links land (normalized progress targets). */
export const NAV_TARGETS = { home: 0, s2: 0.38, s3: 0.56, sources: 1 } as const
