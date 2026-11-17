import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, CheckCircle2 } from 'lucide-react'
import { api, type AdoptedPlan, type RotationOut } from '../../../api/client'
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
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState(false)
  async function adopt() {
    if (saving || saved) return
    setSaving(true)
    setSaveError(false)
    try {
      await api.post<AdoptedPlan>(`/api/v1/rotations/${plan.plan_id}/adopt`, {})
      setSaved(true)
    } catch {
      setSaveError(true)
    } finally {
      setSaving(false)
    }
  }
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
        <span className="rd-art-note">{t('rd.artNote')}</span>
        <button type="button" className="re-button re-use-button" disabled={saving || saved} onClick={adopt}>
          {saved ? (ar ? 'تم حفظ الخطة' : 'Plan saved') : saving ? t('common.loading') : t('plan.useThis')} {saved ? <CheckCircle2 size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
        </button>
        <p className="rd-save-status" role={saveError ? 'alert' : 'status'} aria-live="polite">{saved ? (ar ? 'تم حفظ اختيارك لهذا الحقل.' : 'Your choice was saved for this field.') : saveError ? (ar ? 'تعذر حفظ الخطة. يرجى المحاولة مجددًا.' : 'The plan could not be saved. Please try again.') : ''}</p>
      </footer>
    </div>
  )
}
