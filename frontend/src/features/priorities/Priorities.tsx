import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Info,
  RotateCcw,
  Droplets,
  Sprout,
  TrendingUp,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Sliders,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type FieldOut } from '../../api/client'
import { useWizard, type Priorities } from '../../state/wizard'

const KEYS = ['water', 'soil', 'yield', 'risk'] as const
type Key = (typeof KEYS)[number]

/**
 * Linked priority mixer: the four weights always total exactly 100 with non-negative integers.
 * Uses the Largest Remainder Method (Hamilton-Hare) to guarantee that every priority
 * remains an integer >= 0 and <= 100, and their sum equals exactly 100.
 */
export function rebalance(current: Priorities, changed: Key, nextValue: number): Priorities {
  const target = Math.max(0, Math.min(100, Math.round(nextValue)))
  const others = KEYS.filter((k) => k !== changed)
  const remaining = 100 - target

  if (remaining === 0) {
    return { water: 0, soil: 0, yield: 0, risk: 0, [changed]: 100 } as Priorities
  }

  const othersSum = others.reduce((s, k) => s + Math.max(0, current[k] || 0), 0)

  let rawShares: number[]
  if (othersSum === 0) {
    rawShares = others.map(() => remaining / others.length)
  } else {
    rawShares = others.map((k) => (Math.max(0, current[k] || 0) / othersSum) * remaining)
  }

  const floors = rawShares.map((s) => Math.floor(s))
  const allocated = floors.reduce((a, b) => a + b, 0)
  const remainder = remaining - allocated

  // Distribute remainder by largest fractional part (Hamilton-Hare / Largest Remainder)
  const fractions = rawShares.map((s, idx) => ({ idx, frac: s - floors[idx] }))
  fractions.sort((a, b) => (b.frac - a.frac !== 0 ? b.frac - a.frac : b.idx - a.idx))

  for (let i = 0; i < remainder; i++) {
    floors[fractions[i].idx] += 1
  }

  const result: Priorities = { water: 0, soil: 0, yield: 0, risk: 0, [changed]: target }
  others.forEach((k, i) => {
    result[k] = floors[i]
  })

  return result
}

export function totalOf(p: Priorities): number {
  return KEYS.reduce((sum, k) => sum + p[k], 0)
}

export default function Priorities() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const { priorities, setPriorities, answers, fieldId: wizardFieldId, setFieldId } = useWizard()
  const isArabic = i18n.language === 'ar'
  const fieldId = (location.state as { fieldId?: string } | null)?.fieldId || searchParams.get('field') || wizardFieldId
  const barRef = useRef<HTMLDivElement>(null)

  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    if (fieldId && fieldId !== wizardFieldId) {
      setFieldId(fieldId)
    }
  }, [fieldId, wizardFieldId, setFieldId])

  useEffect(() => {
    if (totalOf(priorities) !== 100) setPriorities({ water: 25, soil: 25, yield: 25, risk: 25 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const priorityMeta: Record<
    Key,
    {
      label: string
      desc: string
      icon: typeof Droplets
      color: string
      bgLight: string
      border: string
      accent: string
    }
  > = {
    water: {
      label: t('mixer.water'),
      desc: isArabic
        ? 'تقليل الاحتياجات المائية والاعتماد على رصدات FAO 56'
        : 'Favors low water-demand crops & drought resilience (FAO 56)',
      icon: Droplets,
      color: 'text-sky',
      bgLight: 'bg-sky-soft',
      border: 'border-sky/30',
      accent: '#3B8EA5',
    },
    soil: {
      label: t('mixer.soil'),
      desc: isArabic
        ? 'تعزيز تثبيت النيتروجين وتنوع الجذور وتجديد المادة العضوية'
        : 'Favors legumes, organic carbon build-up & root depth diversity',
      icon: Sprout,
      color: 'text-leaf',
      bgLight: 'bg-leaf-soft',
      border: 'border-leaf/30',
      accent: '#229E65',
    },
    yield: {
      label: t('mixer.yield'),
      desc: isArabic
        ? 'سقوف المردود المحتمل وفق نماذج FAO GAEZ v5'
        : 'Modeled agro-climatic attainable yield ceiling (GAEZ v5)',
      icon: TrendingUp,
      color: 'text-amber-dark',
      bgLight: 'bg-amber-soft',
      border: 'border-amber/30',
      accent: '#D9943B',
    },
    risk: {
      label: t('mixer.risk'),
      desc: isArabic
        ? 'الحماية من الصدمات الحرارية وتقلبات هطول الأمطار'
        : 'Buffers against extreme temperatures & erratic precipitation',
      icon: ShieldCheck,
      color: 'text-forest',
      bgLight: 'bg-cream-warm',
      border: 'border-forest/20',
      accent: '#0E2921',
    },
  }

  // Quick Preset Strategies
  const presets = [
    {
      name: isArabic ? 'متوازن' : 'Balanced',
      weights: { water: 25, soil: 25, yield: 25, risk: 25 },
    },
    {
      name: isArabic ? 'توفير المياه' : 'Drought Saver',
      weights: { water: 45, soil: 20, yield: 15, risk: 20 },
    },
    {
      name: isArabic ? 'تجديد التربة' : 'Soil Restorer',
      weights: { water: 20, soil: 50, yield: 15, risk: 15 },
    },
    {
      name: isArabic ? 'أقصى إنتاجية' : 'Yield Focus',
      weights: { water: 15, soil: 20, yield: 50, risk: 15 },
    },
  ]

  async function startAnalysis() {
    setErrorMessage(null)
    let id = fieldId || wizardFieldId || searchParams.get('field')
    if (!id) {
      try {
        const dashboard = await api.get<Array<{ field_id: string }>>('/api/v1/dashboard')
        if (dashboard && dashboard.length > 0) {
          id = dashboard[0].field_id
          setFieldId(id)
        }
      } catch {
        // ignore
      }
    }

    if (!id) {
      setErrorMessage(isArabic ? 'يرجى تحديد حقل أولاً للمتابعة' : 'Please select or draw a field first.')
      return
    }

    // Ensure priorities total exactly 100 with non-negative integers
    const normalizedPriorities = rebalance(priorities, 'water', priorities.water)
    setPriorities(normalizedPriorities)

    setSubmitting(true)
    try {
      const isIrrigatedOrMixed = answers.irrigation_type === 'irrigated' || answers.irrigation_type === 'mixed'
      await api.put(`/api/v1/fields/${id}/profile`, {
        irrigation_type: answers.irrigation_type,
        irrigation_method: isIrrigatedOrMixed ? answers.irrigation_method : null,
        water_availability: isIrrigatedOrMixed ? answers.water_availability : null,
        water_volume_note: answers.water_volume_note,
        purposes: answers.purposes,
        priorities: {
          water: normalizedPriorities.water,
          soil: normalizedPriorities.soil,
          yield: normalizedPriorities.yield,
          risk: normalizedPriorities.risk,
        },
        constraints: answers.banned_crops.length > 0 ? { banned_crops: answers.banned_crops } : null,
      })

      // Sanitize crop history: if planted without crop_id, convert to unknown to avoid 422
      const historyPayload = answers.crop_history
        .map((r) => {
          if (r.status === 'planted' && (!r.crop_id || !r.crop_id.trim())) {
            return { ...r, status: 'unknown' as const, crop_id: null }
          }
          return r
        })
        .filter((r) => r.status === 'planted' || r.status === 'fallow' || r.status === 'unknown')

      await api.put(`/api/v1/fields/${id}/crop-history`, historyPayload)
      const job = await api.post<{ job_id: string; status: string }>(`/api/v1/fields/${id}/analyses`, {})
      navigate(`/analyses/${job.job_id}/progress`, { state: { fieldId: id } })
    } catch (err: any) {
      console.error('Failed to start analysis:', err)
      setSubmitting(false)
      const msg = err?.message || (err instanceof Error ? err.message : t('error.generic'))
      setErrorMessage(msg)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-3xl space-y-6"
    >
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="kicker">{t('steps.priorities')}</p>
          <span className="badge-glow text-[10px]">Step 3 of 5</span>
        </div>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
          {t('mixer.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('mixer.subtitle')}</p>
      </div>

      <div className="card p-6 sm:p-8 bg-white shadow-card-hover border border-line space-y-6">
        {/* Linked Multi-Segment Ribbon Visualizer */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-light font-mono flex items-center gap-1.5">
              <Sliders size={13} className="text-leaf" /> {t('mixer.balanceNote')}
            </span>
            <div className="flex items-center gap-1.5 font-mono text-xs font-bold text-forest bg-cream-warm px-2.5 py-1 rounded-full border border-line">
              <CheckCircle2 size={13} className="text-leaf" />
              <span>{t('mixer.total')}:</span>
              <span data-testid="mixer-total" className="text-leaf font-extrabold text-sm">
                {totalOf(priorities)}
              </span>
              <span>%</span>
            </div>
          </div>

          {/* Connected Glowing Progress Bar */}
          <div
            ref={barRef}
            className="flex h-5 w-full overflow-hidden rounded-full border border-line p-0.5 bg-cream shadow-inner"
            aria-hidden
          >
            {KEYS.map((k) => (
              <div
                key={k}
                className="h-full first:rounded-s-full last:rounded-e-full transition-all duration-300 relative group"
                style={{
                  width: `${priorities[k]}%`,
                  backgroundColor: priorityMeta[k].accent,
                }}
              />
            ))}
          </div>

          {/* Segment Mini Legend with Percentages */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
            {KEYS.map((k) => (
              <div key={k} className="flex items-center gap-1.5">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: priorityMeta[k].accent }}
                />
                <span className="truncate text-ink-muted">{priorityMeta[k].label}:</span>
                <span className="font-bold text-forest">{priorities[k]}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Preset Selector */}
        <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-line/60">
          <span className="text-xs font-bold text-ink-light flex items-center gap-1">
            <Sparkles size={12} className="text-leaf" /> {isArabic ? 'نماذج جاهزة:' : 'Presets:'}
          </span>
          {presets.map((p) => (
            <button
              key={p.name}
              type="button"
              onClick={() => setPriorities(p.weights as Priorities)}
              className="chip hover:border-leaf hover:bg-leaf-soft hover:text-forest text-xs py-1 px-3 transition-all"
            >
              {p.name}
            </button>
          ))}
          <button
            type="button"
            className="btn-ghost ms-auto text-xs flex items-center gap-1"
            onClick={() => setPriorities({ water: 25, soil: 25, yield: 25, risk: 25 })}
          >
            <RotateCcw size={12} /> {t('mixer.reset')}
          </button>
        </div>

        {/* 4 Interactive Slider Cards */}
        <div className="space-y-4 pt-2">
          {KEYS.map((k) => {
            const meta = priorityMeta[k]
            const Icon = meta.icon
            return (
              <div
                key={k}
                className={`rounded-2xl border p-4.5 transition-all duration-200 ${
                  meta.border
                } ${meta.bgLight}/40 hover:shadow-sm`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ${meta.color}`}
                    >
                      <Icon size={18} />
                    </span>
                    <div>
                      <label htmlFor={`slider-${k}`} className="text-sm font-extrabold text-forest block">
                        {meta.label}
                      </label>
                      <p className="text-[11px] text-ink-muted leading-tight mt-0.5">{meta.desc}</p>
                    </div>
                  </div>

                  {/* Percentage Display Badge */}
                  <span
                    className="font-mono text-base font-extrabold px-3 py-1 rounded-xl bg-white shadow-sm border border-line text-forest min-w-[3.5rem] text-center"
                    aria-hidden
                  >
                    <bdi>{priorities[k]}</bdi>%
                  </span>
                </div>

                {/* Range Slider Track */}
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-[10px] font-mono text-ink-light">0%</span>
                  <input
                    id={`slider-${k}`}
                    data-testid={`slider-${k}`}
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    value={priorities[k]}
                    aria-label={t('aria.slider', { label: meta.label })}
                    aria-valuetext={`${priorities[k]} percent`}
                    onChange={(e) => setPriorities(rebalance(priorities, k, Number(e.target.value)))}
                    style={{ accentColor: meta.accent }}
                    className="w-full h-2 rounded-lg cursor-pointer bg-line"
                  />
                  <span className="text-[10px] font-mono text-ink-light">100%</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Honest Scientific Yield != Profit Disclaimer */}
        <div className="rounded-2xl border border-sky/30 bg-sky-soft/60 p-4 flex items-start gap-3 text-xs text-ink-muted leading-relaxed">
          <Info size={16} className="text-sky shrink-0 mt-0.5" />
          <span>{t('mixer.yieldNote')}</span>
        </div>
      </div>

      {/* Error Feedback Message if Submission Failed */}
      {errorMessage && (
        <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-xs text-red-700 flex items-start gap-3 shadow-sm animate-fade-in">
          <AlertCircle size={18} className="text-red-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-bold text-sm text-red-800">
              {isArabic ? 'تعذر بدء التحليل' : 'Failed to start field analysis'}
            </p>
            <p className="mt-1 text-red-600 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          className="btn-secondary flex items-center gap-2 px-6"
          onClick={() =>
            navigate(`/setup/questions${fieldId ? `?field=${fieldId}` : ''}`, { state: fieldId ? { fieldId } : undefined })
          }
        >
          <ArrowLeft className="rtl:rotate-180" size={16} />
          <span>{t('nav.back')}</span>
        </button>

        <button
          type="button"
          className="btn-leaf flex items-center gap-2.5 px-9 py-3 text-sm shadow-lg group disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={totalOf(priorities) !== 100 || submitting}
          onClick={startAnalysis}
        >
          {submitting ? (
            <>
              <Loader2 size={16} className="text-mint animate-spin" />
              <span>{isArabic ? 'جاري التحضير...' : 'Starting analysis...'}</span>
            </>
          ) : (
            <>
              <Sparkles size={16} className="text-mint animate-pulse" />
              <span>{t('analysis.start')}</span>
              <ArrowRight className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" size={17} />
            </>
          )}
        </button>
      </div>
    </motion.div>
  )
}
