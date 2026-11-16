/** Scene 3 content — "Understand your conditions." + environmental cards
 * (reference: 03_Scroll_Plant_Conditions.png). Values are illustrative
 * examples, never live parcel measurements. */
import { useTranslation } from 'react-i18next'
import { CloudSun, Info, Layers, LineChart, Satellite } from 'lucide-react'
import { GlassCard, SceneCopy } from './ScenePrimitives'
import { CARD_COPY, SCENE_COPY, UI_COPY } from '../config/welcomeCopy'

export default function ConditionsScene() {
  const { t } = useTranslation()
  const c = SCENE_COPY.conditions
  return (
    <SceneCopy
      step={<Satellite size={13} />}
      kicker={t(c.kicker)}
      title={t(c.title)}
      accent={t(c.accent)}
      body={t(c.body)}
    />
  )
}

/** Environmental cards, stacked right per the reference. */
export function ConditionCards() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-3">
      <GlassCard
        icon={<CloudSun size={17} />}
        title={t(CARD_COPY.climate.title)}
        body={t(CARD_COPY.climate.body)}
        value="24°C"
        valueNote={t(UI_COPY.avgTemp)}
      />
      <GlassCard
        icon={<Layers size={17} />}
        title={t(CARD_COPY.soil.title)}
        body={t(CARD_COPY.soil.body)}
        value={t('welcome.cin.card.loam')}
        valueNote={t(UI_COPY.fertility)}
      />
      <GlassCard
        icon={<LineChart size={17} />}
        title={t(CARD_COPY.suitability.title)}
        body={t(CARD_COPY.suitability.body)}
        value={t(UI_COPY.cardHigh)}
        valueNote={t(UI_COPY.suitabilityNote)}
        valueClass="text-[#8FE627]"
      />
      <p className="flex items-center gap-1.5 px-1 text-[10px] text-white/55">
        <Info size={11} className="shrink-0" />
        {t(UI_COPY.illustrative)}
      </p>
    </div>
  )
}

/** Static stacked variant. */
export function ConditionCardsStacked() {
  return <ConditionCards />
}
