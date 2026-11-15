import { useEffect, useState } from 'react'
import { useNavigate, useLocation, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  CheckCircle2,
  CircleDashed,
  Loader2,
  TriangleAlert,
  XCircle,
  Satellite,
  Database,
  Layers,
  Sparkles,
  Radio,
  RotateCcw,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type AnalysisJobOut } from '../../api/client'
import { StatusBadge } from '../../app/components/ui'

const STAGE_ORDER = ['geometry', 'climate', 'soil', 'yield_reference', 'suitability', 'rotation']

export default function AnalysisProgress() {
  const { t, i18n } = useTranslation()
  const { jobId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const fieldId = (location.state as { fieldId?: string } | null)?.fieldId
  const [job, setJob] = useState<AnalysisJobOut | null>(null)
  const [error, setError] = useState<string | null>(null)
  const isArabic = i18n.language === 'ar'

  useEffect(() => {
    let alive = true
    async function poll() {
      while (alive) {
        try {
          const data = await api.get<AnalysisJobOut>(`/api/v1/analyses/${jobId}`)
          if (!alive) return
          setJob(data)
          if (data.status === 'complete' || data.status === 'partial') {
            setTimeout(() => alive && navigate(`/fields/${fieldId ?? data.field_id}/rotations`), 800)
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
    if (status === 'complete') return <CheckCircle2 size={19} className="text-leaf" />
    if (status === 'running') return <Loader2 size={19} className="animate-spin text-sky" />
    if (status === 'failed') return <XCircle size={19} className="text-red-600" />
    if (status === 'skipped') return <TriangleAlert size={19} className="text-amber-dark" />
    return <CircleDashed size={19} className="text-ink-light/40" />
  }

  const stageDescriptions: Record<string, { en: string; ar: string }> = {
    geometry: {
      en: 'Validating spatial closure, geodesic area and bounding box on WGS84 ellipsoid',
      ar: 'التحقق من انغلاق المضلع وحساب المساحة الجيوديسية الإهليلجية بدقة',
    },
    climate: {
      en: 'Retrieving solar radiation, temperature bands & precipitation from NASA POWER',
      ar: 'استرداد الإشعاع الشمسي والحرارة وهطول الأمطار من مرصد NASA POWER',
    },
    soil: {
      en: 'Extracting soil organic carbon, clay/sand texture and pH at 250m resolution (SoilGrids)',
      ar: 'استخراج خصائص التربة والكربون العضوي والقوام والحموضة بدقة 250م (SoilGrids)',
    },
    yield_reference: {
      en: 'Querying FAO GAEZ v5 agro-ecological yield baseline ceilings under high-input models',
      ar: 'استعلام سقوف المردود المحتمل وفق نماذج FAO GAEZ v5 الزراعية البيئية',
    },
    suitability: {
      en: 'Applying agronomic hard constraints, drought tolerances and rotation rules',
      ar: 'تطبيق القيود الزراعية الحتمية ومقاومة الجفاف وقواعد التناوب',
    },
    rotation: {
      en: 'Evaluating multi-season crop succession strategies against user priority weights',
      ar: 'تقييم استراتيجيات التناوب متعددة السنوات وموازنة أوزان الأولويات',
    },
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-2xl space-y-6"
    >
      <div>
        <div className="flex items-center gap-2">
          <p className="kicker">{t('steps.analysis')}</p>
          <span className="badge-glow text-[10px] flex items-center gap-1 font-mono">
            <Radio size={11} className="text-leaf animate-pulse" /> Live Telemetry
          </span>
        </div>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
          {t('analysis.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('analysis.subtitle')}</p>
      </div>

      <div className="card-elevated overflow-hidden border border-line bg-white shadow-card-hover" role="status" aria-label={t('aria.progress')}>
        {/* Orbital Telemetry Banner Visual */}
        <div className="relative h-32 sm:h-36 overflow-hidden bg-forest-dark">
          <img
            src="/assets/satellite_earth_telemetry.jpg"
            alt="Earth observation satellite telemetry"
            className="w-full h-full object-cover opacity-80"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-white via-white/20 to-transparent" />
          <div className="absolute top-3.5 start-4 flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/90 text-white border border-forest-light px-2.5 py-0.5 text-[10px] font-mono font-bold shadow-md">
              <Satellite size={11} className="text-emerald-400 animate-spin" style={{ animationDuration: '6s' }} />
              Earth Observation Pipeline
            </span>
          </div>
          <div className="absolute bottom-3 start-4 end-4 flex items-center justify-between text-xs">
            <span className="font-bold text-forest font-mono text-[11px] bg-white/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-line">
              JobID: {jobId?.slice(0, 8)}...
            </span>
            <span className="text-[11px] font-semibold text-leaf bg-leaf-soft px-2.5 py-1 rounded-full border border-leaf/30">
              {job?.status ? job.status.toUpperCase() : 'INITIALIZING'}
            </span>
          </div>
        </div>

        {/* Real Backend Stages List */}
        <div className="p-5 sm:p-6 space-y-4">
          <ul className="space-y-3.5">
            {STAGE_ORDER.map((key) => {
              const status = stageStatus(key)
              const detail = job?.stages.find((s) => s.key === key)?.detail
              const fallbackDesc = stageDescriptions[key]?.[isArabic ? 'ar' : 'en']

              return (
                <li
                  key={key}
                  className={`flex items-start gap-3.5 rounded-xl p-3 transition-all duration-300 ${
                    status === 'running'
                      ? 'bg-sky-soft/70 border border-sky/30 shadow-sm ring-1 ring-sky/20'
                      : status === 'complete'
                        ? 'bg-cream-warm/40 border border-line/60'
                        : 'opacity-65'
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{stageIcon(status)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-sm font-extrabold ${
                          status === 'running'
                            ? 'text-sky-deep'
                            : status === 'complete'
                              ? 'text-forest'
                              : 'text-ink-muted'
                        }`}
                      >
                        {t(`analysis.stage.${key === 'yield_reference' ? 'yield_reference' : key}`)}
                      </p>
                      <span className="text-[10px] font-mono uppercase font-bold text-ink-light">
                        {status}
                      </span>
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5 leading-relaxed">
                      {detail || fallbackDesc}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Scientific Provenance Indicators */}
          <div className="mt-6 border-t border-line/80 pt-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-ink-light font-mono">
              {t('insights.provenance')}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <StatusBadge kind={sourceStatus('nasa_power') as never}>
                {t('analysis.stage.climate')} (NASA POWER)
              </StatusBadge>
              <StatusBadge kind={sourceStatus('soilgrids') as never}>
                {t('analysis.stage.soil')} (SoilGrids ISRIC)
              </StatusBadge>
              <StatusBadge kind={sourceStatus('gaez_v5') as never}>
                {t('analysis.stage.yield_reference')} (FAO GAEZ v5)
              </StatusBadge>
            </div>

            {job?.sources
              .filter((s) => s.status === 'cached')
              .map((s) => (
                <p key={s.source_id} className="mt-2 text-xs text-sky font-medium">
                  {s.source_id}: {t('analysis.source.cached')} · {s.fetched_at}
                </p>
              ))}
          </div>

          {job?.status === 'failed' && (
            <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4">
              <p className="text-sm font-bold text-red-700">{t('analysis.failed')}</p>
              <p className="mt-1 text-xs text-red-600">{job.error?.message ?? t('error.generic')}</p>
              <button
                type="button"
                className="btn-primary mt-3 text-xs flex items-center gap-1.5"
                onClick={() => window.location.reload()}
              >
                <RotateCcw size={13} /> {t('analysis.retry')}
              </button>
            </div>
          )}

          {job?.status === 'partial' && (
            <div className="mt-5 rounded-2xl border border-amber/40 bg-amber-soft p-4 text-xs font-semibold text-amber-dark">
              {t('analysis.partial')}
            </div>
          )}

          {error && <p className="mt-4 text-sm text-red-600 font-medium">{error}</p>}
        </div>
      </div>
    </motion.div>
  )
}
