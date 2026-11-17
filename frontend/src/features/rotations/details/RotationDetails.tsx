import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Layers3 } from 'lucide-react'
import type { RotationOut } from '../../../api/client'
import { userPrefersReducedMotion } from '../../../state/motionPreference'
import { PlanIdentity } from './PlanIdentity'
import { RotationTimeline } from './RotationTimeline'
import { ScoreConstellation } from './ScoreConstellation'
import { InsightDeck } from './InsightDeck'
import { SEQ } from './entrance'
import './rotation-details.css'

/** Cinematic continuation of the Rotation Explorer expansion: the landscape
 * stays fullscreen (FieldTakeover), this layer settles on top with a
 * choreographed entrance — identity, luminous timeline, year medallions,
 * animated criteria, supporting information last. Composition only: all data
 * comes from the real backend rotation object and is never invented. */
export function RotationDetails({ plan, back }: { plan: RotationOut; back: () => void }) {
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'
  const reduced = Boolean(useReducedMotion()) || userPrefersReducedMotion()
  return (
    <div className="rd-detail" data-testid="rd-root">
      <button
        type="button"
        className="rd-back"
        onClick={back}
        style={reduced ? undefined : { animationDelay: `${SEQ.identity[0]}s` }}
      >
        <ArrowLeft size={17} aria-hidden="true" />{t('rd.backToAll')}
      </button>
      <PlanIdentity plan={plan} reduced={reduced} />
      <RotationTimeline slots={plan.slots} reduced={reduced} />
      <div className="rd-body">
        <ScoreConstellation plan={plan} reduced={reduced} />
        <InsightDeck plan={plan} reduced={reduced} />
      </div>
      <footer
        className="rd-actions"
        style={reduced ? undefined : { animationDelay: `${SEQ.actions}s` }}
        data-testid="rd-actions"
      >
        <Link className="rd-evidence-link" to={`/rotations/${plan.plan_id}`}>
          <Layers3 size={17} aria-hidden="true" />{t('rd.fullCalculations')}
        </Link>
        <span className="rd-art-note">{t('rd.artNote')}</span>
        <Link className="re-button re-use-button" to={`/rotations/${plan.plan_id}/confirmation`} state={{ adoptEdits: null }}>
          {t('plan.useThis')} <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </footer>
    </div>
  )
}
