/** Master scroll state for the cinematic Welcome story: normalized progress
 * (spring-smoothed), active scene index, and lazy plant-frame mounting. */
import { useEffect, useRef, useState } from 'react'
import { useScroll, useSpring, useMotionValueEvent, type MotionValue } from 'framer-motion'
import { sceneAt } from '../config/welcomeScenes'

/** The bookends skip empty scrolling; the four story steps stay freely scrubbed. */
const SCENE_STOPS = [0, 0.24, 0.4, 0.56, 0.78, 1] as const

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

  useEffect(() => {
    let frame = 0
    let lockedUntil = 0
    const onWheel = (event: WheelEvent) => {
      const container = containerRef.current
      if (!container || event.ctrlKey || event.metaKey || Math.abs(event.deltaY) < 2 || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return
      const top = container.getBoundingClientRect().top + window.scrollY
      const distance = Math.max(1, container.offsetHeight - window.innerHeight)
      const current = (window.scrollY - top) / distance
      if (current < -0.005 || current > 1.005) return
      const direction = Math.sign(event.deltaY)
      // Preserve fine-grained, reversible plant growth throughout steps 1–4.
      if (current >= 0.16 && current < 0.84 && !(current >= 0.78 && direction > 0)) return
      if ((current <= 0 && direction < 0) || (current >= 0.999 && direction > 0)) return
      event.preventDefault()
      if (performance.now() < lockedUntil) return
      const index = sceneAt(Math.max(0, Math.min(1, current)))
      const targetIndex = Math.max(0, Math.min(SCENE_STOPS.length - 1, index + direction))
      const startY = window.scrollY
      const targetY = top + distance * SCENE_STOPS[targetIndex]
      const started = performance.now()
      const duration = 800
      lockedUntil = started + duration + 200
      cancelAnimationFrame(frame)
      const animate = (now: number) => {
        const t = Math.min(1, (now - started) / duration)
        const eased = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
        window.scrollTo(0, startY + (targetY - startY) * eased)
        if (t < 1) frame = requestAnimationFrame(animate)
      }
      frame = requestAnimationFrame(animate)
    }
    window.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      window.removeEventListener('wheel', onWheel)
      cancelAnimationFrame(frame)
    }
  }, [])

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
