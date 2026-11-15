import { useTranslation } from 'react-i18next'
import type { ScoreBreakdown } from '../../api/client'

/** Display contributions from the returned, rounded values; never rescore a plan. */
export function ScoreCalculation({ score }: { score: ScoreBreakdown }) {
  const { t, i18n } = useTranslation()
  const arabic = i18n.language === 'ar'
  return <section className="card min-w-0 space-y-4 p-4 sm:p-6" data-testid="score-calculation">
    <h2 className="font-bold text-forest">{t('plan.calculation')}</h2>
    <p dir="ltr" className="rounded-xl bg-cream p-3 text-center font-mono text-sm">S = 100 × Σ(wᵢ × Iᵢ)</p>
    <p className="text-xs text-ink-light sm:hidden">{t('plan.calculationScroll')}</p>
    <div className="overflow-x-auto" role="region" aria-label={t('plan.calculation')} tabIndex={0}>
      <table className="w-full min-w-[32rem] text-start text-xs">
        <thead><tr className="border-b border-line text-ink-muted">
          {[t('plan.dimension'), t('plan.normalized'), t('plan.appliedWeight'), t('plan.contribution')].map(label =>
            <th key={label} scope="col" className="p-2 text-start font-semibold">{label}</th>)}
        </tr></thead>
        <tbody>{score.indicators.map(indicator => {
          const weight = score.weights_applied[indicator.key]
          const contribution = indicator.value !== null && weight !== undefined ? 100 * indicator.value * weight : null
          return <tr key={indicator.key} className="border-b border-line/60 align-top">
            <th scope="row" className="min-w-[9rem] p-2 text-start font-normal">
              <span className="font-bold text-forest">{arabic ? indicator.label_ar : indicator.label_en}</span>
              <p className="mt-1 max-w-xs leading-relaxed text-ink-muted">{t(`plan.dimension.${indicator.key}`)}</p>
              {indicator.unit_note && <p className="mt-1 font-normal text-ink-light"><bdi>{indicator.unit_note}</bdi></p>}
            </th>
            <td className="p-2"><bdi dir="ltr" className="whitespace-nowrap font-mono">{indicator.value === null ? '—' : indicator.value}</bdi></td>
            <td className="p-2"><bdi dir="ltr" className="whitespace-nowrap font-mono">{weight === undefined ? '—' : `${(weight * 100).toFixed(2)}%`}</bdi></td>
            <td className="p-2"><bdi dir="ltr" className="whitespace-nowrap font-mono">{contribution === null ? '—' : `≈ ${contribution.toFixed(2)}`}</bdi></td>
          </tr>
        })}</tbody>
        <tfoot><tr><th colSpan={3} scope="row" className="p-2 text-start text-forest">{t('plans.overallScore')}</th>
          <td className="p-2 font-bold text-forest"><bdi dir="ltr" className="whitespace-nowrap">{score.total === null ? '—' : score.total.toFixed(1)} /100</bdi></td>
        </tr></tfoot>
      </table>
    </div>
    <p className="text-xs leading-relaxed text-ink-muted">{t('plan.calculationRounding')}</p>
    {score.data_quality_note && <p className="text-xs leading-relaxed text-ink-muted"><bdi>{score.data_quality_note}</bdi></p>}
  </section>
}
