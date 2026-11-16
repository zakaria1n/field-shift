/** The seven Phase 1 growth frames stacked at identical placement inside the
 * soil-plate wrapper; scroll progress crossfades adjacent frames. The root
 * anchor (frame-relative) stays on the same ground spot in every stage. */
import { motion } from 'framer-motion'
import type { MotionValue } from 'framer-motion'
import {
  GROUND_Y,
  GROWTH_FRAMES,
  GROWTH_SLOTS,
  PLANT_ANCHOR,
  PLANT_FRAME_H,
  useStageOpacity,
} from '../animations/plantGrowth'
import type { CoverLayout } from '../animations/coverLayout'

export default function PlantGrowth({
  layout,
  progress,
  mounted,
}: {
  layout: { width: number; height: number }
  progress: MotionValue<number>
  mounted: boolean
}) {
  const frameHeight = PLANT_FRAME_H * layout.height
  const frameWidth = frameHeight * (1536 / 1024)
  const top = GROUND_Y * layout.height - PLANT_ANCHOR.y * frameHeight
  const left = layout.width / 2 - frameWidth / 2

  if (!mounted) return null

  return (
    <div className="absolute" style={{ top, left, width: frameWidth, height: frameHeight }}>
      {GROWTH_FRAMES.map((url, i) => (
        <PlantStage
          key={url}
          url={url}
          slot={GROWTH_SLOTS[i]}
          progress={progress}
          priority={i <= 1}
        />
      ))}
      {/* subtle ground-contact shadow */}
      <div
        className="absolute left-1/2 h-[1.8%] w-[24%] -translate-x-1/2 rounded-[100%] bg-black/40 blur-md"
        style={{ top: `${PLANT_ANCHOR.y * 100 - 1}%` }}
        aria-hidden="true"
      />
    </div>
  )
}

function PlantStage({
  url,
  slot,
  progress,
  priority,
}: {
  url: string
  slot: [number, number]
  progress: MotionValue<number>
  priority: boolean
}) {
  const opacity = useStageOpacity(progress, slot)
  return (
    <motion.img
      src={url}
      alt=""
      aria-hidden="true"
      draggable={false}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      className="absolute inset-0 h-full w-full select-none object-fill"
      style={{ opacity }}
    />
  )
}
