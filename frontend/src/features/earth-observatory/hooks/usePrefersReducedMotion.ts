import { useEffect, useState } from 'react'

/** jsdom-safe matchMedia guard for prefers-reduced-motion. */
export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    try {
      return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
    } catch {
      return false
    }
  })

  useEffect(() => {
    try {
      const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
      if (!query) return
      const onChange = (event: MediaQueryListEvent) => setReduced(event.matches)
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    } catch {
      /* matchMedia unavailable */
    }
  }, [])

  return reduced
}
