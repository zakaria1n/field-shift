/** Scene 5 content — canonical closing: "Your land. Your decision."
 * (storyboard reference 06). CTA routes into the real field workflow. */
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, ShieldCheck } from 'lucide-react'
import { useWizard } from '../../../state/wizard'
import { SCENE_COPY, UI_COPY } from '../config/welcomeCopy'

export default function FinalCTAScene() {
  const { t } = useTranslation()
  const { resetWizard } = useWizard()
  const c = SCENE_COPY.cta
  return (
    <div className="max-w-xl">
      <h2 className="font-display text-5xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
        {t(c.title)}
        <span className="block text-[#8FE627]">{t(c.accent)}</span>
      </h2>
      <span className="mt-5 block h-1 w-16 rounded-full bg-[#8FE627]" aria-hidden="true" />
      <p className="mt-6 max-w-md text-base leading-relaxed text-white/90 sm:text-lg">{t(c.body)}</p>
      <div className="mt-8">
        <Link
          to="/fields/new"
          onClick={() => resetWizard()}
          className="btn-leaf inline-flex items-center gap-2.5 px-8 py-4 text-base font-bold shadow-2xl"
        >
          {t(UI_COPY.ctaMain)}
          <ArrowRight size={17} className="rtl:rotate-180" />
        </Link>
      </div>
      <p className="mt-5 flex items-center gap-2 text-xs text-white/65">
        <ShieldCheck size={14} className="shrink-0 text-lime-300" />
        {t('welcome.anonNote')}
      </p>
    </div>
  )
}
