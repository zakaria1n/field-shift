import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  TrendingDown,
  Minus,
  Layers,
  Scale,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type EvaluationOut, type RotationOut } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { IndicatorRow } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

const INDICATOR_KEYS = ['water', 'soil', 'yield', 'risk'] as const

export default function CompareChanges() {
  const { t, i18n } = useTranslation()
  const { ref } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { lang } = useWizard()
  const isArabic = i18n.language === 'ar'

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Back button */}
      <Link
        to={`/rotations/${ref}/customize`}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-leaf transition-colors"
      >
        <ArrowLeft size={15} className="rtl:rotate-180" />
        <span>{t('customize.title')}</span>
      </Link>

      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="kicker">{t('steps.plans')}</p>
          <span className="badge-glow text-[10px] flex items-center gap-1 font-mono">
            <Scale size={11} className="text-leaf" /> Before vs After
          </span>
        </div>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
          {t('compare.title')}
        </h1>
      </div>

      {/* Evaluation In Progress State */}
      {running && (
        <div className="card p-8 text-center space-y-4 bg-white border border-line" role="status">
          <div className="h-10 w-10 mx-auto rounded-full border-2 border-leaf border-t-transparent animate-spin" />
          <h2 className="text-lg font-extrabold text-forest">{t('evaluate.title')}</h2>
          <p className="text-xs text-ink-muted">{t('evaluate.subtitle')}</p>

          <ul className="flex flex-wrap items-center justify-center gap-3 pt-2 text-xs font-mono">
            {(['constraints', 'compatibility', 'scoring'] as const).map((s) => (
              <li key={s} className="flex items-center gap-1.5 bg-cream px-3 py-1.5 rounded-full border border-line">
                <span className="h-2 w-2 animate-pulse rounded-full bg-leaf" />
                <span>{t(`evaluate.stage.${s}`)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {error && <p className="text-sm font-medium text-red-600 bg-red-50 p-3 rounded-xl border border-red-200">{error}</p>}

      {evaluation && (
        <>
          {/* Feasibility Result Banner */}
          <div
            className={`rounded-2xl border p-4 text-sm font-extrabold flex items-center gap-2.5 shadow-sm ${
              evaluation.feasibility === 'infeasible'
                ? 'border-red-300 bg-red-50 text-red-700'
                : evaluation.feasibility === 'needs_review'
                  ? 'border-amber/50 bg-amber-soft text-amber-dark'
                  : 'border-leaf/50 bg-leaf-soft text-forest'
            }`}
          >
            {evaluation.feasibility === 'infeasible' ? (
              <XCircle size={18} className="text-red-600 shrink-0" />
            ) : evaluation.feasibility === 'needs_review' ? (
              <AlertTriangle size={18} className="text-amber-dark shrink-0" />
            ) : (
              <CheckCircle2 size={18} className="text-leaf shrink-0" />
            )}
            <span>{t(`evaluate.result.${evaluation.feasibility}`)}</span>
          </div>

          {/* Hard / Soft Rule Conflicts */}
          {evaluation.conflicts.length > 0 && (
            <ul className="space-y-2">
              {evaluation.conflicts.map((c, i) => (
                <li
                  key={i}
                  className={`rounded-2xl border p-3.5 text-xs ${
                    c.severity === 'hard'
                      ? 'border-red-200 bg-red-50 text-red-700'
                      : 'border-amber/40 bg-amber-soft text-ink-muted'
                  }`}
                >
                  <span className="font-mono font-bold text-forest"><bdi>{c.rule_id}</bdi></span> —{' '}
                  <bdi>{lang === 'ar' ? c.message_ar : c.message_en}</bdi>
                </li>
              ))}
            </ul>
          )}

          {/* Side-by-side Comparative Sequence Cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Original Card */}
            <div className="card p-5 bg-white border border-line space-y-3">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <h2 className="text-sm font-extrabold text-forest flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-ink-light" />
                  {t('compare.original')}
                </h2>
                <span className="chip text-[10px] font-mono">Baseline</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {evaluation.sequence_before.map((s) => (
                  <div key={s.slot_id} className="flex flex-col items-center">
                    <span className="text-[10px] font-mono uppercase text-ink-light mb-1">
                      {t('timeline.year', { n: s.year_number })}
                    </span>
                    <CropVisual slot={s} size="sm" showFamily className="w-full bg-cream" />
                  </div>
                ))}
              </div>
            </div>

            {/* Modified Card */}
            <div className="card-elevated p-5 bg-white border-2 border-leaf shadow-md space-y-3 ring-2 ring-leaf/10">
              <div className="flex items-center justify-between border-b border-line pb-2">
                <h2 className="text-sm font-extrabold text-forest flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-leaf animate-pulse" />
                  {t('compare.modified')}
                </h2>
                <span className="badge-glow text-[10px] font-mono">Customized</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-1">
                {evaluation.sequence_after.map((s, i) => {
                  const before = evaluation.sequence_before[i]
                  const changed = s.crop_id !== before?.crop_id
                  return (
                    <div key={s.slot_id} className="flex flex-col items-center">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] font-mono uppercase text-ink-light">
                          {t('timeline.year', { n: s.year_number })}
                        </span>
                        {changed && (
                          <span className="w-1.5 h-1.5 rounded-full bg-leaf animate-ping" />
                        )}
                      </div>
                      <CropVisual
                        slot={s}
                        size="sm"
                        showFamily
                        selected={changed}
                        className={`w-full ${changed ? 'bg-leaf-soft/50' : 'bg-white'}`}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Evidence-Based Comparison Indicator Table */}
          <div className="card p-6 bg-white border border-line space-y-4">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink-light font-mono">
              {t('compare.indicators')}
            </h2>

            <div className="space-y-4 divide-y divide-line/60">
              {INDICATOR_KEYS.map((key) => {
                const row = evaluation.comparison.find((r) => r.indicator === key)
                if (!row) return null
                const label = lang === 'ar' ? row.label_ar : row.label_en
                const delta = row.delta ?? 0
                const isPositive = delta > 0.001
                const isNegative = delta < -0.001

                return (
                  <div key={key} className="pt-3 first:pt-0 grid items-center gap-4 sm:grid-cols-12">
                    {/* Indicator Name & Delta Pill */}
                    <div className="sm:col-span-4 flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-forest">{label}</span>
                      {row.status === 'unknown' ? (
                        <span className="text-[10px] font-mono font-bold text-amber-dark bg-amber-soft px-2 py-0.5 rounded-full">
                          {t('compare.unknown')}
                        </span>
                      ) : (
                        <span
                          className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-extrabold px-2 py-0.5 rounded-full ${
                            isPositive
                              ? 'bg-leaf-soft text-leaf-dark'
                              : isNegative
                                ? 'bg-amber-soft text-amber-dark'
                                : 'bg-cream text-ink-light'
                          }`}
                        >
                          {isPositive ? <TrendingUp size={11} /> : isNegative ? <TrendingDown size={11} /> : <Minus size={11} />}
                          <span>
                            {row.status === 'changed'
                              ? `${isPositive ? '+' : ''}${(delta * 100).toFixed(1)}%`
                              : t('compare.unchanged')}
                          </span>
                        </span>
                      )}
                    </div>

                    {/* Side-by-side indicator meters */}
                    <div className="sm:col-span-8 grid grid-cols-2 gap-4">
                      <IndicatorRow label={t('compare.original')} value={row.original_value} status={row.status} />
                      <IndicatorRow label={t('compare.modified')} value={row.modified_value} status={row.status} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Explicit Confirmation Choice Action Dock */}
          <div className="card p-5 bg-white border border-line flex flex-wrap items-center justify-between gap-3 shadow-md">
            <button
              type="button"
              className="btn-secondary text-sm px-6 py-3"
              onClick={() => navigate(`/rotations/${ref}/confirmation`, { state: { adoptEdits: null } })}
            >
              <span>{t('compare.keepOriginal')}</span>
            </button>

            <button
              type="button"
              className="btn-leaf text-sm px-8 py-3 shadow-md flex items-center gap-2"
              disabled={evaluation.feasibility === 'infeasible'}
              onClick={() => navigate(`/rotations/${ref}/confirmation`, { state: { adoptEdits: edits } })}
            >
              <Sparkles size={16} />
              <span>{t('compare.useModified')}</span>
              <ArrowRight size={15} className="rtl:rotate-180" />
            </button>
          </div>
        </>
      )}

      {!running && !evaluation && !error && edits.length === 0 && (
        <div className="card p-8 text-center space-y-4 bg-white border border-line max-w-md mx-auto">
          <p className="text-sm font-semibold text-ink-muted">{t('customize.dirty')}</p>
          <Link to={`/rotations/${ref}/customize`} className="btn-primary inline-flex">
            {t('plan.customize')}
          </Link>
        </div>
      )}
    </motion.div>
  )
}
