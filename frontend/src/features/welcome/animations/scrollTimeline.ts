/** Shared scroll-timeline transforms. Deterministic functions of normalized
 * progress only — no state accumulates on scroll events, so reverse scrolling
 * reproduces identical states. */
import type { MotionValue } from 'framer-motion'
import { useTransform } from 'framer-motion'

const clamp01 = (v: number) => Math.min(1, Math.max(0, v))

/** Opacity with soft in/out shoulders inside [start, end]. Passing
 * `null` progress (static/reduced-motion) yields a constant 1. */
export function useWindowOpacity(
  progress: MotionValue<number> | null,
  start: number,
  end: number,
  fade = 0.3,
): MotionValue<number> | number {
  if (!progress) return 1
  return useTransform(
    progress,
    [start, start + (end - start) * fade, end - (end - start) * fade, end],
    [0, 1, 1, 0],
  )
}

/** Reveal transform pair (opacity + vertical travel) for scene content. */
export function useSceneReveal(
  progress: MotionValue<number> | null,
  copyIn: readonly [number, number],
  copyOut: readonly [number, number],
): { opacity: MotionValue<number> | number; y: MotionValue<number> | number; visibility: MotionValue<'visible' | 'hidden'> | 'visible' } {
  if (!progress) return { opacity: 1, y: 0, visibility: 'visible' }
  const enter = (copyIn[0] + copyIn[1]) / 2
  const exit = (copyOut[0] + copyOut[1]) / 2
  const points = [copyIn[0], enter, exit, copyOut[1]]
  const opacity = useTransform(progress, points, [0, 1, 1, 0])
  // Two paragraphs occupy the same place. Only show the dominant scene so a
  // stopped scroll cannot leave both sets of text superimposed and illegible.
  const visibility = useTransform(progress, value => value >= enter && value < exit ? 'visible' : 'hidden')
  const y = useTransform(
    progress,
    points,
    [14, 0, 0, -14],
  )
  return { opacity, y, visibility }
}
