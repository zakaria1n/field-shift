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
  Radar,
  Search,
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
    if (status === 'complete') {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-leaf-soft text-leaf">
          <CheckCircle2 size={15} strokeWidth={2.5} />
        </span>
      )
    }
    if (status === 'running') {
      return (
        <div className="relative flex h-5 w-5 items-center justify-center">
          <span className="absolute inset-0 rounded-full bg-leaf/25 animate-ping" />
          <Loader2 size={16} strokeWidth={2.5} className="animate-spin text-leaf relative z-10" />
        </div>
      )
    }
    if (status === 'failed') {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
          <XCircle size={15} strokeWidth={2.5} />
        </span>
      )
    }
    if (status === 'skipped') {
      return (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-amber-700">
          <TriangleAlert size={14} strokeWidth={2.5} />
        </span>
      )
    }
    // Waiting / pending stage: cleanly muted
    return (
      <span className="flex h-5 w-5 items-center justify-center rounded-full text-ink-light/40">
        <CircleDashed size={15} strokeWidth={2} />
      </span>
    )
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-xl space-y-3"
    >
      {/* Compact Page Header */}
      <div className="flex items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="kicker !text-[10px]">{t('steps.analysis')}</p>
            <span className="badge-glow !text-[10px] !py-0.5 !px-2 flex items-center gap-1 font-mono">
              <Radio size={10} className="text-leaf animate-pulse" /> Live Telemetry
            </span>
          </div>
          <h1 className="mt-0.5 text-xl sm:text-2xl font-extrabold text-forest tracking-tight">
            {t('analysis.title')}
          </h1>
        </div>
        <p className="text-xs text-ink-muted hidden sm:block max-w-xs text-end leading-tight">
          {t('analysis.subtitle')}
        </p>
      </div>

      <div
        className="card-elevated overflow-hidden border border-line bg-white shadow-card-hover"
        role="status"
        aria-label={t('aria.progress')}
      >
        {/* Compact Atmospheric Telemetry Banner Strip (Reduced from 144px to 68px) */}
        <div className="relative h-16 sm:h-20 overflow-hidden bg-forest-dark flex items-center justify-between px-3 sm:px-4">
          <img
            src="/assets/satellite_earth_telemetry.jpg"
            alt="Earth observation satellite telemetry"
            className="absolute inset-0 w-full h-full object-cover opacity-75"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-forest-dark/95 via-forest-dark/70 to-forest-dark/95" />

          {/* Left badge */}
          <div className="relative z-10 flex items-center gap-1.5 shrink-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/90 text-white border border-forest-light px-2.5 py-0.5 text-[10px] font-mono font-bold shadow-xs">
              <Satellite size={11} className="text-leaf animate-spin" style={{ animationDuration: '6s' }} />
              <span className="hidden xs:inline">Earth Observation</span> Pipeline
            </span>
          </div>

          {/* Right status */}
          <div className="relative z-10 flex items-center gap-1.5 text-xs shrink-0">
            <span className="font-bold text-forest font-mono text-[10px] bg-white/95 px-2 py-0.5 rounded border border-line hidden sm:inline">
              JobID: {jobId?.slice(0, 8)}...
            </span>
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${
                job?.status === 'complete'
                  ? 'bg-leaf-soft text-forest border-leaf/40'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50 animate-pulse'
              }`}
            >
              {job?.status ? job.status.toUpperCase() : 'INITIALIZING'}
            </span>
          </div>
        </div>

        {/* Real Backend Stages List (Significantly compacted: ~35px per row) */}
        <div className="p-3 sm:p-4 space-y-2">
          <ul className="space-y-1.5">
            {STAGE_ORDER.map((key) => {
              const status = stageStatus(key)
              const detail = job?.stages.find((s) => s.key === key)?.detail
              const fallbackDesc = stageDescriptions[key]?.[isArabic ? 'ar' : 'en']
              const isRunning = status === 'running'
              const isComplete = status === 'complete'
              const isPending = status === 'pending'

              return (
                <li
                  key={key}
                  className={`flex items-center gap-2.5 rounded-xl px-3 py-2 transition-all duration-200 ${
                    isRunning
                      ? 'bg-leaf-soft/70 border border-leaf/40 shadow-2xs ring-1 ring-leaf/20'
                      : isComplete
                        ? 'bg-cream-warm/40 border border-line/60'
                        : isPending
                          ? 'bg-cream/25 border border-transparent opacity-65'
                          : 'bg-red-50/80 border border-red-200'
                  }`}
                >
                  <span className="shrink-0">{stageIcon(status)}</span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={`text-xs sm:text-sm font-bold truncate ${
                          isRunning
                            ? 'text-forest font-extrabold'
                            : isComplete
                              ? 'text-forest'
                              : 'text-ink-muted'
                        }`}
                      >
                        {t(`analysis.stage.${key === 'yield_reference' ? 'yield_reference' : key}`)}
                      </p>

                      <span
                        className={`text-[9px] font-mono uppercase font-bold tracking-wider shrink-0 px-2 py-0.5 rounded-full ${
                          isRunning
                            ? 'bg-leaf text-white shadow-2xs animate-pulse'
                            : isComplete
                              ? 'bg-leaf-soft text-forest border border-leaf/30'
                              : isPending
                                ? 'text-ink-light'
                                : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <p
                      className={`text-[11px] truncate mt-0.5 leading-tight ${
                        isRunning ? 'text-forest font-medium' : 'text-ink-muted/80'
                      }`}
                    >
                      {detail || fallbackDesc}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>

          {/* Compact Provenance Footer Strip */}
          <div className="pt-2 border-t border-line/60 flex flex-wrap items-center justify-between gap-1.5 text-[10px] font-mono text-ink-light">
            <span className="font-bold text-forest">
              Data: NASA POWER · SoilGrids 250m · FAO GAEZ v5
            </span>
            {job?.sources.some((s) => s.status === 'cached') && (
              <span className="text-sky font-semibold">
                Cached baselines synced
              </span>
            )}
          </div>

          {job?.status === 'failed' && (
            <div className="mt-2 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-xs font-bold text-red-700">{t('analysis.failed')}</p>
              <p className="mt-0.5 text-[11px] text-red-600">{job.error?.message ?? t('error.generic')}</p>
              <button
                type="button"
                className="btn-primary mt-2 !py-1 !px-3 text-xs inline-flex items-center gap-1.5"
                onClick={() => window.location.reload()}
              >
                <RotateCcw size={12} /> {t('analysis.retry')}
              </button>
            </div>
          )}

          {job?.status === 'partial' && (
            <div className="mt-2 rounded-xl border border-amber/40 bg-amber-soft p-2.5 text-xs font-semibold text-amber-dark">
              {t('analysis.partial')}
            </div>
          )}

          {error && <p className="mt-2 text-xs text-red-600 font-medium">{error}</p>}
        </div>
      </div>
    </motion.div>
  )
}
