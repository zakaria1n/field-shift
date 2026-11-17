import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import {
  Beef,
  CloudRain,
  HelpCircle,
  Leaf,
  ShieldAlert,
  Sprout,
  Store,
  TrendingUp,
  Utensils,
} from 'lucide-react'

import rainCloud from '../../../assets/farm-profile-cinematic/weather/rain-cloud.png'
import softCloud from '../../../assets/farm-profile-cinematic/weather/cloud.png'
import type { ProfileStep } from '../three/ProceduralField3D'

export interface HistoryCardData {
  label: string
  image: string | null
  cropId: string | null
  group: string
  accent: string
  bgLight: string
}

export interface SceneEffectsProps {
  step: ProfileStep
  irrigationType: 'rainfed' | 'irrigated' | 'mixed' | 'unknown'
  historyCards: HistoryCardData[]
  purposes: string[]
  excludedCount: number
  priorities: { water: number; soil: number; yield: number; risk: number }
}

/** Step-specific 2D overlays floating around the shared illustration —
 * clouds/rain, history cards, purpose icons, exclusion marker, priority
 * badges. Everything reflects the farmer's actual answers; purely
 * decorative and never presented as observed data. */

function RainLayer() {
  const drops = Array.from({ length: 26 }, (_, i) => ({
    left: 18 + ((i * 83) % 64),
    delay: (i % 9) * 0.24,
    duration: 0.9 + ((i * 7) % 5) * 0.12,
    height: 14 + ((i * 13) % 12),
  }))
  return (
    <div className="absolute inset-x-[14%] top-[16%] h-[46%] overflow-visible" aria-hidden>
      {drops.map((drop, index) => (
        <span
          key={index}
          className="farm-rain-drop absolute w-[2px] rounded-full bg-[#A8CCF0]/75"
          style={{
            left: `${drop.left}%`,
            height: `${drop.height}px`,
            animationDelay: `${drop.delay}s`,
            animationDuration: `${drop.duration}s`,
          }}
        />
      ))}
    </div>
  )
}

function WeatherLayer({ irrigationType }: { irrigationType: SceneEffectsProps['irrigationType'] }) {
  if (irrigationType === 'unknown') return null
  const rainfed = irrigationType === 'rainfed'
  const mixed = irrigationType === 'mixed'
  return (
    <div className="absolute inset-0" aria-hidden>
      <img
        src={rainCloud}
        alt=""
        className="farm-cloud absolute left-[6%] top-[2%] w-[42%] drop-shadow-[0_10px_24px_rgba(0,0,0,0.4)]"
      />
      {(mixed || !rainfed) && (
        <img
          src={softCloud}
          alt=""
          className="farm-cloud-delayed absolute right-[4%] top-[6%] w-[34%] opacity-80 drop-shadow-[0_10px_24px_rgba(0,0,0,0.35)]"
        />
      )}
      <RainLayer />
    </div>
  )
}

function HistoryLayer({ cards }: { cards: HistoryCardData[] }) {
  const count = Math.max(1, cards.length)
  return (
    <div className="absolute inset-x-[6%] top-[2%] h-[46%]" aria-hidden={false}>
      {/* curved dotted connector from the cards down to the terrain */}
      <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {cards.map((_, index) => {
          const x = count === 1 ? 50 : 14 + (index * 72) / (count - 1)
          return (
            <g key={index}>
              <path
                d={`M ${x} 30 C ${x - 3} 55, ${x - 6} 68, ${x - 7} 88`}
                fill="none"
                stroke="#D9F99D"
                strokeWidth="0.45"
                strokeDasharray="1.6 1.6"
                opacity="0.7"
              />
              <circle cx={x - 7} cy={88} r="0.9" fill="#D9F99D" opacity="0.9" />
            </g>
          )
        })}
      </svg>
      <div className="absolute inset-x-0 top-0 flex justify-between">
        {cards.map((card, index) => {
          const tilt = index < count / 2 ? -9 : 9
          const planted = card.image !== null
          return (
            <div
              key={`${card.label}-${index}`}
              className="farm-history-card w-[30%] max-w-[190px] overflow-hidden rounded-xl border border-white/35 shadow-[0_18px_38px_rgba(0,0,0,0.5)]"
              style={{ transform: `perspective(700px) rotateY(${tilt}deg) rotateX(${index % 2 ? 3 : -2}deg)` }}
            >
              {planted ? (
                <img src={card.image ?? undefined} alt="" className="h-[92px] w-full object-cover" />
              ) : card.cropId ? (
                <div
                  className="flex h-[92px] w-full items-center justify-center text-4xl font-extrabold"
                  style={{ background: `linear-gradient(160deg, ${card.bgLight} 0%, rgba(18,40,30,0.95) 120%)`, color: card.accent }}
                >
                  {(card.label.split('· ')[1] || '?').trim().charAt(0)}
                </div>
              ) : card.label.includes('–') ? (
                <div className="flex h-[92px] items-center justify-center bg-[#12281E] text-2xl text-white/35">⏸</div>
              ) : (
                <div className="flex h-[92px] items-center justify-center bg-[#12281E] text-2xl text-white/35">?</div>
              )}
              <p className="truncate bg-white/95 px-2 py-1.5 text-[12px] font-extrabold text-[#17352D]">
                <bdi>{card.label}</bdi>
              </p>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const PURPOSE_BADGES: Record<string, { icon: typeof Store; position: string }> = {
  sell: { icon: Store, position: 'left-[2%] top-[8%]' },
  livestock_feed: { icon: Beef, position: 'right-[6%] top-[2%]' },
  household_food: { icon: Utensils, position: 'left-[4%] bottom-[30%]' },
  soil_restoration: { icon: Sprout, position: 'right-[2%] bottom-[36%]' },
}

/** Purpose icons genuinely travel along an elliptical orbit around the
 * illustration (Web Animations API, 24s/revolution, upright badges, phase
 * offset per purpose). No orbit ring is drawn — the path is mathematical.
 * Deselected purposes fade out; remaining icons keep travelling. */
function PurposeOrbitAnimation({ purposes }: { purposes: string[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iconRefs = useRef<Array<HTMLDivElement | null>>([])
  const [size, setSize] = useState({ w: 0, h: 0 })
  const reduced = useMemo(
    () => (typeof window !== 'undefined' ? Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) : false),
    [],
  )

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  // Ellipse tuned for the isometric look: wider than tall, outside the terrain.
  const rx = Math.max(120, Math.min(size.w * 0.44, 330))
  const ry = Math.max(70, Math.min(size.h * 0.34, rx * 0.6))

  useEffect(() => {
    const animations: Animation[] = []
    iconRefs.current.forEach((el, index) => {
      if (!el) return
      const phase = (360 / Math.max(1, iconRefs.current.filter(Boolean).length)) * index
      if (reduced || rx <= 0) {
        const a = (phase * Math.PI) / 180
        el.style.transform = `translate(calc(-50% + ${Math.cos(a) * rx}px), calc(-50% + ${Math.sin(a) * ry}px))`
        return
      }
      const frames: Array<{ transform: string; offset: number }> = []
      const steps = 36
      for (let k = 0; k <= steps; k++) {
        const angle = ((phase + (k / steps) * 360) * Math.PI) / 180
        const x = Math.cos(angle) * rx
        const y = Math.sin(angle) * ry
        frames.push({ transform: `translate(calc(-50% + ${x.toFixed(1)}px), calc(-50% + ${y.toFixed(1)}px))`, offset: k / steps })
      }
      animations.push(el.animate(frames, { duration: 26000, iterations: Infinity }))
    })
    return () => animations.forEach((a) => a.cancel())
  }, [purposes, rx, ry, reduced])

  const active = purposes.filter((p) => PURPOSE_BADGES[p])
  return (
    <div ref={containerRef} className="absolute inset-0">
      <AnimatePresence>
        {active.map((purpose, index) => {
          const meta = PURPOSE_BADGES[purpose]
          const Icon = meta.icon
          return (
            <motion.div
              key={purpose}
              ref={(el) => { iconRefs.current[index] = el }}
              className="absolute left-1/2 top-1/2 z-10"
              initial={{ opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.4 }}
              transition={{ duration: 0.35 }}
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#8FE627]/70 bg-[#0B1410]/85 text-[#A3E635] shadow-[0_0_24px_rgba(143,230,39,0.35)] backdrop-blur-sm">
                <Icon size={19} />
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}

/** Detached planning-constraint counter: floats at the top-right of the
 * scene, clearly NOT part of the illustrated farmland. */
function ConstraintsLayer({ excludedCount }: { excludedCount: number }) {
  if (excludedCount === 0) return null
  return (
    <div className="absolute end-3 top-2 z-10" aria-hidden>
      <div className="flex items-center gap-2 rounded-full border border-[#FF8B78]/60 bg-[#2A0F0C]/85 py-1.5 pe-3 ps-1.5 shadow-lg backdrop-blur-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[#FF8B78] bg-[#DC2626]/25 text-[#FF9C8B]">
          <ShieldAlert size={14} />
        </span>
        <span className="text-[11px] font-bold text-[#FF9C8B]">{excludedCount}</span>
      </div>
    </div>
  )
}

const PRIORITY_BADGES: Record<string, { icon: typeof CloudRain; color: string; position: string }> = {
  water: { icon: CloudRain, color: '#7FB8D8', position: 'left-1/2 top-[0%] -translate-x-1/2' },
  soil: { icon: Leaf, color: '#8FE627', position: 'left-[0%] top-[34%]' },
  yield: { icon: TrendingUp, color: '#EFC65A', position: 'right-[0%] top-[30%]' },
  risk: { icon: HelpCircle, color: '#CFE3D8', position: 'left-1/2 bottom-[6%] -translate-x-1/2' },
}

function PrioritiesLayer({ priorities }: { priorities: SceneEffectsProps['priorities'] }) {
  const { t } = useTranslation()
  const keys = ['water', 'soil', 'yield', 'risk'] as const
  const labels: Record<string, string> = {
    water: t('mixer.water'),
    soil: t('mixer.soil'),
    yield: t('mixer.yield'),
    risk: t('mixer.risk'),
  }
  return (
    <div className="absolute inset-0" aria-hidden>
      {keys.map((key) => {
        const meta = PRIORITY_BADGES[key]
        const Icon = meta.icon
        return (
          <div key={key} className={`absolute ${meta.position} flex flex-col items-center gap-1`}>
            <span
              className="flex h-11 w-11 items-center justify-center rounded-full border-2 bg-[#0B1410]/85 backdrop-blur-sm"
              style={{ borderColor: `${meta.color}99`, color: meta.color, boxShadow: `0 0 22px ${meta.color}44` }}
            >
              <Icon size={19} />
            </span>
            <span
              className="rounded-full border bg-[#0B1410]/85 px-2.5 py-0.5 text-[12px] font-extrabold text-white"
              style={{ borderColor: `${meta.color}55` }}
              data-testid={`parcel-priority-${key}`}
            >
              {priorities[key]}%
            </span>
            <span className="text-[10px] font-bold text-white/55">{labels[key]}</span>
          </div>
        )
      })}
    </div>
  )
}

/** Layered step effects over the shared illustration. */
export default function FarmSceneEffects(props: SceneEffectsProps) {
  const { step, irrigationType, historyCards, purposes, excludedCount, priorities } = props
  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {step === 'irrigation' && <WeatherLayer irrigationType={irrigationType} />}
      {step === 'history' && <HistoryLayer cards={historyCards} />}
      {step === 'purpose' && <PurposeOrbitAnimation purposes={purposes} />}
      {step === 'constraints' && <ConstraintsLayer excludedCount={excludedCount} />}
      {step === 'priorities' && <PrioritiesLayer priorities={priorities} />}
    </div>
  )
}
