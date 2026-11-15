import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
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
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type FieldOut } from '../../api/client'
import { useWizard, type Priorities } from '../../state/wizard'

const KEYS = ['water', 'soil', 'yield', 'risk'] as const
type Key = (typeof KEYS)[number]

/**
 * Linked priority mixer: the four weights always total exactly 100.
 * Increasing one slider redistributes the remaining weight across the others,
 * preserving their relative proportions (or splitting evenly when all are 0).
 */
export function rebalance(current: Priorities, changed: Key, nextValue: number): Priorities {
  const clamped = Math.max(0, Math.min(100, Math.round(nextValue)))
  const others = KEYS.filter((k) => k !== changed)
  const remaining = 100 - clamped
  const othersSum = others.reduce((sum, k) => sum + current[k], 0)

  const result: Priorities = { ...current, [changed]: clamped } as Priorities
  if (othersSum === 0) {
    // Nothing to scale: distribute evenly.
    for (const k of others) result[k] = Math.floor(remaining / others.length)
    // Exactness: push the leftover onto the first other key.
    let assigned = others.reduce((sum, k) => sum + result[k], 0)
    result[others[0]] += remaining - assigned
  } else {
    let assigned = 0
    others.forEach((k, i) => {
      if (i === others.length - 1) {
        result[k] = remaining - assigned
      } else {
        const share = Math.round((current[k] / othersSum) * remaining)
        result[k] = share
        assigned += share
      }
    })
  }
  return result
}

export function totalOf(p: Priorities): number {
  return KEYS.reduce((sum, k) => sum + p[k], 0)
}

export default function Priorities() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { priorities, setPriorities, answers } = useWizard()
  const isArabic = i18n.language === 'ar'
  const fieldId = (location.state as { fieldId?: string } | null)?.fieldId
  const barRef = useRef<HTMLDivElement>(null)

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
    const target = fieldId
    try {
      let id = target
      if (!id) return
      const historyPayload = answers.crop_history.filter(
        (r) => r.status === 'planted' || r.status === 'fallow' || r.status === 'unknown',
      )
      await api.put(`/api/v1/fields/${id}/profile`, {
        irrigation_type: answers.irrigation_type,
        irrigation_method: answers.irrigation_type === 'rainfed' ? null : answers.irrigation_method,
        water_availability: answers.irrigation_type === 'rainfed' ? null : answers.water_availability,
        water_volume_note: answers.water_volume_note,
        purposes: answers.purposes,
        priorities,
        constraints: answers.banned_crops.length > 0 ? { banned_crops: answers.banned_crops } : null,
      })
      await api.put(`/api/v1/fields/${id}/crop-history`, historyPayload)
      const job = await api.post<{ job_id: string; status: string }>(`/api/v1/fields/${id}/analyses`, {})
      navigate(`/analyses/${job.job_id}/progress`, { state: { fieldId: id } })
    } catch (err) {
      navigate('/setup/questions', { state: { fieldId: target } })
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

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          className="btn-secondary flex items-center gap-2 px-6"
          onClick={() =>
            navigate('/setup/questions', { state: fieldId ? { fieldId } : undefined })
          }
        >
          <ArrowLeft className="rtl:rotate-180" size={16} />
          <span>{t('nav.back')}</span>
        </button>

        <button
          type="button"
          className="btn-leaf flex items-center gap-2.5 px-9 py-3 text-sm shadow-lg group"
          disabled={totalOf(priorities) !== 100}
          onClick={startAnalysis}
        >
          <Sparkles size={16} className="text-mint animate-pulse" />
          <span>{t('analysis.start')}</span>
          <ArrowRight className="transition-transform group-hover:translate-x-1 rtl:group-hover:-translate-x-1 rtl:rotate-180" size={17} />
        </button>
      </div>
    </motion.div>
  )
}
