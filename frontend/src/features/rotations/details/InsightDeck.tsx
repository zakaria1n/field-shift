import { useTranslation } from 'react-i18next'
import { CircleAlert, Database, Info, TriangleAlert } from 'lucide-react'
import type { RotationOut } from '../../../api/client'
import { SEQ } from './entrance'
import { missingInformation, readableEvidenceNotes, sourceName, yieldCoverage } from './analysisExplanations'

/** Supporting information with a deliberate hierarchy and light footprint.
 *
 * Primary: the plain-language rationale ("Why this rotation?"). Secondary:
 * the main limitation and honest data availability. Technical evidence stays
 * accessible through progressive disclosure; unavailable items are stated as
 * unavailable — nothing is invented. */
export function InsightDeck({ plan, reduced }: { plan: RotationOut; reduced: boolean }) {
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'
  const limitation = (ar ? plan.main_limitation_ar : plan.main_limitation_en) ?? plan.main_limitation_en
  const notes = readableEvidenceNotes(plan, ar)
  const coverage = yieldCoverage(plan, ar)
  const missing = plan.evidence.missing_information
  const labels = (keys: string[]) => keys.map(key => {
    const indicator = plan.score.indicators.find(item => item.key === key)
    return indicator ? (ar ? indicator.label_ar : indicator.label_en) : (ar ? 'مؤشر آخر' : 'Other indicator')
  }).join('، ')
  const availabilityRows = [
    coverage,
    plan.score.data_quality_note ? (ar ? 'التنقيط مرجعي وليس احتمالاً؛ قارن النتائج عند تشابه الأولويات وتغطية البيانات.' : 'Scores are references, not probabilities; compare plans with similar priorities and data coverage.') : null,
    plan.score.partial_dimensions?.length ? `${t('rd.partialDimensions')}: ${labels(plan.score.partial_dimensions)}` : null,
    plan.score.evaluated_dimensions?.length ? `${t('rd.evaluatedDimensions')}: ${labels(plan.score.evaluated_dimensions)}` : null,
  ].filter(Boolean) as string[]

  return (
    <div className="rd-deck" style={reduced ? undefined : { animationDelay: `${SEQ.deck}s` }} data-testid="rd-deck">
      <section className="rd-why" aria-labelledby="rd-why-title">
        <h2 id="rd-why-title"><Info size={17} strokeWidth={2} aria-hidden="true" />{t('plan.why')}</h2>
        <p>{ar ? plan.summary_ar : plan.summary_en}</p>
      </section>
      <section className="rd-secondary">
        <div className="rd-limits">
          <h3><TriangleAlert size={13} aria-hidden="true" />{t('plan.limitation')}</h3>
          <p>{limitation ?? t('rd.noLimitation')}</p>
          {missing.length > 0 && (
            <p className="rd-missing"><CircleAlert size={12} aria-hidden="true" />{t('status.missing')}: {missing.map(key => missingInformation(key, ar)).join(' · ')}</p>
          )}
        </div>
        <div className="rd-availability">
          <h3><Database size={13} aria-hidden="true" />{t('rd.dataAvailability')}</h3>
          {availabilityRows.length > 0 ? (
            <ul>{availabilityRows.map((row) => <li key={row}>{row}</li>)}</ul>
          ) : (
            <p className="rd-availability-empty">{t('rd.availabilityFromSources')}</p>
          )}
          {notes.length + plan.evidence.rule_ids.length + plan.evidence.source_ids.length > 0 && (
            <details className="rd-evidence">
              <summary>{t('rd.evidenceDetails')}</summary>
              {notes.length > 0 && <p className="rd-evidence-notes">{notes.join(' ')}</p>}
              {plan.evidence.source_ids.length > 0 && <p className="rd-evidence-notes">{t('rd.evidenceSources')}: {[...new Set(plan.evidence.source_ids.map(id => sourceName(id, ar)))].join(' · ')}</p>}
              {plan.evidence.observation_ids.length > 0 && (
                <p className="rd-evidence-count">{t('rd.evidenceObservations', { count: plan.evidence.observation_ids.length })}</p>
              )}
            </details>
          )}
        </div>
      </section>
      <WideScreenRich plan={plan} ar={ar} />
    </div>
  )
}

/** Wide-display enrichment — every line is derived from the existing result
 * payload (indicator values, weights, crop families); nothing is invented and
 * unavailable pieces are simply omitted. Hidden below 1440px viewports. */
function WideScreenRich({ plan, ar }: { plan: RotationOut; ar: boolean }) {
  const { t } = useTranslation()
  const scored = plan.score.indicators
    .filter((ind) => ind.value != null && ind.status !== 'unavailable')
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  const strongest = scored[0] ?? null
  const weakest = scored.length > 1 ? scored[scored.length - 1] : null
  const weights = Object.entries(plan.score.weights_applied ?? {})
  return (
    <section className="rd-rich" aria-label={t('rd.richLabel')}>
      <div className="rd-rich-block">
        <h3>{t('rd.scoreInterpretation')}</h3>
        {strongest && (
          <p><b>{t('rd.strongest')}</b> {ar ? strongest.label_ar : strongest.label_en} · {Math.round((strongest.value ?? 0) * 100)}/100</p>
        )}
        {weakest && (
          <p><b>{t('rd.weakest')}</b> {ar ? weakest.label_ar : weakest.label_en} · {Math.round((weakest.value ?? 0) * 100)}/100</p>
        )}
        {yieldCoverage(plan, ar) && <p><b>{ar ? 'تغطية البيانات:' : 'Data coverage:'}</b> {yieldCoverage(plan, ar)}</p>}
        <p className="rd-rich-note">{t('plan.scoreNote')}</p>
      </div>
      <div className="rd-rich-block">
        <h3>{t('rd.sequenceComposition')}</h3>
        <ol className="rd-composition">
          {plan.slots.map((slot) => (
            <li key={slot.slot_id}>
              <small>{t('timeline.year', { n: slot.year_number })}</small>
              <strong>{(ar ? slot.name_ar : slot.name_en) || slot.crop_id || t('plan.fallow')}</strong>
            </li>
          ))}
        </ol>
      </div>
      {weights.length > 0 && (
        <div className="rd-rich-block">
          <h3>{t('rd.weightsDistribution')}</h3>
          <p className="rd-chips-row">
            {weights.map(([key, w]) => <span className="rd-weight-chip" key={key}>{t(`plan.indicators.${key}`, ar ? 'مؤشر آخر' : 'Other indicator')} {Math.round(w * 100)}%</span>)}
          </p>
        </div>
      )}
    </section>
  )
}
