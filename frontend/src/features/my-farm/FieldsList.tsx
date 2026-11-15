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
  ShieldCheck,
  ArrowLeft,
  Satellite
} from 'lucide-react'

import { api, type DashboardItem, type FieldOut } from '../../api/client'
import { CropVisual } from '../../app/components/CropVisual'
import { FieldPolygonThumbnail } from '../../app/components/FieldPolygonThumbnail'

export default function FieldsList() {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardItem[]>('/api/v1/dashboard'),
  })

  const { data: fieldsData } = useQuery({
    queryKey: ['fields-list-geo'],
    queryFn: () => api.get<{ fields: FieldOut[] }>('/api/v1/fields'),
  })

  const fields = dashboard ?? []
  const totalHectares = fields.reduce((acc, f) => acc + (f.area_ha || 0), 0)

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl py-20 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-ink/70">{t('common.loading')}</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
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
              <MapPin size={13} className="text-leaf" />
              <span>{isArabic ? 'سجل القطع الفلاحية' : 'Agricultural Parcels Portfolio'}</span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {t('nav.fields')}
            </h1>
            <p className="mt-1 text-sm text-ink/70 max-w-2xl">
              {isArabic
                ? 'إدارة حدود حقولك، والجداول الزمنية للدورة الزراعية، ومؤشرات رصد الأرض.'
                : 'Manage your agricultural boundaries, seasonal timelines, and Earth observation telemetry.'}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-mono text-forest bg-cream/70 border border-line rounded-xl px-3 py-2">
              <span className="font-bold">{fields.length} {isArabic ? 'حقول' : (fields.length === 1 ? 'Parcel' : 'Parcels')}</span>
              <span className="text-ink/30">·</span>
              <span>
                <strong className="text-leaf font-bold">
                  <bdi>{totalHectares.toLocaleString(i18n.language, { maximumFractionDigits: 1 })}</bdi>
                </strong>{' '}
                {t('common.hectare')}
              </span>
            </div>

            <Link
              to="/fields/new"
              className="btn-primary !py-2.5 !px-4 text-xs font-bold inline-flex items-center gap-1.5 shadow-sm"
            >
              <Plus size={15} />
              <span>{t('home.addField')}</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Fields List */}
      {fields.length === 0 ? (
        <div className="card border-dashed border-forest/20 p-12 text-center max-w-md mx-auto space-y-4">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-forest/5 text-forest">
            <MapPin size={28} />
          </div>
          <h2 className="text-xl font-bold text-forest">No Registered Fields Yet</h2>
          <p className="text-sm text-ink/70 max-w-sm mx-auto">
            Draw or select your field boundary to begin analyzing satellite climatology and SoilGrids data.
          </p>
          <Link to="/fields/new" className="btn-primary inline-flex items-center gap-2">
            <Plus size={16} />
            <span>{t('home.addField')}</span>
          </Link>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {fields.map((field) => {
            const hasPlan = Boolean(field.active_plan)
            const fieldGeo = fieldsData?.fields.find((f) => f.field_id === field.field_id)

            return (
              <div
                key={field.field_id}
                className="card overflow-hidden border border-line bg-white p-5 sm:p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Card Header with real vector boundary preview */}
                  <div className="flex items-start gap-4">
                    {/* Cadastral Polygon Thumbnail */}
                    <div className="h-24 w-24 shrink-0">
                      <FieldPolygonThumbnail
                        geometry={fieldGeo?.geometry_geojson}
                        className="w-full h-full"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-display text-lg font-bold text-forest truncate">
                          <bdi>{field.field_name}</bdi>
                        </h3>
                        {hasPlan ? (
                          <span className="shrink-0 inline-flex items-center gap-1 rounded-full border border-leaf/30 bg-leaf/10 px-2 py-0.5 text-[10px] font-bold text-forest">
                            <span className="h-1.5 w-1.5 rounded-full bg-leaf" />
                            {t('plans.manage.active')}
                          </span>
                        ) : (
                          <span className="shrink-0 rounded-full border border-amber/30 bg-amber/10 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                            No active plan
                          </span>
                        )}
                      </div>

                      <p className="mt-1 font-mono text-xs font-bold text-forest">
                        <bdi>{field.area_ha.toLocaleString(i18n.language, { maximumFractionDigits: 2 })}</bdi>{' '}
                        {t('common.hectare')}
                      </p>

                      <p className="text-[11px] font-mono text-ink/40 mt-0.5">
                        ID: {field.field_id.slice(0, 8)}
                        {fieldGeo && ` · ${fieldGeo.centroid_lat.toFixed(3)}°N, ${fieldGeo.centroid_lon.toFixed(3)}°E`}
                      </p>
                    </div>
                  </div>

                  {/* Active Rotation Sequence */}
                  {field.active_plan ? (
                    <div className="mt-4 rounded-xl border border-line/70 bg-cream/50 p-3 space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-forest truncate">
                          <bdi>{field.active_plan.label}</bdi>
                        </span>
                        <span className="font-mono text-[10px] text-ink/40 shrink-0">
                          3-Year Cycle
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
                    <div className="mt-4 rounded-xl border border-dashed border-line bg-cream/30 p-3.5 text-center">
                      <p className="text-xs text-ink/60">No crop rotation adopted yet.</p>
                      <Link
                        to={`/fields/${field.field_id}/rotations`}
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-forest hover:text-leaf"
                      >
                        <Sparkles size={12} />
                        <span>Explore recommendations</span>
                      </Link>
                    </div>
                  )}

                  {/* Profile Diagnostic Meta */}
                  {field.profile_summary && (
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-ink/60 font-medium">
                      <span className="inline-flex items-center gap-1 rounded bg-forest/5 px-2 py-0.5 capitalize">
                        <Droplets size={11} className="text-sky-700" />
                        {field.profile_summary.irrigation_type.replace('_', ' ')}
                      </span>
                      {field.profile_summary.purposes.slice(0, 2).map((p) => (
                        <span key={p} className="rounded bg-forest/5 px-2 py-0.5">
                          {t(`q.purposes.${p}`)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line/60 pt-3">
                  <Link
                    to={`/fields/${field.field_id}/timeline`}
                    className="btn-secondary !py-2 text-xs inline-flex items-center gap-1 font-semibold"
                  >
                    <Calendar size={13} />
                    <span>{t('timeline.title')}</span>
                  </Link>
                  <Link
                    to={`/fields/${field.field_id}/insights`}
                    className="btn-secondary !py-2 text-xs inline-flex items-center gap-1 font-semibold"
                  >
                    <Satellite size={13} className="text-sky-700" />
                    <span>{t('insights.title')}</span>
                  </Link>
                  <Link
                    to={`/fields/${field.field_id}/plans`}
                    className="btn-secondary !py-2 text-xs ms-auto inline-flex items-center gap-1 font-semibold"
                  >
                    <span>{t('plans.manage.title')}</span>
                    <ChevronRight size={13} className="rtl:rotate-180" />
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
