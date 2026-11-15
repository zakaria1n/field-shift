import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowLeft,
  BadgeCheck,
  History,
  Sparkles,
  Layers,
  Calendar,
  SlidersHorizontal,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'

import { api, type AdoptedPlan } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { IndicatorRow } from '../../app/components/ui'

interface VersionRow {
  plan_id: string
  version_id: string
  status: string
  label: string | null
  base_version_id: string | null
  total: number | null
  created_at: string
  is_active: boolean
}

export default function PlanManagement() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()

  const { data: plan, isLoading: planLoading } = useQuery({
    queryKey: ['active-plan', fieldId],
    queryFn: () => api.get<AdoptedPlan | null>(`/api/v1/fields/${fieldId}/active-plan`),
  })

  const { data: versions } = useQuery({
    queryKey: ['plan-versions', fieldId],
    queryFn: () => api.get<{ versions: VersionRow[] }>(`/api/v1/fields/${fieldId}/plan-versions`),
  })

  if (planLoading) {
    return (
      <div className="mx-auto max-w-4xl py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-ink/70">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-12">
      {/* Navigation Breadcrumb */}
      <div>
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest hover:text-leaf transition-colors"
        >
          <ArrowLeft size={14} className="rtl:rotate-180" />
          <span>{t('nav.home')}</span>
        </Link>
      </div>

      {/* Editorial Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest via-forest to-forest-surface p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-16 -end-16 h-48 w-48 rounded-full bg-leaf/20 blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-leaf/40 bg-leaf/15 px-3 py-1 text-xs font-semibold text-mint backdrop-blur-md">
            <Layers size={13} className="text-leaf" />
            <span>{i18n.language === 'ar' ? 'معمارية وسجل خطط الدورات' : t('plans.manage.title')}</span>
          </div>
          <h1 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
            {t('plans.manage.title')}
          </h1>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
            {t('plans.manage.subtitle')}
          </p>
        </div>
      </div>

      {/* ACTIVE PLAN HERO CARD */}
      {plan ? (
        <div className="card overflow-hidden border border-leaf/40 bg-white shadow-md">
          {/* Header ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-forest/5 p-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf/15 text-leaf">
                <BadgeCheck size={18} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-forest">
                  <bdi>{i18n.language === 'ar' ? t('home.activePlan') : plan.label}</bdi>
                </h2>
                <span className="text-[11px] font-mono text-ink/50">
                  Ref: <bdi>{plan.plan_id.slice(0, 12)}</bdi>
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-leaf/15 px-3 py-1 text-xs font-bold text-forest shadow-2xs">
              <span className="h-2 w-2 rounded-full bg-leaf animate-pulse" />
              {t('plans.manage.active')}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* 3-Year Botanical Crop Strip */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink/40">
                {i18n.language === 'ar' ? 'تسلسل الدورة لـ 3 سنوات' : '3-Year Rotation Sequence'}
              </span>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {plan.slots.map((slot, index) => (
                  <div
                    key={slot.slot_id}
                    className="group relative flex items-center gap-3 rounded-2xl border border-line bg-cream/50 p-3 hover:border-forest/40 hover:bg-white transition-all shadow-2xs"
                  >
                    <div className="shrink-0">
                      <CropVisual
                        slot={slot}
                        size="sm"
                        showBadge={false}
                        className="rounded-xl border border-line"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-[10px] font-bold text-ink/40 uppercase">
                        {t('timeline.year', { n: slot.year_number })}
                      </span>
                      <h4 className="truncate font-display text-sm font-bold text-forest">
                        {i18n.language === 'ar' ? (slot.name_ar ?? slot.crop_id) : (slot.name_en ?? slot.crop_id)}
                      </h4>
                      {slot.crop_id && (
                        <p className="truncate font-mono text-[10px] text-ink/40">
                          <bdi>{slot.crop_id}</bdi>
                        </p>
                      )}
                    </div>
                    {index < plan.slots.length - 1 && (
                      <span className="hidden sm:inline-block text-ink/20 absolute -end-2 text-xs font-bold" aria-hidden>
                        →
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agronomic Performance Indicators */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink/40">
                {i18n.language === 'ar' ? 'نقاط التقييم الزراعي' : 'Agronomic Evaluation Score'}
              </span>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {plan.score.indicators.map((ind) => (
                  <IndicatorRow
                    key={ind.key}
                    label={i18n.language === 'ar' ? ind.label_ar : ind.label_en}
                    value={ind.value}
                    status={ind.status}
                  />
                ))}
              </div>
            </div>

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center gap-3 border-t border-line/60 pt-4">
              <Link
                to={`/fields/${fieldId}/rotations`}
                className="btn-primary !py-2.5 text-xs inline-flex items-center gap-1.5"
              >
                <Sparkles size={14} />
                <span>{t('plans.viewDetails')}</span>
              </Link>
              <Link
                to={`/rotations/${plan.plan_id}/customize`}
                className="btn-secondary !py-2.5 text-xs inline-flex items-center gap-1.5"
              >
                <SlidersHorizontal size={14} />
                <span>{t('plan.customize')}</span>
              </Link>
              <Link
                to={`/fields/${fieldId}/insights`}
                className="btn-secondary !py-2.5 text-xs inline-flex items-center gap-1.5"
              >
                <Layers size={14} />
                <span>{t('home.reevaluate')}</span>
              </Link>
              <Link
                to={`/fields/${fieldId}/timeline`}
                className="btn-secondary !py-2.5 text-xs ms-auto inline-flex items-center gap-1.5"
              >
                <Calendar size={14} />
                <span>{t('timeline.title')}</span>
                <ChevronRight size={13} className="rtl:rotate-180" />
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <div className="card border-dashed border-forest/20 p-8 text-center">
          <p className="text-sm font-medium text-ink/70">{t('home.noPlan')}</p>
          <Link
            to={fieldId ? `/fields/${fieldId}/rotations` : '/fields/new'}
            className="btn-primary mt-4 inline-flex items-center gap-2"
          >
            <Sparkles size={16} />
            <span>{t('plans.viewDetails')}</span>
          </Link>
        </div>
      )}

      {/* PLAN VERSION HISTORY */}
      <div className="card border border-line bg-white/95 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center justify-between border-b border-line/60 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-forest/5 text-forest">
              <History size={15} />
            </div>
            <h2 className="font-display text-base font-bold text-forest">
              {t('plans.manage.archived')}
            </h2>
          </div>
          <span className="font-mono text-xs text-ink/40">
            {versions?.versions.length ?? 0} versions recorded
          </span>
        </div>

        <ul className="mt-4 space-y-2.5">
          {(versions?.versions ?? []).map((v) => (
            <li
              key={v.version_id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3.5 transition-colors ${
                v.is_active
                  ? 'border-leaf/40 bg-leaf/5'
                  : 'border-line/70 bg-cream/40 hover:bg-cream/70'
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                    v.is_active
                      ? 'bg-leaf/20 text-forest'
                      : 'bg-line text-ink/60'
                  }`}
                >
                  {v.is_active ? t('plans.manage.active') : t('plans.manage.archived')}
                </span>
                <div>
                  <h4 className="font-bold text-forest text-sm">
                    <bdi>{v.label ?? v.version_id.slice(0, 14)}</bdi>
                  </h4>
                  {v.base_version_id && (
                    <span className="font-mono text-[10px] text-ink/45">
                      Derived from {v.base_version_id.slice(0, 8)}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs">
                {v.total !== null && (
                  <span className="font-mono font-semibold text-forest">
                    {t('mixer.total')}: <bdi>{v.total.toFixed(0)}</bdi>/100
                  </span>
                )}
                <span className="font-mono text-[11px] text-ink/40">
                  {v.created_at.slice(0, 10)}
                </span>
              </div>
            </li>
          ))}

          {(versions?.versions.length ?? 0) === 0 && (
            <li className="py-4 text-center text-xs text-ink/50">
              No previous version snapshots saved.
            </li>
          )}
        </ul>
      </div>

      {/* Honest Scientific Disclaimer */}
      <div className="rounded-2xl border border-line bg-cream/60 p-4 text-xs text-ink/70">
        <div className="flex items-center gap-2 font-bold text-forest">
          <ShieldCheck size={16} className="text-leaf" />
          <span>{t('disclaimer.anon')}</span>
        </div>
        <p className="mt-1 leading-relaxed text-ink/60">
          {t('disclaimer.yield')} · {t('disclaimer.soil')}
        </p>
      </div>
    </div>
  )
}
