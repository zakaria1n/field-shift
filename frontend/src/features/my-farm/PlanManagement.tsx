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
  ShieldCheck,
  Satellite
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
  const isArabic = i18n.language === 'ar'

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
      <div className="mx-auto max-w-4xl py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-ink/70">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16">
      {/* Editorial Header (No duplicate AI dark banner!) */}
      <div className="border-b border-line pb-6">
        <Link
          to="/home"
          className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-forest/70 hover:text-forest transition-colors mb-3"
        >
          <ArrowLeft size={13} className="rtl:rotate-180" />
          <span>{t('nav.home')}</span>
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-forest/20 bg-forest/5 px-3 py-0.5 text-xs font-semibold text-forest">
              <Layers size={13} className="text-leaf" />
              <span>{isArabic ? 'معمارية وسجل خطط الدورات' : 'Plan Architecture & Version History'}</span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {t('plans.manage.title')}
            </h1>
            <p className="mt-1 text-sm text-ink/70 max-w-xl">
              {t('plans.manage.subtitle')}
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-ink/60">
            <span className="rounded-lg border border-line bg-cream/70 px-3 py-1.5">
              {versions?.versions.length ?? 0} {versions?.versions.length === 1 ? 'Snapshot' : 'Snapshots'}
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE PLAN SHOWCASE */}
      {plan ? (
        <div className="card overflow-hidden border border-leaf/40 bg-white shadow-sm">
          {/* Header ribbon */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-forest/5 p-4 sm:px-6">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-leaf/15 text-leaf">
                <BadgeCheck size={18} />
              </div>
              <div>
                <h2 className="font-display text-lg font-bold text-forest">
                  <bdi>{isArabic ? t('home.activePlan') : plan.label}</bdi>
                </h2>
                <span className="text-[11px] font-mono text-ink/50">
                  Ref: <bdi>{plan.plan_id.slice(0, 12)}</bdi>
                </span>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-leaf/15 px-3 py-1 text-xs font-bold text-forest">
              <span className="h-2 w-2 rounded-full bg-leaf animate-pulse" />
              {t('plans.manage.active')}
            </span>
          </div>

          <div className="p-5 sm:p-6 space-y-6">
            {/* 3-Year Botanical Crop Strip */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink/40">
                {isArabic ? 'تسلسل الدورة لـ 3 سنوات' : '3-Year Rotation Sequence'}
              </span>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {plan.slots.map((slot) => (
                  <div
                    key={slot.slot_id}
                    className="flex flex-col items-center justify-between rounded-2xl border border-line bg-cream/50 p-4 transition-all hover:border-forest/40 hover:bg-white"
                  >
                    <span className="font-mono text-[10px] font-bold text-ink/40 uppercase self-start">
                      {t('timeline.year', { n: slot.year_number })}
                    </span>
                    <div className="my-1">
                      <CropVisual
                        slot={slot}
                        size="sm"
                        showBadge={false}
                        className="!bg-transparent !border-0 !shadow-none"
                      />
                    </div>
                    {slot.rotation_group && (
                      <span className="text-[10px] font-mono text-ink/45 capitalize truncate max-w-full">
                        {slot.rotation_group}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agronomic Performance Indicators */}
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-ink/40">
                {isArabic ? 'نقاط التقييم الزراعي' : 'Agronomic Evaluation Score'}
              </span>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {plan.score.indicators.map((ind) => (
                  <IndicatorRow
                    key={ind.key}
                    label={isArabic ? ind.label_ar : ind.label_en}
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
                <Satellite size={14} className="text-sky-700" />
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
        <div className="card border-dashed border-forest/20 p-8 text-center space-y-3">
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

      {/* PLAN VERSION ARCHIVE */}
      <div className="card border border-line bg-white p-5 sm:p-6 shadow-sm">
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
          <span>Scientific Governance</span>
        </div>
        <p className="mt-1 leading-relaxed text-ink/60">
          {t('disclaimer.yield')} · {t('disclaimer.soil')}
        </p>
      </div>
    </div>
  )
}
