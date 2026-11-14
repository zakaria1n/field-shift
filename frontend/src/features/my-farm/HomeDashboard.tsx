import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CircleCheck, MapPin, RefreshCcw, Ruler, CalendarClock } from 'lucide-react'

import { api, type DashboardItem } from '../../api/client'
import { CropChip } from '../../app/components/ui'
import { useWizard } from '../../state/wizard'

export default function HomeDashboard() {
  const { t, i18n } = useTranslation()
  const { lang } = useWizard()

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
  })

  if (isLoading) return <p className="text-sm text-ink/60">{t('common.loading')}</p>
  if (error) return <p className="text-sm text-red-600">{t('error.network')}</p>

  if (!data || data.length === 0) {
    return (
      <div className="card mx-auto max-w-md p-8 text-center">
        <p className="text-lg font-bold text-forest">{t('home.noFields')}</p>
        <Link to="/fields/new" className="btn-leaf mt-4">{t('home.startFirst')}</Link>
      </div>
    )
  }

  const farm = data[0]

  return (
    <div className="space-y-5">
      <div>
        <p className="kicker">{t('nav.home')}</p>
        <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest">{t('home.welcome')}</h1>
        <p className="mt-1 text-sm text-ink/70">{t('home.subtitle')}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Field card */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <MapPin size={18} className="text-leaf" />
            <h2 className="text-lg font-bold text-forest"><bdi>{farm.field_name}</bdi></h2>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="chip"><Ruler size={12} /> <bdi>{farm.area_ha.toLocaleString(i18n.language)}</bdi> {t('common.hectare')}</span>
            {farm.profile_summary && <span className="chip">{t(`q.irrigation.${farm.profile_summary.irrigation_type}`)}</span>}
            {farm.last_analysis && (
              <span className="chip"><CalendarClock size={12} /> {t('home.lastAnalysis')}: {farm.last_analysis.finished_at?.slice(0, 10) ?? farm.last_analysis.created_at.slice(0, 10)}</span>
            )}
          </div>

          <dl className="mt-4 space-y-1.5 text-sm text-ink/70">
            {farm.profile_summary && (
              <div className="flex justify-between gap-2">
                <dt className="font-medium">{t('q.purposes.title')}</dt>
                <dd className="text-end">{farm.profile_summary.purposes.map((p) => t(`q.purposes.${p}`)).join(' · ') || '—'}</dd>
              </div>
            )}
            {farm.profile_summary && (
              <div className="flex justify-between gap-2">
                <dt className="font-medium">{t('mixer.title')}</dt>
                <dd className="text-end">
                  {Object.entries(farm.profile_summary.priorities).map(([k, v]) => `${t(`mixer.${k === 'yield' ? 'yield' : k}`)} ${v}%`).join(' · ')}
                </dd>
              </div>
            )}
          </dl>

          <div className="mt-4 flex flex-wrap gap-2">
            <Link to={`/fields/${farm.field_id}/timeline`} className="btn-secondary !py-2 text-xs">{t('home.timeline')}</Link>
            <Link to={`/fields/${farm.field_id}/insights`} className="btn-secondary !py-2 text-xs">{t('home.insights')}</Link>
            <Link to={`/fields/${farm.field_id}/plans`} className="btn-secondary !py-2 text-xs">{t('nav.plan')}</Link>
            <Link to="/fields/new" className="btn-secondary !py-2 text-xs">{t('home.addField')}</Link>
          </div>
        </section>

        {/* Active plan card */}
        <section className="card p-5">
          <div className="flex items-center gap-2">
            <CircleCheck size={18} className="text-leaf" />
            <h2 className="text-lg font-bold text-forest">{t('home.activePlan')}</h2>
          </div>
          {farm.active_plan ? (
            <>
              <p className="mt-1 text-sm font-semibold text-ink">
                <bdi>{lang === 'ar' ? 'الخطة النشطة' : farm.active_plan.label}</bdi>
                {farm.active_plan.adopted_at && (
                  <span className="ms-2 text-xs font-normal text-ink/50">{farm.active_plan.adopted_at.slice(0, 10)}</span>
                )}
              </p>
              <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                {farm.active_plan.slots.map((s, i) => (
                  <div key={s.slot_id} className="flex items-center gap-1.5">
                    {i > 0 && <ArrowRight size={12} className="text-ink/30 rtl:rotate-180" aria-hidden />}
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-[10px] font-bold uppercase text-ink/40">{t('timeline.year', { n: s.year_number })}</span>
                      <CropChip slot={s} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Link to={`/fields/${farm.field_id}/plans`} className="btn-primary !py-2 text-xs">{t('home.viewPlan')}</Link>
                <Link to={`/fields/${farm.field_id}/plans`} className="btn-secondary !py-2 text-xs">{t('home.editPlan')}</Link>
                <button
                  className="btn-secondary !py-2 text-xs"
                  onClick={async () => {
                    await api.post(`/api/v1/fields/${farm.field_id}/analyses`, {})
                    window.location.href = `/fields/${farm.field_id}/plans`
                  }}
                >
                  <RefreshCcw size={13} /> {t('home.reevaluate')}
                </button>
              </div>
            </>
          ) : (
            <p className="mt-2 text-sm text-ink/60">{t('home.noPlan')}</p>
          )}
        </section>
      </div>
    </div>
  )
}
