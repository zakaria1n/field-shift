/** The golden parcel trace, rendered inside the SAME cover wrapper as the
 * hero bitmap — identical box keeps the thin golden line glued to the
 * parcel under any viewport size or cover cropping.
 * Static variant (plain numbers) is used by the reduced-motion page. */
import { motion, useTransform, type MotionValue } from 'framer-motion'
import {
  GOLD,
  OUTLINE_FILL_MAX,
  OUTLINE_STROKE_WIDTH,
  PARCEL_CORNERS,
  PARCEL_PATH,
} from '../animations/heroOutline'
import type { CoverLayout } from '../animations/coverLayout'

type DrawValue = number | MotionValue<number>

export default function FieldOutline({
  layout,
  drawOffset,
  opacity,
}: {
  layout: CoverLayout
  drawOffset: DrawValue
  opacity: DrawValue
}) {
  return (
    <motion.div
      className="pointer-events-none absolute"
      style={{ width: layout.width, height: layout.height, left: layout.left, top: layout.top, opacity }}
    >
      <svg
        viewBox="0 0 1672 941"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <filter id="welcome-gold-glow" x="-15%" y="-15%" width="130%" height="130%">
            <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={GOLD} floodOpacity="0.7" />
          </filter>
        </defs>
        <GoldenOutlinePaths drawOffset={drawOffset} />
      </svg>
    </motion.div>
  )
}

/** The paths live in a child component so the hook order stays valid when
 * drawOffset is a plain number (static) or a MotionValue (scroll). */
function GoldenOutlinePaths({ drawOffset }: { drawOffset: DrawValue }) {
  const fillOpacity = useFillOpacity(drawOffset)
  return (
    <>
      {/* faint warm tint revealed as the trace completes — never a bright fill */}
      <motion.path
        d={PARCEL_PATH}
        fill={GOLD}
        style={{ opacity: fillOpacity }}
        fillOpacity={OUTLINE_FILL_MAX}
      />
      <motion.path
        d={PARCEL_PATH}
        fill="none"
        stroke={GOLD}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray="1"
        filter="url(#welcome-gold-glow)"
        style={{ strokeDashoffset: drawOffset }}
      />
      {PARCEL_CORNERS.map(([x, y], i) => {
        const appear =
          typeof drawOffset === 'number'
            ? (drawOffset as number) < 0.08
              ? 1
              : 0
            : useCornerAppear(drawOffset as MotionValue<number>, i)
        void i
        return <motion.circle key={`${x}-${y}`} cx={x} cy={y} r={3.5} fill={GOLD} style={{ opacity: appear }} />
      })}
    </>
  )
}

function useFillOpacity(drawOffset: DrawValue) {
  if (typeof drawOffset === 'number') return 1 - drawOffset
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useTransform(drawOffset, [1, 0.2, 0], [0, 0.35, 1])
}

function useCornerAppear(drawOffset: MotionValue<number>, seed: number) {
  void seed
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useTransform(drawOffset, [0.12, 0.04], [0, 1])
}
