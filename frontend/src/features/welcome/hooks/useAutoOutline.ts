import { useEffect } from 'react'
import { animate, useMotionValue, type MotionValue } from 'framer-motion'

import { AUTO_OUTLINE } from '../animations/heroOutline'
import { useReducedMotionSafe } from './useReducedMotionSafe'

/** Time-based controller for the hero field outline: starts drawing when the
 * page mounts and completes on its own. Deliberately independent from the
 * scroll progress, so scrolling can never rewind or interrupt it. Returns
 * 0→1, where 1 means the outline is fully drawn. */
export function useAutoOutline(): MotionValue<number> {
  const reducedMotion = useReducedMotionSafe()
  const progress = useMotionValue(reducedMotion ? 1 : 0)

  useEffect(() => {
    if (reducedMotion) {
      progress.set(1)
      return
    }
    const controls = animate(progress, 1, {
      delay: AUTO_OUTLINE.delayMs / 1000,
      duration: AUTO_OUTLINE.durationMs / 1000,
      ease: 'easeInOut',
    })
    return () => controls.stop()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return progress
}
