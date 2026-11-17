import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { RotateCcw, TriangleAlert } from 'lucide-react'

import { api, type AnalysisJobOut, type FieldOut } from '../../api/client'
import { useWizard } from '../../state/wizard'
import FieldShiftBrand from '../../app/components/FieldShiftBrand'
import LanguageSwitch from '../../app/components/LanguageSwitch'
import AnalysisBackground from './components/AnalysisBackground'
import AnalysisHeadline from './components/AnalysisHeadline'
import AnalysisProgressTimeline from './components/AnalysisProgressTimeline'
import SelectedFieldVisualization from './components/SelectedFieldVisualization'
import { deriveStages, PREVIEW_FIXTURES, type PreviewState } from './analysisStatusAdapter'
import './earth-analysis.css'

export default function EarthAnalysisPage() {
  const { t } = useTranslation()
  const { jobId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { field, fieldId } = useWizard()
  const [job, setJob] = useState<AnalysisJobOut | null>(null)
  const [error, setError] = useState<string | null>(null)

  // DEV PREVIEW: /analyses/x/progress?preview=running|complete|... renders
  // labelled synthetic fixtures without polling the backend.
  const previewParam = searchParams.get('ea-preview') as PreviewState | null
  const previewJob = previewParam && previewParam in PREVIEW_FIXTURES ? PREVIEW_FIXTURES[previewParam] : null
  const previewActive = Boolean(previewJob)
  const { data: savedField } = useQuery({
    queryKey: ['analysis-field', job?.field_id],
    queryFn: () => api.get<FieldOut>(`/api/v1/fields/${job!.field_id}`),
    enabled: Boolean(!previewActive && job?.field_id && (!field || fieldId !== job.field_id)),
    retry: false,
  })
  const visibleField = !previewActive && job && fieldId !== job.field_id ? null : field

  const stages = useMemo(
    () => deriveStages(previewJob ?? job),
    [previewJob, job],
  )
  const failed = (previewJob ?? job)?.status === 'failed' || stages.some((stage) => stage.status === 'failed')

  useEffect(() => {
    if (previewActive) return
    let alive = true
    async function poll() {
      while (alive) {
        try {
          const data = await api.get<AnalysisJobOut>(`/api/v1/analyses/${jobId}`)
          if (!alive) return
          setJob(data)
          if (data.status === 'complete' || data.status === 'partial') {
            setTimeout(() => alive && navigate(`/fields/${data.field_id}/rotations`, { state: { fieldId: data.field_id } }), 1100)
            return
          }
          if (data.status === 'failed') return
        } catch {
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
  }, [jobId, navigate, t, previewActive])

  return (
    <div className="earth-observatory relative min-h-[100svh] overflow-x-hidden bg-[#04120D] lg:h-[100svh] lg:overflow-hidden" data-testid="earth-analysis-page">
      <AnalysisBackground />

      {/* top navigation */}
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-6 py-5 sm:px-10">
        <FieldShiftBrand title={t('ea.navTitle')} />
        <LanguageSwitch variant="dark" />
      </div>

      <div className="ea-analysis-layout relative z-10 mx-auto grid min-h-[100svh] w-full max-w-[1720px] grid-cols-1 content-center gap-8 px-6 pb-10 pt-24 sm:px-10 lg:h-full lg:min-h-0 lg:grid-cols-[minmax(0,0.84fr)_minmax(0,1.16fr)] lg:items-center lg:gap-7 lg:px-12 lg:pb-7 lg:pt-20">
        {/* LEFT: headline + real field */}
        <div className="ea-field-column flex min-w-0 flex-col justify-center lg:-translate-y-6 lg:pe-2">
          {(failed || error) && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="ea-analysis-alert mb-4 w-full max-w-lg rounded-2xl border border-red-400/50 bg-[#2A0F0C]/82 p-3.5 backdrop-blur-sm"
              role="alert"
            >
              <p className="flex items-center gap-2 text-sm font-bold text-red-300">
                <TriangleAlert size={15} /> {failed ? t('analysis.failed') : t('error.network')}
              </p>
              {failed && <p className="mt-1 text-xs leading-relaxed text-red-200/80">{job?.error?.message ?? t('error.generic')}</p>}
              {failed && (
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-red-300/50 px-3 py-1 text-xs font-bold text-red-200 transition-colors hover:bg-red-500/15"
                >
                  <RotateCcw size={12} /> {t('analysis.retry')}
                </button>
              )}
            </motion.div>
          )}
          <AnalysisHeadline
            fieldAreaHa={visibleField?.area_ha ?? savedField?.area_ha ?? null}
            fieldName={visibleField?.name ?? savedField?.name ?? null}
            stages={stages}
            failed={failed}
          />
          <div className="ea-field-visual-slot mt-3 w-full lg:mt-4">
            <SelectedFieldVisualization geometry={visibleField?.geometry ?? savedField?.geometry_geojson ?? null} />
          </div>
        </div>

        {/* CENTER + RIGHT: shared measured coordinate system for the arc and timeline */}
        <div className="min-w-0 lg:order-2 lg:ps-1">
          <AnalysisProgressTimeline stages={stages} failed={failed} />
        </div>
      </div>

      {/* DEV PREVIEW — clearly identified synthetic fixtures, no backend calls */}
      {previewActive && (
        <div className="fixed bottom-3 start-4 z-30 hidden max-w-[calc(100vw-2rem)] items-center gap-2 rounded-full border border-amber/55 bg-[#0B1410]/90 px-2.5 py-1.5 text-[10px] text-white/80 shadow-lg backdrop-blur-sm sm:flex" data-testid="ea-preview-panel">
          <span className="shrink-0 font-mono font-extrabold uppercase tracking-wider text-amber">
            Preview fixture · not real analysis
          </span>
          <div className="flex min-w-0 flex-wrap gap-1">
            {(Object.keys(PREVIEW_FIXTURES) as PreviewState[]).map((state) => (
              <a
                key={state}
                href={`?ea-preview=${state}`}
                className={`rounded-full border px-2 py-1 font-bold transition-colors ${
                  previewParam === state
                    ? 'border-[#A3E635] bg-[#A3E635] text-[#17352D]'
                    : 'border-white/25 text-white/70 hover:border-white/50'
                }`}
              >
                {state}
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
