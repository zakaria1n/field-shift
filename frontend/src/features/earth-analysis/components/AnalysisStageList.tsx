import type { CSSProperties } from 'react'
import { useTranslation } from 'react-i18next'
import { AlertTriangle, BarChart3, Check, CloudSun, Layers, Layers3, RotateCw, Sprout, X } from 'lucide-react'

import type { StageUi, StageUiStatus } from '../analysisStatusAdapter'

const STAGE_ICONS = {
  geometry: Layers,
  climate: CloudSun,
  soil: Sprout,
  yield_reference: BarChart3,
  suitability: Layers3,
  rotation: RotateCw,
} as const

function StageIcon({ stage, offset }: { stage: StageUi; offset: number }) {
  const { t } = useTranslation()
  const Icon = STAGE_ICONS[stage.key]
  const label = `${t(`ea.stage.${stage.key}`)} — ${t(`ea.status.${stage.status}`)}`

  return (
    <span
      className={`ea-stage-icon ea-stage-icon--${stage.status} ea-stage-icon--curved`}
      style={{ '--ea-stage-curve-shift': `${offset}px` } as CSSProperties}
      data-stage-anchor={stage.key}
      role="img"
      aria-label={label}
      data-testid={`stage-icon-${stage.key}`}
    >
      <Icon size={30} strokeWidth={2.1} aria-hidden="true" />
      {stage.status === 'complete' && <span className="ea-stage-mark ea-stage-mark--complete"><Check size={11} strokeWidth={3} /></span>}
      {stage.status === 'partial' && <span className="ea-stage-mark ea-stage-mark--partial"><AlertTriangle size={11} strokeWidth={2.6} /></span>}
      {stage.status === 'unavailable' && <span className="ea-stage-mark ea-stage-mark--unavailable"><AlertTriangle size={11} strokeWidth={2.6} /></span>}
      {stage.status === 'failed' && <span className="ea-stage-mark ea-stage-mark--failed"><X size={12} strokeWidth={3} /></span>}
      {stage.status === 'running' && <span className="sr-only">{t('ea.status.running')}</span>}
    </span>
  )
}

const PILL_CLASS: Record<StageUiStatus, string> = {
  pending: 'text-white/55',
  running: 'border-[#A3E635]/35 bg-[#A3E635]/10 text-[#D9F99D]',
  complete: 'text-[#B9EA80]',
  partial: 'border-amber/40 bg-amber/10 text-[#F4D28B]',
  unavailable: 'border-amber/40 bg-amber/10 text-[#F4D28B]',
  failed: 'border-red-300/40 bg-red-400/10 text-red-200',
}

function StatusLabel({ status }: { status: StageUiStatus }) {
  const { t } = useTranslation()
  if (status === 'pending' || status === 'complete') return null
  return (
    <span
      className={`ea-stage-status inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-bold ${PILL_CLASS[status]}`}
      data-testid={`stage-status-${status}`}
    >
      {t(`ea.status.${status}`)}
    </span>
  )
}

export default function AnalysisStageList({ stages, offsets = [] }: { stages: StageUi[]; offsets?: number[] }) {
  const { t } = useTranslation()
  return (
    <ol className="ea-stage-list" data-testid="stage-list">
      {stages.map((stage, index) => (
        <li
          key={stage.key}
          className="ea-stage-row ea-enter-slide"
          style={{ animationDelay: `${0.12 + index * 0.07}s`, '--ea-stage-curve-shift': `${offsets[index] ?? 0}px` } as CSSProperties}
          data-testid={`stage-item-${stage.key}`}
          data-stage-status={stage.status}
        >
          <StageIcon stage={stage} offset={offsets[index] ?? 0} />
          <div className="ea-stage-copy">
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <p className={`ea-stage-title ${stage.status === 'pending' ? 'text-white/75' : 'text-white'}`}>
                {t(`ea.stage.${stage.key}`)}
              </p>
              <StatusLabel status={stage.status} />
            </div>
            <p className={`ea-stage-detail ${stage.status === 'running' ? 'text-[#D9F99D]' : 'text-white/70'}`}>
              {stage.key === 'soil' && stage.status === 'complete' && stage.sourceNote === 'source_cached'
                ? t('ea.stage.soil.cachedDetail')
                : stage.key === 'soil' && stage.status === 'complete'
                  ? t('ea.stage.soil.completeDetail')
                  : stage.key === 'soil' && stage.status === 'unavailable'
                ? t('ea.stage.soil.unavailableDetail')
                : stage.key === 'soil' && stage.status === 'partial'
                  ? t('ea.stage.soil.partialDetail')
                  : stage.detail || t(`ea.stage.${stage.key}.desc`)}
            </p>
            {stage.sourceNote && !(stage.key === 'soil' && stage.status === 'unavailable') && !(stage.key === 'soil' && stage.status === 'complete' && stage.sourceNote === 'source_cached') && (
              <p className="ea-stage-source-note">{t(`ea.source.${stage.sourceNote}`)}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
