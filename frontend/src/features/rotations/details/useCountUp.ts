import { useEffect, useRef, useState } from 'react'

/** Count a displayed score up from 0 to `target` once, after `delayMs`.
 * Reduced motion renders the final value immediately — the number is always
 * the real backend value, never an invented intermediate. */
export function useCountUp(target: number, durationMs: number, reduced: boolean, delayMs = 0): number {
  const [shown, setShown] = useState(() => (reduced ? target : 0))
  const raf = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (reduced) { setShown(target); return }
    timer.current = setTimeout(() => {
      let start: number | null = null
      const tick = (t: number) => {
        if (start === null) start = t
        const p = Math.min(1, (t - start) / durationMs)
        const eased = 1 - Math.pow(1 - p, 3)
        setShown(target * eased)
        if (p < 1) raf.current = requestAnimationFrame(tick)
      }
      raf.current = requestAnimationFrame(tick)
    }, delayMs)
    return () => {
      if (timer.current) clearTimeout(timer.current)
      cancelAnimationFrame(raf.current)
    }
  }, [target, durationMs, reduced, delayMs])
  return shown
}
