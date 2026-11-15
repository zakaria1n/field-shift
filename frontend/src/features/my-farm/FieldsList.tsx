import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  MapPin,
  Plus,
  Calendar,
  Layers,
  ChevronRight,
  Sparkles,
  Droplets,
  ShieldCheck
} from 'lucide-react'

import { api, type DashboardItem } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'

export default function FieldsList() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
  })

  const fields = data ?? []
  const totalHectares = fields.reduce((acc, f) => acc + (f.area_ha || 0), 0)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl py-12 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-ink/70">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-12">
      {/* Editorial Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-forest via-forest to-forest-surface p-6 sm:p-8 text-white shadow-xl">
        <div className="absolute -top-16 -end-16 h-48 w-48 rounded-full bg-leaf/20 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-leaf/40 bg-leaf/15 px-3 py-1 text-xs font-semibold text-mint backdrop-blur-md">
              <MapPin size={13} className="text-leaf" />
              <span>{i18n.language === 'ar' ? 'سجل القطع الفلاحية' : 'Agricultural Parcels Hub'}</span>
            </div>
            <h1 className="mt-3 font-display text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white">
              {t('nav.fields')}
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-white/80">
              {i18n.language === 'ar'
                ? 'إدارة حدود حقولك، والجداول الزمنية للدورة الزراعية، ومؤشرات رصد الأرض.'
                : 'Manage your agricultural boundaries, seasonal timelines, and Earth observation telemetry.'}
            </p>

            <div className="mt-4 flex items-center gap-4 text-xs text-white/70">
              <span className="font-semibold text-white">
                <bdi>{fields.length}</bdi> {i18n.language === 'ar' ? 'حقول' : (fields.length === 1 ? 'Field' : 'Fields')}
              </span>
              <span className="text-white/30">·</span>
              <span>
                {i18n.language === 'ar' ? 'المساحة الإجمالية:' : 'Total Area:'}{' '}
                <strong className="text-leaf font-mono">
                  <bdi>{totalHectares.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}</bdi>
                </strong>{' '}
                {t('common.hectare')}
              </span>
            </div>
          </div>

          <Link
            to="/fields/new"
            className="btn-primary shrink-0 self-start sm:self-center inline-flex items-center gap-2 shadow-lg hover:shadow-xl"
          >
            <Plus size={16} />
            <span>{t('home.addField')}</span>
          </Link>
        </div>
      </div>

      {/* Fields Grid */}
      {fields.length === 0 ? (
        <div className="card border-dashed border-forest/20 p-12 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/5 text-forest">
            <MapPin size={28} />
          </div>
          <h2 className="mt-4 text-xl font-bold text-forest">No Registered Fields Yet</h2>
          <p className="mt-2 text-sm text-ink/70 max-w-md mx-auto">
            Draw or select your field boundary to begin analyzing satellite climatology and SoilGrids data.
          </p>
          <Link to="/fields/new" className="btn-primary mt-6 inline-flex items-center gap-2">
            <Plus size={16} />
            <span>{t('home.addField')}</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {fields.map((field) => {
            const hasPlan = Boolean(field.active_plan)
            return (
              <div
                key={field.field_id}
                className="card overflow-hidden border border-line bg-white/95 p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-leaf/10 border border-leaf/20 text-leaf">
                        <MapPin size={20} />
                      </div>
                      <div>
                        <h3 className="font-display text-lg font-bold text-forest">
                          <bdi>{field.field_name}</bdi>
                        </h3>
                        <p className="text-xs text-ink/60 font-mono">
                          <bdi>{field.area_ha.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}</bdi>{' '}
                          {t('common.hectare')} · ID: {field.field_id.slice(0, 8)}
                        </p>
                      </div>
                    </div>

                    {hasPlan ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-leaf/30 bg-leaf/10 px-2.5 py-0.5 text-[11px] font-bold text-forest">
                        <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                        {t('plans.manage.active')}
                      </span>
                    ) : (
                      <span className="rounded-full border border-amber/30 bg-amber/10 px-2.5 py-0.5 text-[11px] font-bold text-amber-800">
                        No active plan
                      </span>
                    )}
                  </div>

                  {/* Active Rotation Visual Preview */}
                  {field.active_plan ? (
                    <div className="mt-5 rounded-2xl border border-line/70 bg-cream/50 p-3.5 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-forest">
                          <bdi>{field.active_plan.label}</bdi>
                        </span>
                        <span className="font-mono text-[10px] text-ink/40">
                          {field.active_plan.slots.length}-Year Cycle
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1 flex-wrap">
                        {field.active_plan.slots.map((s, i) => (
                          <div key={s.slot_id} className="flex items-center gap-2">
                            {i > 0 && <span className="text-ink/30 text-xs font-bold" aria-hidden>→</span>}
                            <CropVisual slot={s} size="xs" showBadge={false} />
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="mt-5 rounded-2xl border border-dashed border-line bg-cream/30 p-4 text-center">
                      <p className="text-xs text-ink/60">No crop rotation plan adopted yet.</p>
                      <Link
                        to={`/fields/${field.field_id}/rotations`}
                        className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-forest hover:text-leaf"
                      >
                        <Sparkles size={12} />
                        <span>Explore recommended rotations</span>
                      </Link>
                    </div>
                  )}

                  {/* Profile Specs */}
                  {field.profile_summary && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-ink/60">
                      <span className="inline-flex items-center gap-1 rounded-md bg-forest/5 px-2 py-0.5">
                        <Droplets size={12} className="text-sky" />
                        <span className="font-medium capitalize">{field.profile_summary.irrigation_type.replace('_', ' ')}</span>
                      </span>
                      {field.profile_summary.purposes.slice(0, 2).map((p) => (
                        <span key={p} className="rounded-md bg-forest/5 px-2 py-0.5 font-medium">
                          {t(`q.purposes.${p}`)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Action Links */}
                <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                  <Link
                    to={`/fields/${field.field_id}/plans`}
                    className="btn-secondary !py-2 text-xs inline-flex items-center gap-1"
                  >
                    <span>{t('plans.manage.title')}</span>
                  </Link>
                  <Link
                    to={`/fields/${field.field_id}/timeline`}
                    className="btn-secondary !py-2 text-xs inline-flex items-center gap-1"
                  >
                    <Calendar size={13} />
                    <span>{t('timeline.title')}</span>
                  </Link>
                  <Link
                    to={`/fields/${field.field_id}/insights`}
                    className="btn-secondary !py-2 text-xs ms-auto inline-flex items-center gap-1"
                  >
                    <Layers size={13} />
                    <span>{t('insights.title')}</span>
                    <ChevronRight size={13} className="rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Honest Provenance Note */}
      <div className="rounded-2xl border border-line bg-cream/60 p-4 text-xs text-ink/70">
        <div className="flex items-center gap-2 font-bold text-forest">
          <ShieldCheck size={16} className="text-leaf" />
          <span>{t('disclaimer.anon')}</span>
        </div>
        <p className="mt-1 leading-relaxed text-ink/60">
          {t('disclaimer.soil')} · {t('disclaimer.calendar')}
        </p>
      </div>
    </div>
  )
}
