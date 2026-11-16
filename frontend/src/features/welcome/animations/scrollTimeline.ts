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
  start: number,
  end: number,
): { opacity: MotionValue<number> | number; y: MotionValue<number> | number } {
  if (!progress) return { opacity: 1, y: 0 }
  const opacity = useWindowOpacity(progress, start, end, 0.32)
  const y = useTransform(
    progress,
    [start, start + (end - start) * 0.32, end - (end - start) * 0.32, end],
    [36, 0, 0, -28],
  )
  return { opacity, y }
}
