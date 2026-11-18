/** Scene 1 content — "Start with your land." + illustrative field-area card
 * (reference: 02_Scroll_Seed_Start.png). */
import { useTranslation } from 'react-i18next'
import { MapPin } from 'lucide-react'
import { SceneCopy } from './ScenePrimitives'
import { SCENE_COPY, UI_COPY } from '../config/welcomeCopy'

export default function LandScene() {
  const { t } = useTranslation()
  const c = SCENE_COPY.land
  return (
    <SceneCopy
      step={<MapPin size={13} aria-hidden="true" />}
      kicker={t(c.kicker)}
      title={t(c.title)}
      accent={t(c.accent)}
      body={t(c.body)}
      ctaLabel={t(c.cta)}
      ctaTo="/fields/new"
    />
  )
}

/** Glass field-area card, top-right per the reference. Values illustrative. */
export function LandAreaCard() {
  const { t } = useTranslation()
  return (
    <div className="rounded-2xl border border-white/25 bg-[#0E2921]/50 p-3 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-bold text-white">
          <MapPin size={14} className="text-lime-300" />
          {t(UI_COPY.fieldArea)}
        </span>
        <span className="font-extrabold text-lime-300">12.6 ha</span>
      </div>
      <p className="mt-1 text-[10px] text-white/60">{t(UI_COPY.illustrative)}</p>
    </div>
  )
}
