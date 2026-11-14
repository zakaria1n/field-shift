import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { CheckCircle2, CircleDashed, Loader2, TriangleAlert, XCircle } from 'lucide-react'

import { api, type AnalysisJobOut } from '../../api/client'
import { StatusBadge } from '../../app/components/ui'

const STAGE_ORDER = ['geometry', 'climate', 'soil', 'yield_reference', 'suitability', 'rotation']

export default function AnalysisProgress() {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fieldId = (location.state as { fieldId?: string } | null)?.fieldId
  const [job, setJob] = useState<AnalysisJobOut | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    async function poll() {
      while (alive) {
        try {
          const data = await api.get<AnalysisJobOut>(`/api/v1/analyses/${jobId}`)
          if (!alive) return
          setJob(data)
          if (data.status === 'complete' || data.status === 'partial') {
            setTimeout(() => alive && navigate(`/fields/${fieldId ?? data.field_id}/rotations`), 600)
            return
          }
          if (data.status === 'failed') return
        } catch (e) {
          if (!alive) return
          setError(t('error.network'))
          return
        }
        await new Promise((r) => setTimeout(r, 1200))
      }
    }
    void poll()
    return () => {
      alive = false
    }
  }, [jobId, fieldId, navigate, t])

  const stageStatus = (key: string): string =>
    job?.stages.find((s) => s.key === key)?.status ?? 'pending'
  const sourceStatus = (id: string): string =>
    job?.sources.find((s) => s.source_id === id)?.status ?? 'pending'

  const stageIcon = (status: string) => {
    if (status === 'complete') return <CheckCircle2 size={18} className="text-leaf" />
    if (status === 'running') return <Loader2 size={18} className="animate-spin text-sky" />
    if (status === 'failed') return <XCircle size={18} className="text-red-600" />
    if (status === 'skipped') return <TriangleAlert size={18} className="text-amber" />
    return <CircleDashed size={18} className="text-ink/40" />
  }

  return (
    <div className="mx-auto max-w-2xl">
      <p className="kicker">{t('steps.analysis')}</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest">{t('analysis.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('analysis.subtitle')}</p>

      <div className="card mt-5 p-5" role="status" aria-label={t('aria.progress')}>
        <ul className="space-y-3">
          {STAGE_ORDER.map((key) => {
            const status = stageStatus(key)
            const detail = job?.stages.find((s) => s.key === key)?.detail
            return (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-0.5">{stageIcon(status)}</span>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold ${status === 'pending' ? 'text-ink/40' : 'text-ink'}`}>
                    {t(`analysis.stage.${key === 'yield_reference' ? 'yield_reference' : key}`)}
                  </p>
                  {detail && <p className="text-xs text-ink/60 break-words">{detail}</p>}
                </div>
              </li>
            )
          })}
        </ul>

        <div className="mt-5 border-t border-line pt-4">
          <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{t('insights.provenance')}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge kind={sourceStatus('nasa_power') as never}>{t('analysis.stage.climate')}</StatusBadge>
            <StatusBadge kind={sourceStatus('soilgrids') as never}>{t('analysis.stage.soil')}</StatusBadge>
            <StatusBadge kind={sourceStatus('gaez_v5') as never}>{t('analysis.stage.yield_reference')}</StatusBadge>
          </div>
          {job?.sources.filter((s) => s.status === 'cached').map((s) => (
            <p key={s.source_id} className="mt-2 text-xs text-sky">
              {s.source_id}: {t('analysis.source.cached')} · {s.fetched_at}
            </p>
          ))}
        </div>

        {job?.status === 'failed' && (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-bold text-red-700">{t('analysis.failed')}</p>
            <p className="mt-1 text-xs text-red-600">{job.error?.message ?? t('error.generic')}</p>
            <button className="btn-primary mt-3" onClick={() => window.location.reload()}>
              {t('analysis.retry')}
            </button>
          </div>
        )}

        {job?.status === 'partial' && (
          <div className="mt-5 rounded-xl border border-amber/40 bg-amber/10 p-4 text-sm font-semibold text-amber">
            {t('analysis.partial')}
          </div>
        )}
        {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
      </div>
    </div>
  )
}
