/** Plant-growth sequencing (Phase 1 candidate frames).
 *
 * The seven frames share one 1536×1024 canvas with an intended root anchor
 * at ≈(768, 952). Rendering every frame at IDENTICAL placement keeps the
 * base on the same ground spot; scroll progress crossfades adjacent frames.
 *
 * Honest limitation (mirrors the storyboard): the candidate stages have
 * slight anchor/shape drift and stage 03→04 jumps in scale — this is a
 * controlled frame crossfade, not a verified continuous biological morph. */
import growth00 from '../../../assets/welcome-cinematic/plant-growth/growth_00_seed.png'
import growth01 from '../../../assets/welcome-cinematic/plant-growth/growth_01_germination.png'
import growth02 from '../../../assets/welcome-cinematic/plant-growth/growth_02_emergence.png'
import growth03 from '../../../assets/welcome-cinematic/plant-growth/growth_03_seedling.png'
import growth04 from '../../../assets/welcome-cinematic/plant-growth/growth_04_intermediate.png'
import growth05 from '../../../assets/welcome-cinematic/plant-growth/growth_05_advanced.png'
import growth06 from '../../../assets/welcome-cinematic/plant-growth/growth_06_developed.png'
import type { MotionValue } from 'framer-motion'
import { useTransform } from 'framer-motion'

export const PLANT_W = 1536
export const PLANT_H = 1024
/** Root/ground anchor as a fraction of the frame (x, y). */
export const PLANT_ANCHOR = { x: 768 / PLANT_W, y: 952 / PLANT_H }

export const GROWTH_FRAMES = [
  growth00, growth01, growth02, growth03, growth04, growth05, growth06,
]

/** Global progress slots per frame (adjacent frames crossfade). */
export const GROWTH_SLOTS: Array<[number, number, number, number]> = [
  [0.145, 0.175, 0.30, 0.33],
  [0.30, 0.33, 0.39, 0.42],
  [0.39, 0.42, 0.475, 0.505],
  [0.475, 0.505, 0.555, 0.585],
  [0.555, 0.585, 0.60, 0.62],
  [0.60, 0.62, 0.625, 0.645],
  [0.625, 0.645, 0.695, 0.725],
]

/** Ground line as a fraction of the plate height. */
export const GROUND_Y = 0.74
/** Rendered plant-frame height as a fraction of the plate height. */
export const PLANT_FRAME_H = 0.6

/** Crossfade opacity window for one growth frame. */
export function useStageOpacity(progress: MotionValue<number>, slot: [number, number, number, number]) {
  return useTransform(progress, slot, [0, 1, 1, 0])
}
