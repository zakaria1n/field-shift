import { memo, useEffect, useId, useRef } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'framer-motion'
import { edgePath, regionPaths, wipeEdges } from './fieldRegions'
import { rotationImages } from './cinematicAssets'

/** The three photos never move. A shared numeric front erases/reveals masks. */
export const RotationImageComposition = memo(function RotationImageComposition({ selected, emphasis, reduced, onMotionState }: { selected: number | null; emphasis: number | null; reduced: boolean; onMotionState: (moving: boolean) => void }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const direction = useRef<number | null>(null)
  const progress = useMotionValue(0)
  const pathB = useTransform(progress, p => { const [l, r] = wipeEdges(direction.current, p); return regionPaths(l, r)[1] })
  const pathC = useTransform(progress, p => { const [l, r] = wipeEdges(direction.current, p); return regionPaths(l, r)[2] })
  const leftEdge = useTransform(progress, p => edgePath(wipeEdges(direction.current, p)[0]))
  const rightEdge = useTransform(progress, p => edgePath(wipeEdges(direction.current, p)[1]))

  useEffect(() => {
    let cancelled = false
    let control: ReturnType<typeof animate> | undefined
    const duration = reduced ? 0 : 1.9
    const run = async () => {
      if (selected === null && progress.get() === 0) { onMotionState(false); return }
      onMotionState(true)
      // A direction change during a reverse first returns to the same resting
      // geometry, then starts the next wipe. This avoids discontinuous masks.
      if (selected !== null && direction.current !== null && direction.current !== selected && progress.get() > 0) {
        control = animate(progress, 0, { duration, ease: [0.42, 0, 0.58, 1] })
        await control
        if (cancelled) return
      }
      if (selected !== null) direction.current = selected
      // Notify derived paths even when changing direction at a zero value.
      progress.jump(progress.get())
      control = animate(progress, selected === null ? 0 : 1, { duration, ease: [0.42, 0, 0.58, 1] })
      await control
      if (!cancelled) onMotionState(false)
    }
    void run()
    return () => { cancelled = true; control?.stop() }
  }, [selected, reduced, progress, onMotionState])

  return <div className="re-composition" aria-hidden="true" data-testid="rotation-composition">
    <svg className="re-takeover-defs" width="0" height="0"><defs>
      {[pathB, pathC].map((path, index) => <clipPath key={index} id={`${id}-region-${index + 1}`} clipPathUnits="objectBoundingBox"><motion.path d={path} /></clipPath>)}
    </defs></svg>
    {rotationImages.plans.map((image, index) => <div key={index} className={`re-composition-image ${emphasis !== null && emphasis !== index ? 'is-dim' : ''}`} data-region={index} style={{ backgroundImage: `url(${image})`, ...(index ? { clipPath: `url(#${id}-region-${index})` } : {}) }} />)}
    <svg className="re-composition-borders" viewBox="0 0 1 1" preserveAspectRatio="none">
      <defs><linearGradient id={`${id}-fade`} x1="0" y1="0" x2="0" y2="1" gradientUnits="userSpaceOnUse"><stop offset="0.23" stopColor="white" stopOpacity="0" /><stop offset="0.36" stopColor="white" /><stop offset="1" stopColor="white" /></linearGradient><mask id={`${id}-land`} maskUnits="userSpaceOnUse" x="0" y="0" width="1" height="1"><rect width="1" height="1" fill={`url(#${id}-fade)`} /></mask></defs>
      <g mask={`url(#${id}-land)`}>{[leftEdge, rightEdge].map((path, index) => <g key={index} className={`${emphasis === 1 || emphasis === (index === 0 ? 0 : 2) ? 'is-selected' : ''} ${emphasis !== null && emphasis !== 1 && emphasis !== (index === 0 ? 0 : 2) ? 'is-muted' : ''}`}><motion.path d={path} pathLength={1} vectorEffect="non-scaling-stroke" className="re-composition-halo" /><motion.path d={path} pathLength={1} vectorEffect="non-scaling-stroke" className="re-composition-border" /></g>)}</g>
    </svg>
  </div>
})
