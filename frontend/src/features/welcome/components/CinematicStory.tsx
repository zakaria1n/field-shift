/** The cinematic scroll story: a sticky viewport whose layered backgrounds,
 * golden outline, plant growth and six scene content layers all derive from
 * one normalized, spring-smoothed progress value. This component composes
 * the layers; each scene's content lives in its own component file. */
import { motion, useTransform, type MotionValue } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ChevronDown } from 'lucide-react'

import { useCoverLayout } from '../hooks/useCoverLayout'
import { useWelcomeScroll } from '../hooks/useWelcomeScroll'
import { OUTLINE_VISIBILITY } from '../animations/heroOutline'
import { ASSETS, SCENES, SCENE_COUNT } from '../config/welcomeScenes'
import { useSceneReveal } from '../animations/scrollTimeline'

import WelcomeNavbar from './WelcomeNavbar'
import HeroScene from './HeroScene'
import LandScene, { LandAreaCard } from './LandScene'
import FarmerContextScene, { ContextCardsLeft, ContextCardsRight } from './FarmerContextScene'
import ConditionsScene, { ConditionCards } from './ConditionsScene'
import RotationScene from './RotationScene'
import FinalCTAScene from './FinalCTAScene'
import PlantGrowth from './PlantGrowth'
import FieldOutline from './FieldOutline'
import { useAutoOutline } from '../hooks/useAutoOutline'
import { CoverPlate } from './ScenePrimitives'

/** Pointer-events window: a scene layer only accepts clicks while its
 * content is on screen; hidden layers must never block the scenes below. */
function useLayerPointerEvents(progress: MotionValue<number>, start: number, end: number) {
  return useTransform(
    progress,
    [start - 0.04, start + 0.03, end - 0.03, end + 0.04],
    ['none', 'auto', 'auto', 'none'],
  )
}

/** Scene content wrapper: reveal transforms + standard placement. */
function SceneLayer({
  progress,
  copyIn,
  copyOut,
  name,
  children,
}: {
  progress: ReturnType<typeof useWelcomeScroll>['progress']
  copyIn: readonly [number, number]
  copyOut: readonly [number, number]
  name: string
  children: React.ReactNode
}) {
  const reveal = useSceneReveal(progress, copyIn, copyOut)
  const pointerEvents = useLayerPointerEvents(progress, copyIn[0], copyOut[1])
  return (
    <motion.div data-welcome-scene={name} className="absolute inset-0" style={{ opacity: reveal.opacity, y: reveal.y, visibility: reveal.visibility, pointerEvents }}>
      <div className="absolute inset-0 flex items-center">
        <div className="mx-auto w-full max-w-7xl px-6 pt-16 sm:px-12">{children}</div>
      </div>
    </motion.div>
  )
}

/** Left reading scrim (headline side), matching the reference composition. */
function ReadingScrim({ opacity }: { opacity: ReturnType<typeof useTransform> }) {
  return (
    <motion.div
      className="absolute inset-0 bg-gradient-to-r from-[#081A15]/90 via-[#0E2921]/45 to-transparent rtl:bg-gradient-to-l"
      style={{ opacity }}
    />
  )
}

export default function CinematicStory() {
  const { t } = useTranslation()
  const { containerRef, progress, activeScene, plantsMounted } = useWelcomeScroll()
  const layout = useCoverLayout()

  /* background crossfades: aerial (0/4/5) ⇄ soil (1-3) */
  const aerialOpacity = useTransform(progress, [0, 0.145, 0.175, 0.695, 0.725, 1], [1, 1, 0, 0, 1, 1])
  const soilOpacity = useTransform(progress, [0, 0.145, 0.175, 0.695, 0.725, 1], [0, 0, 1, 1, 0, 0])

  /* golden outline: draws automatically on entry (scroll-free), and stays
   * complete; the scroll-driven visibility windows re-show it later */
  const outlineAuto = useAutoOutline()
  const drawOffset = useTransform(outlineAuto, [0, 1], [1, 0])
  const outlineVisibility = useTransform(
    progress,
    OUTLINE_VISIBILITY.flatMap(([a, b, c]) => [a, b, c]),
    [1, 1, 0, 0, 1, 1, 1, 1, 1],
  )

  const scrollHintOpacity = useTransform(progress, [0, 0.05, 0.1], [1, 1, 0])
  // closing scene: fades in and STAYS visible until the end of the page
  const ctaOpacity = useTransform(progress, [SCENES.cta.copyIn[0], (SCENES.cta.copyIn[0] + SCENES.cta.copyIn[1]) / 2], [0, 1])
  const ctaY = useTransform(progress, SCENES.cta.copyIn, [14, 0])
  const ctaPointerEvents = useTransform(progress, SCENES.cta.copyIn, ['none', 'auto'])
  const ctaVisibility = useTransform(progress, value => value >= (SCENES.cta.copyIn[0] + SCENES.cta.copyIn[1]) / 2 ? 'visible' : 'hidden')
  // hero copy: fully visible at p=0, fades out as the outline scene closes
  const heroCopyOpacity = useTransform(progress, [0, (SCENES.hero.copyOut[0] + SCENES.hero.copyOut[1]) / 2, SCENES.hero.copyOut[1]], [1, 1, 0])
  const heroPointerEvents = useTransform(progress, SCENES.hero.copyOut, ['auto', 'none'])
  const heroVisibility = useTransform(progress, value => value < (SCENES.hero.copyOut[0] + SCENES.hero.copyOut[1]) / 2 ? 'visible' : 'hidden')

  return (
    <div>
      <WelcomeNavbar activeScene={activeScene} />

      <div ref={containerRef} data-cinematic className="relative" style={{ height: '740vh' }}>
        <div className="sticky top-0 h-[100svh] w-full overflow-hidden bg-forest-dark">
          {/* ------- aerial plate: scenes 0, 4, 5 ------- */}
          <motion.div className="absolute inset-0" style={{ opacity: aerialOpacity }}>
            <CoverPlate url={ASSETS.heroAerial} layout={layout} />
          </motion.div>

          {/* ------- soil plate + plant: scenes 1-3 ------- */}
          <motion.div className="absolute inset-0" style={{ opacity: soilOpacity }}>
            <CoverPlate url={ASSETS.soilPlate} layout={layout} />
            <PlantGrowth layout={layout} progress={progress} mounted={plantsMounted} />
          </motion.div>

          {/* ------- golden parcel outline: hero + rotation scenes ------- */}
          <FieldOutline
            layout={layout}
            drawOffset={drawOffset}
            opacity={outlineVisibility}
          />

          {/* ------- reading scrims per background ------- */}
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#081A15]/88 via-[#0E2921]/45 to-[#0E2921]/10 rtl:bg-gradient-to-l"
            style={{ opacity: aerialOpacity }}
          />
          <motion.div
            className="absolute inset-0 bg-gradient-to-r from-[#081A15]/85 via-[#0E2921]/40 to-transparent rtl:bg-gradient-to-l"
            style={{ opacity: soilOpacity }}
          />

          {/* ------- scene content layers ------- */}
          <motion.div
            className="absolute inset-0 z-10"
            style={{ opacity: heroCopyOpacity, visibility: heroVisibility, pointerEvents: heroPointerEvents }}
          >
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto w-full max-w-7xl px-6 pt-16 sm:px-12">
                <HeroScene />
              </div>
            </div>
          </motion.div>

          <SceneLayer name="land" progress={progress} copyIn={SCENES.land.copyIn} copyOut={SCENES.land.copyOut}>
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
              <LandScene />
              <div className="hidden w-[300px] lg:block">
                <LandAreaCard />
              </div>
            </div>
          </SceneLayer>

          <SceneLayer name="context" progress={progress} copyIn={SCENES.context.copyIn} copyOut={SCENES.context.copyOut}>
            <div className="grid gap-6 xl:grid-cols-[minmax(0,320px)_1fr_minmax(0,320px)] xl:items-center">
              <div className="xl:-translate-y-8">
                <FarmerContextScene />
              </div>
              <div className="hidden xl:block" aria-hidden="true" />
              <div className="flex flex-col gap-4 xl:-translate-y-8">
                <ContextCardsLeft />
                <ContextCardsRight />
              </div>
            </div>
          </SceneLayer>

          <SceneLayer name="conditions" progress={progress} copyIn={SCENES.conditions.copyIn} copyOut={SCENES.conditions.copyOut}>
            <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
              <ConditionsScene />
              <div className="w-[min(90vw,430px)]">
                <ConditionCards />
              </div>
            </div>
          </SceneLayer>

          <SceneLayer name="rotation" progress={progress} copyIn={SCENES.rotation.copyIn} copyOut={SCENES.rotation.copyOut}>
            <RotationScene />
          </SceneLayer>

          <motion.div
            className="absolute inset-0"
            style={{ opacity: ctaOpacity, y: ctaY, visibility: ctaVisibility, pointerEvents: ctaPointerEvents }}
          >
            <div className="absolute inset-0 bg-[#081A15]/70" />
            <div className="absolute inset-0 flex items-center">
              <div className="mx-auto w-full max-w-7xl px-6 pt-16 sm:px-12">
                <div className="max-w-xl">
                  <FinalCTAScene />
                </div>
              </div>
            </div>
          </motion.div>

          {/* ------- scroll indicator (mouse outline, per reference) ------- */}
          <motion.div
            className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center"
            style={{ opacity: scrollHintOpacity }}
          >
            <button
              type="button"
              onClick={() => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })}
              className="pointer-events-auto flex flex-col items-center gap-1 rounded-full px-3 py-1 text-white/80 hover:text-white"
              aria-label={t('welcome.cin.scrollHint')}
            >
              <span className="flex h-9 w-6 items-start justify-center rounded-full border-2 border-white/70 pt-1.5">
                <span className="h-2 w-1 rounded-full bg-white/80" />
              </span>
              <ChevronDown size={14} className="animate-bounce" />
            </button>
          </motion.div>

          {/* ------- progress dots ------- */}
          <div className="pointer-events-none absolute inset-x-0 bottom-5 z-20 flex justify-center gap-1.5" aria-hidden="true">
            {Array.from({ length: SCENE_COUNT }, (_, i) => (
              <span
                key={i}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  activeScene === i ? 'w-6 bg-lime-300' : 'w-1.5 bg-white/40'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
