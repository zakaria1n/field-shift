/** Scene 4 content — "Explore your next rotation." with the illustrative
 * 3-year rotation card, comparison and benefits
 * (reference: 05_Scroll_Rotation_Exploration.png).
 * The rotation shown here explains the workflow; it is not a fabricated
 * live recommendation. */
import { useTranslation } from 'react-i18next'
import { ArrowRight, CheckCircle2, Scale, Sprout } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useWizard } from '../../../state/wizard'
import { SceneCopy } from './ScenePrimitives'
import { ROTATION_COPY, SCENE_COPY, UI_COPY } from '../config/welcomeCopy'

export default function RotationScene() {
  const { t } = useTranslation()
  const { resetWizard } = useWizard()
  const c = SCENE_COPY.rotation

  const years = ROTATION_COPY.years.map((y) => ({
    y: t(y.year),
    crop: t(y.crop),
    note: t(y.note),
  }))

  return (
    <div className="max-w-xl space-y-3 sm:space-y-4">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-lime-300/60 bg-[#0E2921]/40 px-3 py-1 text-xs font-bold text-lime-200 backdrop-blur-md">
        <Sprout size={13} />
        <span>{t(c.kicker)}</span>
      </span>
      <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
        {t(c.title)} <span className="text-[#8FE627]">{t(c.accent)}</span>
      </h2>
      <span className="block h-1 w-14 rounded-full bg-[#8FE627]/80" aria-hidden="true" />
      <p className="max-w-md text-sm leading-relaxed text-white/85 sm:text-base">{t(c.body)}</p>

      {/* illustrative 3-year rotation card */}
      <div className="mt-1 w-[min(92vw,430px)] rounded-2xl border border-white/25 bg-[#0E2921]/55 p-4 shadow-xl backdrop-blur-md">
        <div className="flex items-center justify-between">
          <span className="text-xs font-extrabold text-white">
            {t(ROTATION_COPY.title)}{' '}
            <span className="font-normal text-white/60">({t(ROTATION_COPY.recommended)})</span>
          </span>
          <span className="rounded-full bg-lime-300/20 px-2 py-0.5 text-[10px] font-bold text-lime-200">
            {t(UI_COPY.illustrativeShort)}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
          {years.map((slot) => (
            <div key={slot.y} className="rounded-xl border border-white/15 bg-white/10 p-2">
              <span className="block text-[10px] font-bold text-lime-300">{slot.y}</span>
              <span className="block text-sm font-extrabold text-white">{slot.crop}</span>
              <span className="block text-[10px] text-white/60">{slot.note}</span>
            </div>
          ))}
        </div>
      </div>

      {/* comparison */}
      <div className="flex items-center gap-5 text-xs font-semibold text-white/85">
        <span className="flex items-center gap-1.5">
          <Scale size={14} className="text-lime-300" />
          {t('welcome.cin.rotation.compare')}
        </span>
      </div>

      {/* benefits */}
      <ul className="space-y-1.5 text-xs text-white/85">
        {ROTATION_COPY.benefits.map((b) => (
          <li key={b} className="flex items-center gap-2">
            <CheckCircle2 size={14} className="shrink-0 text-[#8FE627]" />
            {t(b)}
          </li>
        ))}
      </ul>

      <div className="pt-1">
        <Link
          to="/fields/new"
          onClick={() => resetWizard()}
          className="btn-leaf inline-flex items-center gap-2 px-7 py-3.5 text-sm font-bold shadow-2xl"
        >
          {t(UI_COPY.ctaMain)}
          <ArrowRight size={16} className="rtl:rotate-180" />
        </Link>
      </div>
    </div>
  )
}

