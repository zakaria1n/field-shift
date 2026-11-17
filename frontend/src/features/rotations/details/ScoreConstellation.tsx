import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BarChart3, CloudSun, Droplets, Leaf } from 'lucide-react'
import type { RotationOut } from '../../../api/client'
import { useCountUp } from './useCountUp'
import { METRIC_ORDER, SEQ, type MetricKey } from './entrance'

const METRIC_ICONS: Record<MetricKey, typeof Leaf> = {
  water: Droplets,
  soil: Leaf,
  yield: BarChart3,
  risk: CloudSun,
}

/** The four evaluation criteria as one cohesive, restrained metric system.
 *
 * Thin progress rings around small consistent icons (one icon library, one
 * stroke weight), the real numeric score displayed prominently beneath, and
 * readable labels. Selecting a ring shows its grounded explanation from the
 * existing scoring data. Unavailable dimensions never display a number. */
export function ScoreConstellation({ plan, reduced }: { plan: RotationOut; reduced: boolean }) {
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'
  const [active, setActive] = useState<MetricKey | null>(null)
  const byKey = new Map(plan.score.indicators.map((ind) => [ind.key, ind]))
  const current = active ? byKey.get(active) ?? null : null
  const weight = active ? plan.score.weights_applied?.[active] : undefined

  return (
    <div className="rd-scores" data-testid="rd-scores">
      <div className="rd-rings">
        {METRIC_ORDER.map((key, index) => {
          const ind = byKey.get(key)
          const value = ind?.value ?? null
          const available = ind != null && value != null && ind.status !== 'unavailable'
          const normalized = available ? Math.max(0, Math.min(100, value! * 100)) : null
          const Icon = METRIC_ICONS[key]
          return (
            <button
              key={key}
              type="button"
              className={`rd-ring rd-ring--${key} ${active === key ? 'is-active' : ''} ${available ? '' : 'is-unavailable'}`}
              style={{ '--rd-i': index, '--value': normalized ?? 0, animationDelay: `${SEQ.metrics + index * SEQ.metricStagger}s` } as React.CSSProperties}
              aria-pressed={active === key}
              onClick={() => setActive(active === key ? null : key)}
              data-testid={`rd-metric-${key}`}
              data-status={ind?.status ?? 'unavailable'}
            >
              <span className="rd-ring-gauge" aria-hidden="true">
                <svg className="rd-ring-svg" viewBox="0 0 76 76" focusable="false">
                  <circle className="rd-ring-track" cx="38" cy="38" r="32" pathLength="100" />
                  {available && <circle className="rd-ring-fill" cx="38" cy="38" r="32" pathLength="100" />}
                </svg>
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <span className="rd-ring-score">
                {available ? (
                  <><RingNumber normalized={normalized!} reduced={reduced} index={index} /><small>/100</small></>
                ) : (
                  <em>{ar ? '—' : '—'}</em>
                )}
              </span>
              <span className="rd-ring-status">
                {available ? (ind!.status === 'partial' ? t('rd.statusPartial') : '') : t('rd.statusUnavailable')}
              </span>
              <RingLabel ar={ar} ind={ind} fallbackKey={key} />
            </button>
          )
        })}
      </div>
      {active !== null && (
        <div className="rd-ring-insight" aria-live="polite" data-testid="rd-ring-insight" key={active}>
          {current == null || (current.value == null && current.status === 'unavailable') ? (
            <span className="rd-ring-unavailable">{t('plan.indicators.unavailable')}</span>
          ) : (
            <>
              <p className="rd-insight-head">
                <strong>{ar ? current.label_ar : current.label_en}</strong>
                <span className={`rd-status-chip rd-status-chip--${current.status}`}>
                  {current.status === 'partial' ? t('rd.statusPartial') : current.status === 'unavailable' ? t('rd.statusUnavailable') : t('rd.statusAvailable')}
                </span>
                {weight != null && <span className="rd-ring-weight">{t('rd.weightsApplied')} {Math.round(weight * 100)}%</span>}
              </p>
              <p className="rd-insight-body">{t(`plan.dimension.${active}`)}</p>
              {plan.score.weight_redistribution_note && current.status === 'unavailable' && (
                <p className="rd-insight-body rd-insight-note">{plan.score.weight_redistribution_note}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

function RingNumber({ normalized, reduced, index }: { normalized: number; reduced: boolean; index: number }) {
  const shown = useCountUp(normalized, 800, reduced, 1500 + index * 140)
  return <b>{Math.round(shown)}</b>
}

function RingLabel({ ar, ind, fallbackKey }: { ar: boolean; ind: { label_en: string; label_ar: string } | undefined; fallbackKey: string }) {
  const { t } = useTranslation()
  return <span className="rd-ring-label">{ind ? (ar ? ind.label_ar : ind.label_en) : t(`plan.indicators.${fallbackKey}`)}</span>
}
