import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  ArrowRight,
  CircleCheck,
  MapPin,
  RefreshCcw,
  Ruler,
  CalendarClock,
  Sparkles,
  Layers,
  Satellite,
  Compass,
  Calendar,
  BarChart2,
  Sliders,
  Plus,
} from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type DashboardItem } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { useWizard } from '../../state/wizard'

export default function HomeDashboard() {
  const { t, i18n } = useTranslation()
  const { lang } = useWizard()
  const isArabic = i18n.language === 'ar'

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
  })

  if (isLoading) {
    return (
      <div className="card p-12 text-center max-w-xl mx-auto space-y-3">
        <div className="h-10 w-10 mx-auto rounded-full border-2 border-leaf border-t-transparent animate-spin" />
        <p className="text-sm font-bold text-forest">{t('common.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card p-8 text-center max-w-xl mx-auto space-y-3">
        <p className="text-sm font-bold text-red-600">{t('error.network')}</p>
      </div>
    )
  }

  if (!data || data.length === 0) {
    return (
      <div className="card-elevated mx-auto max-w-md p-10 text-center bg-white border border-line shadow-lg space-y-4">
        <div className="h-14 w-14 mx-auto rounded-2xl bg-leaf-soft flex items-center justify-center text-leaf shadow-sm">
          <MapPin size={28} />
        </div>
        <h2 className="text-xl font-extrabold text-forest">{t('home.noFields')}</h2>
        <p className="text-xs text-ink-muted leading-relaxed">
          {isArabic
            ? 'ابدأ برسم حدود حقلك الزراعي لتحليل بيانات الأقمار الصناعية واقتراح دورات زراعية ملائمة.'
            : 'Select and draw your field boundary on the satellite map to generate scientific crop rotation plans.'}
        </p>
        <Link to="/fields/new" className="btn-leaf inline-flex items-center gap-2 px-6 py-3">
          <Plus size={16} />
          <span>{t('home.startFirst')}</span>
        </Link>
      </div>
    )
  }

  const farm = data[0]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Dashboard Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <p className="kicker">{t('nav.home')}</p>
            <span className="badge-glow text-[10px] font-mono flex items-center gap-1">
              <Satellite size={11} className="text-leaf" /> Earth Observation Synced
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            {t('home.welcome')}
          </h1>
          <p className="mt-0.5 text-sm text-ink-muted">{t('home.subtitle')}</p>
        </div>

        <div className="flex items-center gap-2.5">
          <Link
            to="/fields/new"
            className="btn-secondary !py-2 !px-4 text-xs font-bold flex items-center gap-1.5"
          >
            <Plus size={14} className="text-leaf" />
            <span>{t('home.addField')}</span>
          </Link>
        </div>
      </div>

      {/* Main Command Grid */}
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Field Card (7 Cols) */}
        <div className="lg:col-span-7 card-elevated overflow-hidden bg-white border border-line shadow-card-hover">
          {/* Subtle Aerial Banner */}
          <div className="relative h-28 overflow-hidden bg-forest-dark">
            <img
              src="/assets/hero_earth_fields.jpg"
              alt=""
              className="w-full h-full object-cover opacity-60"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-white via-white/40 to-transparent" />
            <div className="absolute bottom-3 start-5 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-white shadow-md">
                <MapPin size={18} />
              </span>
              <div>
                <h2 className="text-lg font-extrabold text-forest">
                  <bdi>{farm.field_name}</bdi>
                </h2>
                <span className="chip text-[10px] py-0.5 px-2 bg-white/90 font-mono">
                  <Ruler size={11} /> <bdi>{farm.area_ha.toLocaleString(i18n.language)}</bdi> {t('common.hectare')}
                </span>
              </div>
            </div>
          </div>

          <div className="p-5 sm:p-6 space-y-4">
            {/* Metadata Pills */}
            <div className="flex flex-wrap gap-2 text-xs">
              {farm.profile_summary && (
                <span className="chip font-semibold text-forest bg-cream-warm">
                  {t(`q.irrigation.${farm.profile_summary.irrigation_type}`)}
                </span>
              )}
              {farm.last_analysis && (
                <span className="chip font-mono text-ink-muted">
                  <CalendarClock size={12} className="text-leaf" />
                  <span>{t('home.lastAnalysis')}: {farm.last_analysis.finished_at?.slice(0, 10) ?? farm.last_analysis.created_at.slice(0, 10)}</span>
                </span>
              )}
            </div>

            {/* Profile summary details */}
            <dl className="space-y-2.5 text-xs border-t border-line/70 pt-3">
              {farm.profile_summary && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-bold text-ink-light font-mono uppercase text-[10px]">
                    {t('q.purposes.title')}
                  </dt>
                  <dd className="font-semibold text-forest text-end">
                    {farm.profile_summary.purposes.map((p) => t(`q.purposes.${p}`)).join(' · ') || '—'}
                  </dd>
                </div>
              )}
              {farm.profile_summary && (
                <div className="flex items-center justify-between gap-2">
                  <dt className="font-bold text-ink-light font-mono uppercase text-[10px]">
                    {t('mixer.title')}
                  </dt>
                  <dd className="font-mono font-bold text-forest text-end text-[11px]">
                    {Object.entries(farm.profile_summary.priorities)
                      .map(([k, v]) => `${t(`mixer.${k === 'yield' ? 'yield' : k}`)} ${v}%`)
                      .join(' · ')}
                  </dd>
                </div>
              )}
            </dl>

            {/* Field Actions */}
            <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-line/70">
              <Link to={`/fields/${farm.field_id}/timeline`} className="btn-secondary !py-2 text-xs flex items-center gap-1.5">
                <Calendar size={13} className="text-leaf" />
                <span>{t('home.timeline')}</span>
              </Link>
              <Link to={`/fields/${farm.field_id}/insights`} className="btn-secondary !py-2 text-xs flex items-center gap-1.5">
                <BarChart2 size={13} className="text-leaf" />
                <span>{t('home.insights')}</span>
              </Link>
              <Link to={`/fields/${farm.field_id}/plans`} className="btn-secondary !py-2 text-xs flex items-center gap-1.5">
                <Compass size={13} className="text-leaf" />
                <span>{t('nav.plan')}</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Active Plan Card (5 Cols) */}
        <div className="lg:col-span-5 card-elevated p-5 sm:p-6 bg-white border border-line shadow-card-hover space-y-4">
          <div className="flex items-center justify-between border-b border-line pb-3">
            <div className="flex items-center gap-2">
              <CircleCheck size={18} className="text-leaf" />
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-forest font-mono">
                {t('home.activePlan')}
              </h2>
            </div>
            {farm.active_plan && (
              <span className="badge-glow text-[10px] font-mono">Adopted</span>
            )}
          </div>

          {farm.active_plan ? (
            <>
              <div>
                <p className="text-base font-extrabold text-forest">
                  <bdi>{lang === 'ar' ? 'الخطة النشطة المعتمدة' : farm.active_plan.label}</bdi>
                </p>
                {farm.active_plan.adopted_at && (
                  <p className="text-[11px] font-mono text-ink-light mt-0.5">
                    Adopted: {farm.active_plan.adopted_at.slice(0, 10)}
                  </p>
                )}
              </div>

              {/* 3-Year Visual Sequence */}
              <div className="grid grid-cols-3 gap-2 bg-cream/50 p-3 rounded-2xl border border-line/70">
                {farm.active_plan.slots.map((s) => (
                  <div key={s.slot_id} className="flex flex-col items-center">
                    <span className="text-[9px] font-mono uppercase text-ink-light font-bold mb-1">
                      {t('timeline.year', { n: s.year_number })}
                    </span>
                    <CropVisual slot={s} size="xs" showFamily className="w-full bg-white shadow-xs" />
                  </div>
                ))}
              </div>

              {/* Plan Actions */}
              <div className="flex flex-wrap items-center gap-2 pt-2">
                <Link to={`/fields/${farm.field_id}/plans`} className="btn-leaf !py-2 text-xs flex items-center gap-1.5 flex-1 justify-center">
                  <span>{t('home.viewPlan')}</span>
                  <ArrowRight size={13} className="rtl:rotate-180" />
                </Link>
                <Link to={`/fields/${farm.field_id}/plans`} className="btn-secondary !py-2 text-xs">
                  {t('home.editPlan')}
                </Link>
                <button
                  type="button"
                  className="btn-secondary !py-2 text-xs flex items-center gap-1"
                  onClick={async () => {
                    await api.post(`/api/v1/fields/${farm.field_id}/analyses`, {})
                    window.location.href = `/fields/${farm.field_id}/plans`
                  }}
                >
                  <RefreshCcw size={12} className="text-leaf" />
                  <span>{t('home.reevaluate')}</span>
                </button>
              </div>
            </>
          ) : (
            <div className="py-6 text-center space-y-3 bg-cream rounded-2xl p-4">
              <p className="text-xs text-ink-muted">{t('home.noPlan')}</p>
              <Link to={`/fields/${farm.field_id}/rotations`} className="btn-leaf text-xs !py-2 px-5">
                Explore Rotation Plans
              </Link>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  )
}
