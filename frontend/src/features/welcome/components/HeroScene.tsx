/** Scene 0 hero content — canonical copy per 01_Hero_Parcel_Outline.png. */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ChevronDown, ShieldCheck } from 'lucide-react'
import { useWizard } from '../../../state/wizard'
import { HERO_COPY, UI_COPY } from '../config/welcomeCopy'

export default function HeroScene({ staticMode = false }: { staticMode?: boolean }) {
  const { t } = useTranslation()
  const { resetWizard } = useWizard()

  const scrollAhead = () => window.scrollBy({ top: window.innerHeight, behavior: 'smooth' })

  return (
    <div>
      <h1 className="font-display text-5xl font-extrabold leading-[1.04] tracking-tight text-white sm:text-6xl">
        {t(HERO_COPY.line1)}
        <span className="block">
          {t(HERO_COPY.line2)}{' '}
          <span className="text-[#8FE627]">{t(HERO_COPY.accent)}</span>
        </span>
      </h1>
      <span className="mt-5 block h-1 w-16 rounded-full bg-[#8FE627]" aria-hidden="true" />
      <p className="mt-6 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">
        {t(HERO_COPY.body)}
      </p>
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          to="/fields/new"
          onClick={() => resetWizard()}
          className="btn-leaf inline-flex items-center gap-2.5 px-8 py-4 text-base font-bold shadow-2xl"
        >
          {t(HERO_COPY.cta)}
          <ArrowRight size={17} className="rtl:rotate-180" />
        </Link>
        {!staticMode && (
          <button
            type="button"
            onClick={scrollAhead}
            className="inline-flex items-center gap-1.5 rounded-full border border-white/30 px-5 py-3.5 text-sm font-semibold text-white hover:bg-white/10"
          >
            {t('welcome.ctaSecondary')}
            <ChevronDown size={15} />
          </button>
        )}
      </div>
      <p className="mt-5 flex items-center gap-2 text-xs text-white/65">
        <ShieldCheck size={14} className="shrink-0 text-lime-300" />
        {t('welcome.anonNote')}
      </p>
      <span className="sr-only">{t(UI_COPY.scrollHint)}</span>
    </div>
  )
}
