import { Link, useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  FileText,
  TriangleAlert,
  Sparkles,
  Calendar,
  Compass,
  CheckCircle2,
  Sliders,
  ShieldAlert,
  ArrowRight,
  Database,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type RotationOut } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { IndicatorRow } from '../../app/components/ui'
import { ScoreEvidence } from '../../app/components/ScoreEvidence'
import { useWizard } from '../../state/wizard'

const INDICATOR_KEYS = ['water', 'soil', 'yield', 'risk'] as const

export default function PlanDetails() {
  const { t, i18n } = useTranslation()
  const { ref } = useParams()
  const navigate = useNavigate()
  const { lang, fieldId } = useWizard()
  const isArabic = i18n.language === 'ar'

  const { data: plan, isLoading, error } = useQuery({
    queryKey: ['rotation', ref],
    queryFn: () => api.get<RotationOut>(`/api/v1/rotations/${ref}`),
  })

  if (isLoading) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto space-y-3">
        <div className="h-10 w-10 mx-auto rounded-full border-2 border-leaf border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-forest">{t('common.loading')}</p>
      </div>
    )
  }

  if (error || !plan) {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto space-y-3">
        <TriangleAlert size={28} className="mx-auto text-amber-dark" />
        <p className="text-sm font-bold text-red-600">{t('error.generic')}</p>
      </div>
    )
  }

  const fieldRoute = fieldId ?? plan.plan_id.split('--')[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Back button */}
      <button
        type="button"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-forest hover:text-leaf transition-colors"
        onClick={() => navigate(-1)}
      >
        <ArrowLeft size={15} className="rtl:rotate-180" />
        <span>{t('nav.back')}</span>
      </button>

      {/* Title & Metadata Strip */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            {plan.label}
          </h1>
          <span className="chip font-mono text-xs">
            {t('plan.years', { n: plan.horizon_years })}
          </span>
          {plan.is_recommended && (
            <span className="inline-flex items-center gap-1 rounded-full bg-leaf-soft border border-leaf/40 px-3 py-1 text-xs font-bold text-forest shadow-sm">
              <Sparkles size={12} className="text-leaf" />
              {t('plans.recommended')}
            </span>
          )}
        </div>
      </div>

      {/* Flagship Interactive 3-Year Visual Timeline Banner */}
      <div className="card-elevated p-6 bg-white border border-line shadow-card-hover space-y-4">
        <div className="flex items-center justify-between border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-leaf" />
            <h2 className="text-sm font-extrabold uppercase tracking-wider text-forest font-mono">
              {t('customize.sequence')} · {plan.horizon_years} Years
            </h2>
          </div>
          <span className="text-xs font-mono text-ink-light font-bold">
            NASA POWER & SoilGrids Aligned
          </span>
        </div>

        {/* 3 Large Botanical Crop Cards connected by arrows */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {plan.slots.map((slot, i) => (
            <div key={slot.slot_id} className="relative flex flex-col items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-ink-light mb-2 font-mono">
                {t('timeline.year', { n: slot.year_number })}
              </span>

              <CropVisual
                slot={slot}
                size="md"
                interactive
                showFamily
                className="w-full bg-cream-warm/30 shadow-sm hover:shadow-md"
              />

              {/* Planting & Harvest Window Callout */}
              {slot.planting_window && (
                <div className="mt-2.5 w-full rounded-xl bg-cream border border-line p-2 text-center text-[10px] text-ink-muted leading-tight font-mono">
                  <p>
                    <span className="font-bold text-forest">{t('insights.planting')}: </span>
                    <bdi>{slot.planting_window.planting_months.join('–')}</bdi>
                  </p>
                  <p className="mt-0.5">
                    <span className="font-bold text-forest">{t('insights.harvest')}: </span>
                    <bdi>{slot.planting_window.harvest_months.join('–')}</bdi>
                  </p>
                </div>
              )}

              {/* Connector for desktop */}
              {i < plan.slots.length - 1 && (
                <span
                  className="hidden sm:block absolute -end-3 top-1/3 text-leaf/60 font-bold text-lg rtl:rotate-180 z-10"
                  aria-hidden
                >
                  ›
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Two-Column Deep Dive: Strategic Rationale vs Evidence & Limitations */}
      <div className="grid gap-6 md:grid-cols-2 items-start">
        {/* Left Card: Strategic Summary & Scored Indices */}
        <div className="card p-6 bg-white border border-line space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink-light font-mono flex items-center gap-1.5">
            <Compass size={14} className="text-leaf" /> {t('plan.why')}
          </h2>

          <p className="text-sm text-ink-muted leading-relaxed">
            <bdi>{lang === 'ar' ? plan.summary_ar : plan.summary_en}</bdi>
          </p>

          <div className="pt-3 border-t border-line space-y-3">
            <span className="text-[11px] font-bold uppercase tracking-wider text-ink-light font-mono block">
              Multi-Objective Evaluated Indices
            </span>
            {INDICATOR_KEYS.map((key) => {
              const ind = plan.score.indicators.find((i) => i.key === key)
              if (!ind) return null
              return (
                <IndicatorRow
                  key={key}
                  label={lang === 'ar' ? ind.label_ar : ind.label_en}
                  value={ind.value}
                  status={ind.status}
                  weight={Math.round((plan.score.weights_applied[key] ?? 0) * 100)}
                />
              )
            })}
          </div>

          {plan.score.weight_redistribution_note && (
            <p className="text-xs text-sky font-medium bg-sky-soft p-2.5 rounded-xl border border-sky/30">
              {plan.score.weight_redistribution_note}
            </p>
          )}
          <ScoreEvidence score={plan.score} />

          <p className="text-[11px] text-ink-light italic">{t('plan.scoreNote')}</p>
        </div>

        {/* Right Card: Limitations & Evidence Rule IDs */}
        <div className="card p-6 bg-white border border-line space-y-4">
          <h2 className="text-xs font-extrabold uppercase tracking-wider text-ink-light font-mono flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-amber-dark" /> {t('plan.limitation')}
          </h2>

          <div className="rounded-2xl border border-amber/40 bg-amber-soft p-3.5 flex items-start gap-2.5 text-xs text-ink-muted leading-relaxed">
            <TriangleAlert size={16} className="text-amber-dark shrink-0 mt-0.5" />
            <p>
              <bdi>{(lang === 'ar' ? plan.main_limitation_ar : plan.main_limitation_en) ?? t('common.unknown')}</bdi>
            </p>
          </div>

          {/* Scientific Provenance Rule IDs */}
          <div className="pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-ink-light font-mono flex items-center gap-1.5">
              <Database size={13} className="text-forest" /> {t('plan.evidence')}
            </h3>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {plan.evidence.source_ids.map((s) => (
                <span key={s} className="chip text-[11px]">
                  <bdi>{s}</bdi>
                </span>
              ))}
              {plan.evidence.rule_ids.slice(0, 6).map((r) => (
                <span
                  key={r}
                  className="rounded-full bg-cream-warm border border-line px-2.5 py-0.5 text-[10px] font-mono text-ink-muted font-bold"
                >
                  <bdi>{r}</bdi>
                </span>
              ))}
            </div>

            <ul className="mt-3 space-y-1.5 text-xs text-ink-muted list-disc ps-4">
              {plan.evidence.notes.slice(0, 4).map((note, i) => (
                <li key={i}>
                  <bdi>{note}</bdi>
                </li>
              ))}
            </ul>

            {plan.evidence.missing_information.length > 0 && (
              <p className="mt-3 rounded-xl bg-amber-soft border border-amber/30 p-2.5 text-[11px] text-amber-dark font-medium">
                {t('status.missing')}: {plan.evidence.missing_information.join(', ')}
              </p>
            )}

            <p className="mt-3 flex items-start gap-1.5 text-[11px] text-ink-light">
              <FileText size={12} className="mt-0.5 shrink-0" />
              <span>{t('plan.dataProvisional')}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Action Dock */}
      <div className="card p-4 sm:p-5 bg-white border border-line flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2">
          <Link
            to={`/rotations/${plan.plan_id}/confirmation`}
            className="btn-leaf text-sm px-8 py-3 shadow-md"
            state={{ adoptEdits: null }}
          >
            <CheckCircle2 size={16} />
            <span>{t('plan.useThis')}</span>
          </Link>

          <Link
            to={`/rotations/${plan.plan_id}/customize`}
            className="btn-secondary text-sm px-6 py-3"
          >
            <Sliders size={15} className="text-leaf" />
            <span>{t('plan.customize')}</span>
          </Link>
        </div>

        <Link
          to={`/fields/${fieldRoute}/rotations`}
          className="btn-ghost text-xs text-ink-muted hover:text-forest"
        >
          {t('confirm.stay')}
        </Link>
      </div>
    </motion.div>
  )
}
