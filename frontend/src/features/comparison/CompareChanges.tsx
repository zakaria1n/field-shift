import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { MoveDown, ArrowLeft } from 'lucide-react'

import { api, type EvaluationOut, type RotationOut } from '../../api/client'
import { CropChip, IndicatorRow } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

const INDICATOR_KEYS = ['water', 'soil', 'yield', 'risk'] as const

export default function CompareChanges() {
  const { t, i18n } = useTranslation()
  const { ref } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { lang } = useWizard()

  const edits = (location.state as { edits?: { slot_id: string; crop_id: string | null }[] } | null)?.edits ?? []

  const { data: plan } = useQuery({
    queryKey: ['rotation', ref],
    queryFn: () => api.get<RotationOut>(`/api/v1/rotations/${ref}`),
  })

  const [evaluation, setEvaluation] = useState<EvaluationOut | null>(null)
  const [phase, setPhase] = useState<'idle' | 'running' | 'done'>('idle')
  const [error, setError] = useState<string | null>(null)

  const ranOnce = useRef(false)
  useEffect(() => {
    if (edits.length > 0 && !ranOnce.current) {
      ranOnce.current = true
      setPhase('running')
      api
        .post<EvaluationOut>(`/api/v1/rotations/${ref}/evaluate`, { edits })
        .then((result) => {
          setEvaluation(result)
          setPhase('done')
        })
        .catch((e) => {
          setError(e instanceof Error ? e.message : t('error.generic'))
          setPhase('done')
        })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref])

  const running = phase === 'running'

  return (
    <div className="mx-auto max-w-4xl">
      <Link to={`/rotations/${ref}/customize`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-forest hover:underline">
        <ArrowLeft size={15} className="rtl:rotate-180" /> {t('customize.title')}
      </Link>
      <h1 className="mt-2 text-2xl sm:text-3xl font-extrabold text-forest">{t('compare.title')}</h1>

      {running && (
        <div className="card mt-4 p-5" role="status">
          <p className="text-sm font-bold text-forest">{t('evaluate.title')}</p>
          <p className="mt-1 text-xs text-ink/60">{t('evaluate.subtitle')}</p>
          <ul className="mt-3 space-y-2 text-sm">
            {(['constraints', 'compatibility', 'scoring'] as const).map((s) => (
              <li key={s} className="flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-leaf" />
                {t(`evaluate.stage.${s}`)}
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}

      {evaluation && (
        <>
          <div
            className={`mt-4 rounded-xl border p-4 text-sm font-bold ${
              evaluation.feasibility === 'infeasible'
                ? 'border-red-300 bg-red-50 text-red-700'
                : evaluation.feasibility === 'needs_review'
                  ? 'border-amber/50 bg-amber/10 text-amber'
                  : 'border-leaf/50 bg-leaf/10 text-forest'
            }`}
          >
            {t(`evaluate.result.${evaluation.feasibility}`)}
          </div>

          {evaluation.conflicts.length > 0 && (
            <ul className="mt-3 space-y-2">
              {evaluation.conflicts.map((c, i) => (
                <li key={i} className={`rounded-lg border p-3 text-xs ${c.severity === 'hard' ? 'border-red-200 bg-red-50 text-red-700' : 'border-amber/40 bg-amber/10 text-ink/80'}`}>
                  <span className="font-bold"><bdi>{c.rule_id}</bdi></span> — <bdi>{lang === 'ar' ? c.message_ar : c.message_en}</bdi>
                </li>
              ))}
            </ul>
          )}

          {/* Side-by-side sequences */}
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <div className="card p-4">
              <h2 className="text-sm font-bold text-forest">{t('compare.original')}</h2>
              <div className="mt-3 flex items-center gap-1.5">
                {evaluation.sequence_before.map((s, i) => (
                  <div key={s.slot_id} className="flex items-center gap-1.5">
                    {i > 0 && <MoveDown size={12} className="text-ink/30 rotate-90" aria-hidden />}
                    <CropChip slot={s} size="sm" />
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-4 ring-1 ring-leaf/40">
              <h2 className="text-sm font-bold text-forest">{t('compare.modified')}</h2>
              <div className="mt-3 flex items-center gap-1.5">
                {evaluation.sequence_after.map((s, i) => {
                  const before = evaluation.sequence_before[i]
                  const changed = s.crop_id !== before?.crop_id
                  return (
                    <div key={s.slot_id} className="flex items-center gap-1.5">
                      {i > 0 && <MoveDown size={12} className="text-ink/30 rotate-90" aria-hidden />}
                      <div className={changed ? 'rounded-lg ring-2 ring-leaf' : ''}>
                        <CropChip slot={s} size="sm" />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Evidence-based comparison table */}
          <div className="card mt-4 p-4">
            <h2 className="text-sm font-bold uppercase tracking-wide text-ink/50">{t('compare.indicators')}</h2>
            <div className="mt-3 space-y-3">
              {INDICATOR_KEYS.map((key) => {
                const row = evaluation.comparison.find((r) => r.indicator === key)
                if (!row) return null
                const label = lang === 'ar' ? row.label_ar : row.label_en
                return (
                  <div key={key} className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
                    <span className="text-xs font-semibold text-ink/70">{label}</span>
                    {row.status === 'unknown' ? (
                      <span className="text-[11px] font-bold text-amber" title={row.note_en ?? ''}>
                        {t('compare.unknown')} — {t('compare.noDelta')}
                      </span>
                    ) : (
                      <span className={`text-[11px] font-bold ${row.status === 'changed' ? (row.delta ?? 0) > 0 ? 'text-leaf' : 'text-amber' : 'text-ink/50'}`}>
                        {row.status === 'changed'
                          ? `${(row.delta ?? 0) > 0 ? '+' : ''}${((row.delta ?? 0) * 100).toFixed(1)}`
                          : t('compare.unchanged')}
                      </span>
                    )}
                    <div className="flex gap-3">
                      <div className="flex-1"><IndicatorRow label={t('compare.original')} value={row.original_value} status={row.status} /></div>
                      <div className="flex-1"><IndicatorRow label={t('compare.modified')} value={row.modified_value} status={row.status} /></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Explicit choice: neither version is saved until farmer confirms */}
          <div className="mt-5 flex flex-wrap gap-3">
            <button className="btn-secondary" onClick={() => navigate(`/rotations/${ref}/confirmation`, { state: { adoptEdits: null } })}>
              {t('compare.keepOriginal')}
            </button>
            <button
              className="btn-leaf"
              disabled={evaluation.feasibility === 'infeasible'}
              onClick={() => navigate(`/rotations/${ref}/confirmation`, { state: { adoptEdits: edits } })}
            >
              {t('compare.useModified')}
            </button>
          </div>
        </>
      )}

      {!running && !evaluation && !error && edits.length === 0 && (
        <div className="mt-4 card p-5 text-sm text-ink/70">
          {t('customize.dirty')}
          <div className="mt-3">
            <Link to={`/rotations/${ref}/customize`} className="btn-primary">{t('plan.customize')}</Link>
          </div>
        </div>
      )}
    </div>
  )
}
