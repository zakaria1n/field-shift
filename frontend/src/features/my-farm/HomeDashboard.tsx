import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CircleCheck,
  MapPin,
  Calendar,
  Satellite,
  Compass,
  Sparkles,
  Layers,
  ChevronRight,
  Plus,
  Droplets,
  Sprout,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type DashboardItem, type FieldOut } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { FieldPolygonThumbnail } from '../../app/components/FieldPolygonThumbnail'
import { IndicatorRow } from '../../app/components/ui'

export default function HomeDashboard() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const { data: dashboard, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
  })

  const firstFarm = dashboard?.[0]

  // Fetch full field details including polygon geometry for vector boundary thumbnail
  const { data: fieldDetail } = useQuery({
    queryKey: ['field-detail', firstFarm?.field_id],
    queryFn: () => api.get<FieldOut>(`/api/v1/fields/${firstFarm?.field_id}`),
    enabled: Boolean(firstFarm?.field_id),
  })

  if (isLoading) {
    return (
      <div className="py-20 text-center max-w-md mx-auto space-y-3">
        <div className="h-8 w-8 mx-auto rounded-full border-2 border-forest border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-forest">{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center max-w-md mx-auto space-y-3">
        <p className="text-sm font-bold text-red-600">{t('error.network')}</p>
      </div>
    )
  }

  if (!dashboard || dashboard.length === 0) {
    return (
      <div className="mx-auto max-w-md py-16 text-center space-y-4">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-forest/5 border border-forest/15 flex items-center justify-center text-forest shadow-sm">
          <MapPin size={28} />
        </div>
        <h2 className="text-2xl font-extrabold text-forest">{t('home.noFields')}</h2>
        <p className="text-sm text-ink/70 leading-relaxed max-w-sm mx-auto">
          {isArabic
            ? 'ابدأ برسم حدود حقلك الزراعي لتحليل بيانات الأقمار الصناعية واقتراح دورات زراعية ملائمة.'
            : 'Select and draw your field boundary on the satellite map to generate scientific crop rotation plans.'}
        </p>
        <Link to="/fields/new" className="btn-primary inline-flex items-center gap-2 px-6 py-3">
          <Plus size={16} />
          <span>{t('home.startFirst')}</span>
        </Link>
      </div>
    )
  }

  const farm = dashboard[0]
  const activePlan = farm.active_plan

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="space-y-8 pb-16"
    >
      {/* Editorial Farm Header (Clean, authentic, uncluttered) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-forest/20 bg-forest/5 px-2.5 py-0.5 text-[11px] font-bold text-forest">
              <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
              {t('nav.home')}
            </span>
            <span className="text-ink/30">·</span>
            <span className="inline-flex items-center gap-1 text-[11px] font-mono text-ink/60">
              <Satellite size={12} className="text-sky-700" />
              <span>NASA POWER & SoilGrids Synced</span>
            </span>
          </div>

          <h1 className="mt-1.5 font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            {t('home.welcome')}
          </h1>
          <p className="mt-0.5 text-xs sm:text-sm text-ink/60">
            {t('home.subtitle')}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Link
            to="/fields/new"
            className="btn-secondary !py-2 !px-3.5 text-xs font-bold inline-flex items-center gap-1.5"
          >
            <Plus size={14} />
            <span>{t('home.addField')}</span>
          </Link>
        </div>
      </div>

      {/* HERO SECTION: ACTIVE CROP ROTATION SUCCESSION (The Star of the Experience) */}
      {activePlan ? (
        <section className="card overflow-hidden border border-leaf/40 bg-white shadow-sm hover:shadow-md transition-shadow">
          {/* Card Top Strip */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-forest/5 px-5 py-3.5 sm:px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-leaf/20 text-leaf">
                <CircleCheck size={16} />
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50">
                  {t('home.activePlan')}
                </span>
                <h2 className="font-display text-base font-bold text-forest">
                  <bdi>{isArabic ? t('home.activePlan') : activePlan.label}</bdi>
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-leaf/30 bg-leaf/15 px-3 py-1 text-xs font-bold text-forest">
                <span className="h-1.5 w-1.5 rounded-full bg-leaf animate-pulse" />
                {t('plans.manage.active')}
              </span>
            </div>
          </div>

          <div className="p-5 sm:p-7 space-y-6">
            {/* 3-Year Connected Succession Strip with Prominent Botanical Visuals */}
            <div>
              <div className="flex items-center justify-between text-xs mb-3">
                <span className="font-bold text-forest uppercase tracking-wider text-[11px]">
                  {isArabic ? 'تسلسل الدورة الزراعية المعتمدة (3 مواسم)' : 'Active 3-Year Crop Succession Cycle'}
                </span>
                <span className="font-mono text-ink/50 text-[11px]">
                  {activePlan.slots.length} Years Planned
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                {activePlan.slots.map((slot, index) => (
                  <div
                    key={slot.slot_id}
                    className="relative flex flex-col items-center justify-between rounded-2xl border border-line/80 bg-cream-warm/50 p-4 transition-all hover:border-forest/40 hover:bg-white hover:shadow-sm"
                  >
                    <div className="w-full flex items-center justify-between text-[11px] mb-2 font-mono">
                      <span className="rounded-md bg-forest/10 px-2 py-0.5 font-bold text-forest">
                        {t('timeline.year', { n: slot.year_number })}
                      </span>
                      {slot.rotation_group && (
                        <span className="text-ink/50 uppercase text-[9px] font-semibold truncate max-w-[120px]">
                          {slot.rotation_group.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Generous Botanical Crop Artwork */}
                    <div className="my-1">
                      <CropVisual
                        slot={slot}
                        size="md"
                        showBadge={true}
                        showFamily={true}
                        className="!bg-transparent !border-0 !shadow-none"
                      />
                    </div>

                    {/* Connector Arrow for Next Year */}
                    {index < activePlan.slots.length - 1 && (
                      <div className="hidden sm:flex absolute -end-2.5 top-1/2 -translate-y-1/2 z-10 h-5 w-5 items-center justify-center rounded-full bg-white border border-line shadow-2xs text-forest" aria-hidden>
                        <ArrowRight size={10} className="rtl:rotate-180" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Agronomic Performance Score Meters */}
            <div className="border-t border-line/70 pt-5">
              <span className="font-bold text-forest uppercase tracking-wider text-[11px] block mb-3">
                {isArabic ? 'تقييم الأداء الزراعي والمناخي' : 'Agronomic Performance Breakdown'}
              </span>
              <div className="grid gap-3 sm:grid-cols-2">
                {activePlan.score.indicators.map((ind) => (
                  <IndicatorRow
                    key={ind.key}
                    label={isArabic ? ind.label_ar : ind.label_en}
                    value={ind.value}
                    status={ind.status}
                  />
                ))}
              </div>
            </div>

            {/* Operational Action Shortcuts */}
            <div className="flex flex-wrap items-center gap-3 border-t border-line/70 pt-5">
              <Link
                to={`/fields/${farm.field_id}/timeline`}
                className="btn-primary !py-2.5 text-xs inline-flex items-center gap-1.5 shadow-sm"
              >
                <Calendar size={14} />
                <span>{t('timeline.title')} ({t('home.updateActivities')})</span>
                <ChevronRight size={13} className="rtl:rotate-180" />
              </Link>
              <Link
                to={`/fields/${farm.field_id}/insights`}
                className="btn-secondary !py-2.5 text-xs inline-flex items-center gap-1.5"
              >
                <Satellite size={14} className="text-sky-700" />
                <span>{t('insights.title')}</span>
              </Link>
              <Link
                to={`/fields/${farm.field_id}/plans`}
                className="btn-secondary !py-2.5 text-xs ms-auto inline-flex items-center gap-1.5"
              >
                <Layers size={14} />
                <span>{t('plans.manage.title')}</span>
              </Link>
            </div>
          </div>
        </section>
      ) : (
        <div className="card p-8 border-dashed border-forest/20 text-center space-y-3">
          <p className="text-sm font-semibold text-ink/70">{t('home.noPlan')}</p>
          <Link to={`/fields/${farm.field_id}/rotations`} className="btn-primary inline-flex items-center gap-2">
            <Sparkles size={15} />
            <span>{t('plans.viewDetails')}</span>
          </Link>
        </div>
      )}

      {/* PARCEL PROFILE & CADASTRE OVERVIEW (Vector Geometry, Not Stock Photos) */}
      <section className="grid gap-6 md:grid-cols-12">
        {/* Real Field Boundary Vector Card */}
        <div className="md:col-span-5 card border border-line bg-white p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <MapPin size={16} className="text-leaf" />
                <h3 className="font-display text-base font-bold text-forest">
                  <bdi>{farm.field_name}</bdi>
                </h3>
              </div>
              <span className="font-mono text-xs font-bold text-forest">
                <bdi>{farm.area_ha.toLocaleString(i18n.language, { maximumFractionDigits: 2 })}</bdi>{' '}
                {t('common.hectare')}
              </span>
            </div>

            {/* Real Cadastral Vector Polygon Thumbnail */}
            <div className="h-44 w-full">
              <FieldPolygonThumbnail
                geometry={fieldDetail?.geometry_geojson}
                className="w-full h-full"
              />
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] font-mono text-ink/60">
              {fieldDetail && (
                <span>
                  {t('home.centroid')}: <bdi>{fieldDetail.centroid_lat.toFixed(4)}°N, {fieldDetail.centroid_lon.toFixed(4)}°E</bdi>
                </span>
              )}
              <span className="rounded bg-cream px-2 py-0.5">
                ID: {farm.field_id.slice(0, 8)}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-line/60 flex items-center justify-between">
            <Link
              to="/fields/list"
              className="text-xs font-bold text-forest hover:text-leaf transition-colors inline-flex items-center gap-1"
            >
              <span>{t('home.viewAllParcels', { count: dashboard.length })}</span>
              <ArrowRight size={12} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>

        {/* Diagnostic Profile & Soil Context */}
        <div className="md:col-span-7 card border border-line bg-white p-5 shadow-sm flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between border-b border-line/60 pb-3">
              <h3 className="font-display text-base font-bold text-forest">
                {t('home.diagnosedBaseline')}
              </h3>
              <span className="text-[11px] text-ink/50 font-mono">
                {farm.last_analysis?.status === 'complete' ? t('home.analysisComplete') : t('home.pending')}
              </span>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-line/70 bg-cream/50 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 flex items-center gap-1">
                  <Droplets size={12} className="text-sky-700" />
                  {t('home.waterRegime')}
                </span>
                <p className="font-display text-sm font-bold text-forest capitalize">
                  {farm.profile_summary?.irrigation_type === 'rainfed'
                    ? t('home.rainfed')
                    : farm.profile_summary?.irrigation_type === 'irrigated'
                      ? t('home.irrigated')
                      : farm.profile_summary?.irrigation_type === 'mixed'
                        ? t('home.mixed')
                        : farm.profile_summary?.irrigation_type?.replace('_', ' ') || t('home.rainfed')}
                </p>
                <p className="text-[11px] text-ink/50">
                  {t('home.waterRegimeNote')}
                </p>
              </div>

              <div className="rounded-xl border border-line/70 bg-cream/50 p-3.5 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-ink/50 flex items-center gap-1">
                  <Sprout size={12} className="text-leaf" />
                  {t('home.productionGoals')}
                </span>
                <div className="flex flex-wrap gap-1 pt-0.5">
                  {(farm.profile_summary?.purposes ?? []).length > 0 ? (
                    farm.profile_summary?.purposes.map((p) => (
                      <span key={p} className="rounded bg-forest/5 px-1.5 py-0.5 text-[10px] font-semibold text-forest">
                        {t(`q.purposes.${p}`)}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-ink/50">{t('home.commercialGeneral')}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Strategic Priorities Summary */}
            {farm.profile_summary?.priorities && (
              <div className="mt-4 space-y-2">
                <div className="flex justify-between text-xs font-semibold text-ink/70">
                  <span>{t('home.priorityWeights')}</span>
                  <span className="font-mono text-[11px]">{t('home.allocated100')}</span>
                </div>
                <div className="flex h-2 w-full overflow-hidden rounded-full border border-line bg-cream">
                  <div style={{ width: `${farm.profile_summary.priorities.water || 25}%` }} className="bg-sky" title="Water" />
                  <div style={{ width: `${farm.profile_summary.priorities.soil || 25}%` }} className="bg-leaf" title="Soil" />
                  <div style={{ width: `${farm.profile_summary.priorities.yield || 25}%` }} className="bg-amber" title="Yield" />
                  <div style={{ width: `${farm.profile_summary.priorities.risk || 25}%` }} className="bg-forest" title="Risk" />
                </div>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-line/60 flex items-center justify-between text-xs">
            <span className="text-ink/60 flex items-center gap-1">
              <ShieldCheck size={13} className="text-leaf" />
              {t('home.privateSession')}
            </span>
            <Link to="/settings" className="font-bold text-forest hover:text-leaf inline-flex items-center gap-1">
              <span>{t('home.preferences')}</span>
              <ArrowRight size={12} className="rtl:rotate-180" />
            </Link>
          </div>
        </div>
      </section>
    </motion.div>
  )
}
