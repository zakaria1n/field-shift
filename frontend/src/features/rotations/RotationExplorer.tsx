import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  MoveRight,
  Sparkles,
  Sliders,
  TriangleAlert,
  Info,
  Layers,
  CheckCircle2,
  Calendar,
  Compass,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type RotationListOut } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { IndicatorRow } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

const INDICATOR_KEYS = ['water', 'soil', 'yield', 'risk'] as const

export default function RotationExplorer() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()
  const { lang } = useWizard()
  const isArabic = i18n.language === 'ar'

  const { data, isLoading, error } = useQuery({
    queryKey: ['rotations', fieldId],
    queryFn: () => api.get<RotationListOut>(`/api/v1/fields/${fieldId}/rotations`),
  })

  if (isLoading) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto space-y-3">
        <div className="h-10 w-10 mx-auto rounded-full border-2 border-leaf border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-forest">{t('common.loading')}</p>
        <p className="text-xs text-ink-light">Generating feasible crop rotation sequences...</p>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto space-y-3">
        <TriangleAlert size={28} className="mx-auto text-amber-dark" />
        <p className="text-sm font-bold text-red-600">{t('error.generic')}</p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Page Header */}
      <div>
        <div className="flex items-center gap-2">
          <p className="kicker">{t('steps.plans')}</p>
          <span className="badge-glow text-[10px]">Step 5 of 5</span>
        </div>
        <h1 className="mt-1.5 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
          {t('plans.title')}
        </h1>
        <p className="mt-1 text-sm text-ink-muted">{t('plans.subtitle')}</p>
      </div>

      {/* Honest Scientific Coverage Banners */}
      {data.insufficient_data_note && (
        <div className="rounded-2xl border border-amber/40 bg-amber-soft p-4 text-xs font-medium text-ink-muted flex items-start gap-2.5 shadow-sm">
          <Info size={16} className="text-amber-dark shrink-0 mt-0.5" />
          <p className="leading-relaxed">{data.insufficient_data_note}</p>
        </div>
      )}
      {data.current_practice_note && (
        <div className="rounded-2xl border border-line bg-white/90 p-4 text-xs text-ink-muted flex items-start gap-2.5 shadow-sm">
          <Compass size={16} className="text-leaf shrink-0 mt-0.5" />
          <p className="leading-relaxed">{data.current_practice_note}</p>
        </div>
      )}

      {/* 3 Rotation Strategy Cards Grid */}
      <div className="grid gap-6 md:grid-cols-3 items-stretch">
        {data.rotations.map((plan, planIdx) => {
          const indicators = Object.fromEntries(plan.score.indicators.map((i) => [i.key, i]))
          const isRec = plan.is_recommended

          return (
            <motion.article
              key={plan.plan_id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: planIdx * 0.1 }}
              className={`relative flex flex-col rounded-2card p-5 sm:p-6 transition-all duration-300 ${
                isRec
                  ? 'border-2 border-leaf bg-white shadow-xl ring-4 ring-leaf/10'
                  : 'card bg-white/95 border-line shadow-card hover:shadow-card-hover'
              }`}
            >
              {/* Ribbon Header */}
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-xs font-bold text-ink-light">
                    #{planIdx + 1}
                  </span>
                  <h2 className="text-lg font-extrabold text-forest tracking-tight">
                    {plan.label}
                  </h2>
                </div>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold tracking-tight ${
                    isRec
                      ? 'bg-leaf-soft text-forest border border-leaf/40 shadow-sm'
                      : 'bg-cream-warm text-ink-muted border border-line'
                  }`}
                >
                  {isRec && <Sparkles size={11} className="text-leaf" />}
                  {isRec ? t('plans.recommended') : t('plans.alternative')}
                </span>
              </div>

              {/* 3-Year Interactive Connected Crop Timeline */}
              <div className="mt-2 rounded-2xl bg-cream/50 border border-line/70 p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light font-mono flex items-center gap-1">
                    <Calendar size={11} /> 3-Year Crop Sequence
                  </span>
                  <span className="text-[10px] font-mono text-leaf font-bold">
                    {plan.horizon_years} Years
                  </span>
                </div>

                <div className="flex items-center justify-between gap-1">
                  {plan.slots.map((slot, i) => (
                    <div key={slot.slot_id} className="flex-1 flex items-center">
                      <div className="w-full flex flex-col items-center">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-ink-light mb-1 font-mono">
                          {t(`timeline.year`, { n: slot.year_number })}
                        </span>
                        <CropVisual
                          slot={slot}
                          size="xs"
                          interactive
                          className="w-full bg-white shadow-xs"
                        />
                      </div>
                      {i < plan.slots.length - 1 && (
                        <span className="px-1 text-ink-light/40 font-bold text-xs shrink-0 rtl:rotate-180" aria-hidden>
                          ›
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Agronomic Summary Statement */}
              <p className="mt-4 text-xs text-ink-muted leading-relaxed">
                <bdi>{lang === 'ar' ? plan.summary_ar : plan.summary_en}</bdi>
              </p>

              {/* Scientific Performance Indicator Bars */}
              <div className="mt-5 space-y-3 pt-3 border-t border-line/70">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink-light font-mono block mb-1">
                  Agronomic Indices
                </span>
                {INDICATOR_KEYS.map((key) => {
                  const ind = indicators[key]
                  if (!ind) return null
                  return (
                    <IndicatorRow
                      key={key}
                      label={lang === 'ar' ? ind.label_ar : ind.label_en}
                      value={ind.value}
                      status={ind.status}
                    />
                  )
                })}
              </div>

              {/* Limitation / Trade-Off Pill */}
              {(lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en) && (
                <div className="mt-4 rounded-xl bg-amber-soft/80 border border-amber/30 p-2.5 text-[11px] text-ink-muted leading-snug flex items-start gap-2">
                  <TriangleAlert size={13} className="text-amber-dark shrink-0 mt-0.5" />
                  <p>
                    <span className="font-bold text-amber-dark">{t('plan.limitation')}: </span>
                    <bdi>{lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en}</bdi>
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-auto pt-5 space-y-2">
                <Link
                  to={`/rotations/${plan.plan_id}`}
                  className={`w-full py-2.5 text-xs font-bold flex items-center justify-center gap-1.5 rounded-full transition-all ${
                    isRec ? 'btn-leaf shadow-md' : 'btn-primary'
                  }`}
                >
                  <span>{t('plans.viewDetails')}</span>
                  <ArrowRight size={14} className="rtl:rotate-180" />
                </Link>

                <Link
                  to={`/rotations/${plan.plan_id}/customize`}
                  className="btn-secondary w-full !py-2 text-xs flex items-center justify-center gap-1.5"
                >
                  <Sliders size={13} className="text-leaf" />
                  <span>{t('plan.customize')}</span>
                </Link>
              </div>
            </motion.article>
          )
        })}
      </div>

      <p className="mt-2 text-xs text-ink-light text-center">{t('plan.scoreNote')}</p>
    </motion.div>
  )
}
