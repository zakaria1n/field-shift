import { useTranslation } from 'react-i18next'
import type { ScoreBreakdown } from '../../api/client'

/** Same number does not imply the same scientific comparison basis. */
export function ScoreEvidence({ score }: { score: ScoreBreakdown }) {
  const { t } = useTranslation()
  const available = score.indicators.filter(item => item.value !== null)
  const partial = available.some(item => item.status === 'partial')
  return <div className="mt-3 rounded-xl border border-amber/30 bg-amber-soft p-3 text-xs space-y-2" data-testid="score-evidence">
    <p className="font-semibold">{t('score.evaluated')}: {available.map(item => `${t(`mixer.${item.key}`)} ${((score.weights_applied[item.key] ?? 0) * 100).toFixed(1)}%`).join(' · ')}</p>
    {score.weight_redistribution_note && <p>{t('score.redistributed')}</p>}
    {partial && <p>{t('score.partialYield')} {score.yield_reference_coverage && `${score.yield_reference_coverage.known}/${score.yield_reference_coverage.total}`}</p>}
    <p>{t('score.comparability')}</p>
  </div>
}
