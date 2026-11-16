/** Scene 2 content — "Tell us what matters." + the four farmer-context
 * cards flanking the growing plant (reference: 04_Scroll_Your_Priorities.png). */
import { useTranslation } from 'react-i18next'
import { Droplets, SlidersHorizontal, Sprout, Target } from 'lucide-react'
import { GlassCard, SceneCopy } from './ScenePrimitives'
import { CARD_COPY, SCENE_COPY } from '../config/welcomeCopy'

export default function FarmerContextScene() {
  const { t } = useTranslation()
  const c = SCENE_COPY.context
  return (
    <SceneCopy
      step={<span className="font-mono">2</span>}
      kicker={t(c.kicker)}
      title={t(c.title)}
      accent={t(c.accent)}
      body={t(c.body)}
      ctaLabel={t(c.cta)}
      ctaTo="/fields/new"
    />
  )
}

/** Left pair: Irrigation + Previous Crops. */
export function ContextCardsLeft() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <GlassCard
        icon={<Droplets size={17} />}
        title={t(CARD_COPY.irrigation.title)}
        body={t(CARD_COPY.irrigation.body)}
      />
      <GlassCard
        icon={<Sprout size={17} />}
        title={t(CARD_COPY.previous.title)}
        body={t(CARD_COPY.previous.body)}
      />
    </div>
  )
}

/** Right pair: Goals + Priorities. */
export function ContextCardsRight() {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4">
      <GlassCard
        icon={<Target size={17} />}
        title={t(CARD_COPY.goals.title)}
        body={t(CARD_COPY.goals.body)}
      />
      <GlassCard
        icon={<SlidersHorizontal size={17} />}
        title={t(CARD_COPY.priorities.title)}
        body={t(CARD_COPY.priorities.body)}
      />
    </div>
  )
}

/** Static (reduced-motion / small-screen) stacked variant. */
export function ContextCardsStacked() {
  const { t } = useTranslation()
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <GlassCard
        icon={<Droplets size={17} />}
        title={t(CARD_COPY.irrigation.title)}
        body={t(CARD_COPY.irrigation.body)}
      />
      <GlassCard
        icon={<Sprout size={17} />}
        title={t(CARD_COPY.previous.title)}
        body={t(CARD_COPY.previous.body)}
      />
      <GlassCard
        icon={<Target size={17} />}
        title={t(CARD_COPY.goals.title)}
        body={t(CARD_COPY.goals.body)}
      />
      <GlassCard
        icon={<SlidersHorizontal size={17} />}
        title={t(CARD_COPY.priorities.title)}
        body={t(CARD_COPY.priorities.body)}
      />
    </div>
  )
}
