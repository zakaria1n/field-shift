/** Hero plate geometry + shared cover transform (WELCOME_VISUAL_SPEC.md).
 * The hero bitmap and the field-outline SVG must render inside ONE wrapper
 * sized/positioned by this math so the golden trace never drifts off the
 * parcel when the image is cropped, positioned or scaled. */
import { useLayoutEffect, useMemo, useState } from 'react'


export const HERO_W = 1672
export const HERO_H = 941

/** The parcel traced by geometry/hero-field.svg, in hero-bitmap pixels. */
export const PARCEL = { x0: 736, y0: 332, x1: 1365, y1: 758 }

export interface CoverLayout {
  width: number
  height: number
  left: number
  top: number
  portrait: boolean
}

/** Standard cover, horizontally biased toward the parcel center. Pure
 * cover — no extra zoom — so the wide reference composition is preserved. */
export function computeCoverLayout(vw: number, vh: number): CoverLayout {
  const portrait = vh / vw > 1.05
  const scale = Math.max(vw / HERO_W, vh / HERO_H)
  const w = HERO_W * scale
  const h = HERO_H * scale
  const parcelCx = (PARCEL.x0 + PARCEL.x1) / 2

  let left = vw / 2 - parcelCx * scale
  left = Math.min(0, Math.max(vw - w, left))
  const top = Math.min(0, Math.max(vh - h, (vh - h) / 2))
  return { width: w, height: h, left, top, portrait }
}

export function useViewportSize() {
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const measure = () => setSize({ w: window.innerWidth, h: window.innerHeight })
    measure()
    window.addEventListener('resize', measure)
    window.addEventListener('orientationchange', measure)
    return () => {
      window.removeEventListener('resize', measure)
      window.removeEventListener('orientationchange', measure)
    }
  }, [])
  return size
}

export function useCoverLayout(): CoverLayout {
  const { w, h } = useViewportSize()
  return useMemo(() => computeCoverLayout(w || 1280, h || 800), [w, h])
}


/** React hook wrapper: viewport-tracked, memoized cover layout. */
export function useCoverLayoutMath(): CoverLayout {
  const { w, h } = useViewportSize()
  return useMemo(() => computeCoverLayout(w || 1280, h || 800), [w, h])
}
