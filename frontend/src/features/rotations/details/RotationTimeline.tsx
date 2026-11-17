import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Leaf } from 'lucide-react'
import type { SlotOut } from '../../../api/client'
import { getCropAsset } from '../../../assets/crops/cropRegistry'
import { SEQ } from './entrance'

/** The cinematic three-year rotation timeline — the hero of the Details screen.
 *
 * A luminous golden path flows exactly through the three crop medallions; the
 * active year is prominent (halo + lift) and selectable. The track is
 * intentionally LTR in both languages, matching the Rotation Explorer's
 * `.re-plans` convention; text inside nodes follows the document direction. */
export function RotationTimeline({ slots, reduced }: { slots: SlotOut[]; reduced: boolean }) {
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'
  const [active, setActive] = useState(0)
  const lightRef = useRef<SVGPathElement>(null)
  const orbRef = useRef<SVGCircleElement>(null)
  // The trajectory arcs ABOVE the crop medallions: it dips to touch each
  // medallion's crown (x 120/500/880 at y 64) and rises between years, so the
  // line frames the journey instead of cutting through the imagery.
  const track = 'M 120 64 C 250 6, 380 128, 500 64 C 620 6, 750 128, 880 64'
  useEffect(() => {
    const path = lightRef.current
    const orb = orbRef.current
    if (!path || !orb) return
    if (reduced) {
      path.style.strokeDashoffset = '0'
      orb.style.opacity = '0'
      return
    }
    const length = path.getTotalLength()
    const start = performance.now() + SEQ.path * 1000
    let frame = 0
    const tick = (now: number) => {
      const progress = Math.max(0, Math.min(1, (now - start) / 3000))
      const point = path.getPointAtLength(length * progress)
      path.style.strokeDashoffset = String(1 - progress)
      orb.setAttribute('cx', String(point.x))
      orb.setAttribute('cy', String(point.y))
      orb.style.opacity = now >= start ? '1' : '0'
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [reduced, track])
  return (
    <section className="rd-timeline" aria-label={ar ? 'تسلسل الدورة ثلاثي السنوات' : 'Three-year rotation sequence'} data-testid="rd-timeline">
      <div className="rd-track">
        <svg className="rd-track-svg" viewBox="0 0 1000 156" preserveAspectRatio="none" focusable="false" aria-hidden="true">
          <defs>
            <linearGradient id="rd-path-gradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#ffe9a3" />
              <stop offset=".5" stopColor="#ffcf5a" />
              <stop offset="1" stopColor="#ffe9a3" />
            </linearGradient>
          </defs>
          <path className="rd-track-guide" d={track} />
          <path ref={lightRef} className="rd-track-light" d={track} pathLength={1} />
          <circle ref={orbRef} className="rd-track-orb" r="3" cx="120" cy="64" />
        </svg>
        <ol className="rd-years">
          {slots.map((slot, index) => {
            const asset = slot.crop_id ? getCropAsset(slot.crop_id) : null
            const isActive = active === index
            return (
              <li
                key={slot.slot_id}
                className={`rd-year ${isActive ? 'is-active' : ''}`}
                style={{ '--rd-x': `${12 + index * 38}%`, animationDelay: `${SEQ.years[index] ?? SEQ.years[SEQ.years.length - 1]}s` } as React.CSSProperties}
              >
                <button
                  type="button"
                  className="rd-year-node"
                  aria-pressed={isActive}
                  onClick={() => setActive(index)}
                  data-testid={`rd-year-${index}`}
                  data-crop-id={slot.crop_id ?? ''}
                >
                  <span className="rd-year-halo" aria-hidden="true" key={`halo-${isActive}`} />
                  <span className="rd-year-image">{asset?.image ? <img src={asset.image} alt="" /> : <Leaf size={28} />}</span>
                </button>
                <span className="rd-year-copy">
                  <small>{t('timeline.year', { n: slot.year_number })}</small>
                  <strong>{(ar ? slot.name_ar : slot.name_en) || slot.crop_id || t('plan.fallow')}</strong>
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
