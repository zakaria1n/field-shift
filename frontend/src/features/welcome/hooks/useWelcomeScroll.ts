/** Master scroll state for the cinematic Welcome story: normalized progress
 * (spring-smoothed), active scene index, and lazy plant-frame mounting. */
import { useEffect, useRef, useState } from 'react'
import { useScroll, useSpring, useMotionValueEvent, type MotionValue } from 'framer-motion'
import { sceneAt } from '../config/welcomeScenes'

export interface WelcomeScroll {
  containerRef: React.RefObject<HTMLDivElement>
  progress: MotionValue<number>
  activeScene: number
  plantsMounted: boolean
}

export function useWelcomeScroll(): WelcomeScroll {
  const containerRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  })
  // light smoothing = scrub feel; reversible by construction
  const progress = useSpring(scrollYProgress, { stiffness: 160, damping: 30, mass: 0.35 })

  const [activeScene, setActiveScene] = useState(0)
  useMotionValueEvent(progress, 'change', (v) => {
    const idx = sceneAt(v)
    setActiveScene((prev) => (prev === idx ? prev : idx))
  })

  // the ~8 MB of growth frames mount once the story approaches the soil,
  // so the hero stays fast; frames stay mounted afterwards (browser cache)
  const [plantsMounted, setPlantsMounted] = useState(false)

  // Mount the growth frames once the story approaches the soil. A plain
  // window scroll listener keeps this independent of the motion-value
  // plumbing (spring events proved unreliable across tab recreations).
  useEffect(() => {
    const check = () => {
      const c = containerRef.current
      if (!c) return
      const max = Math.max(1, c.offsetHeight - window.innerHeight)
      if (window.scrollY > 0.08 * max) setPlantsMounted(true)
    }
    check()
    window.addEventListener('scroll', check, { passive: true })
    return () => window.removeEventListener('scroll', check)
  }, [containerRef])

  return { containerRef, progress, activeScene, plantsMounted }
}
