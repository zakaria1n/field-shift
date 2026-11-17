import { useTranslation } from 'react-i18next'
import { Leaf } from 'lucide-react'
import type { RotationOut } from '../../../api/client'
import { useCountUp } from './useCountUp'
import { SEQ } from './entrance'

/** Plan identity block: kicker, title, meta line and the overall-score
 * medallion. Everything is real backend data; the score counts up once. */
export function PlanIdentity({ plan, reduced }: { plan: RotationOut; reduced: boolean }) {
  const { t, i18n } = useTranslation()
  const ar = i18n.language === 'ar'
  const total = plan.score.total ?? null
  const shown = useCountUp(total ?? 0, 900, reduced || total === null, 450)
  return (
    <header className="rd-identity" data-testid="rd-identity">
      <div className="rd-identity-copy">
        <p className="rd-kicker" style={{ animationDelay: `${SEQ.identity[0]}s` }}>
          {plan.label}
          {plan.is_recommended && <span className="rd-recommended">✓ {t('plans.recommended')}</span>}
        </p>
        <h1 style={{ animationDelay: `${SEQ.identity[1]}s` }}>
          <Leaf size={30} aria-hidden="true" /> {rotationTitle(plan.label, ar)}
        </h1>
        <p className="rd-meta" style={{ animationDelay: `${SEQ.identity[2]}s` }}>
          {t('plan.years', { n: plan.horizon_years })}
          <i aria-hidden="true" />
          {t('plan.scoreNote')}
        </p>
      </div>
      <div
        className={`rd-medallion ${total === null ? 'rd-medallion--empty' : ''}`}
        style={{ animationDelay: `${SEQ.identity[3]}s` }}
        role="img"
        aria-label={`${t('plans.overallScore')}: ${total === null ? '—' : `${total.toFixed(1)}/100`}`}
        data-testid="rd-medallion"
      >
        <svg className="rd-medallion-svg" viewBox="0 0 100 100" aria-hidden="true">
          <circle className="rd-medallion-track" cx="50" cy="50" r="44" pathLength="100" />
          {total !== null && (
            <circle
              className="rd-medallion-fill"
              cx="50" cy="50" r="44" pathLength="100"
              style={{ '--value': Math.max(0, Math.min(100, total)) } as React.CSSProperties}
            />
          )}
        </svg>
        <span className="rd-medallion-value">
          {total === null ? '—' : shown.toFixed(1)}
          <small>{total === null ? '' : '/100'}</small>
        </span>
        <span className="rd-medallion-caption">{t('plans.overallScore')}</span>
      </div>
    </header>
  )
}

function rotationTitle(label: string, ar: boolean): string {
  const letter = label.match(/(?:plan|rotation)\s+([a-z])$/i)?.[1]
  return letter ? (ar ? `الدورة ${letter.toUpperCase()}` : `Rotation ${letter.toUpperCase()}`) : label
}
