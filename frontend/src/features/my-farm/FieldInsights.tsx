import { useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { CloudRain, Layers, TriangleAlert } from 'lucide-react'

import { api, type InsightsOut, type ObservationOut } from '../../api/client'
import { StatusBadge } from '../../app/components/ui'

function statusKind(quality: string): 'live' | 'cached' | 'unavailable' | 'demo' | 'failed' {
  if (quality === 'live') return 'live'
  if (quality === 'cached') return 'cached'
  if (quality === 'demo_fixture') return 'demo'
  if (quality === 'unavailable' || quality === 'failed') return 'unavailable'
  return 'unavailable'
}

function ObsCard({ obs, label }: { obs: ObservationOut; label: string }) {
  const { t } = useTranslation()
  const monthly = obs.meta?.monthly as Record<string, number | null> | undefined
  const depth = obs.meta?.depth as string | undefined
  const nValid = obs.meta?.n_valid_pixels as number | undefined
  const nTotal = obs.meta?.n_total_pixels as number | undefined
  const scenario = obs.meta?.period as string | undefined
  const inputLabel = obs.meta?.input_label as string | undefined
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <StatusBadge kind={statusKind(obs.quality_status)} />
      </div>
      <p className="mt-1 text-xl font-bold text-forest">
        {obs.value === null ? (
          <span className="text-amber text-sm">{t('common.unknown')}</span>
        ) : (
          <><bdi>{obs.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}</bdi> <span className="text-sm font-medium text-ink/60">{obs.unit}</span></>
        )}
      </p>
      {(depth || scenario) && (
        <p className="mt-1 text-[11px] font-medium text-ink/60">
          {depth && <><bdi>{depth}</bdi> · </>}
          {scenario && inputLabel && <>{scenario} · {inputLabel}</>}
        </p>
      )}
      <p className="mt-1 text-[11px] text-ink/50"><bdi>{obs.source_id}</bdi> · {t('status.regional')}</p>
      {obs.spatial_support && <p className="mt-0.5 text-[11px] text-ink/45"><bdi>{obs.spatial_support}</bdi></p>}
      {typeof nValid === 'number' && (
        <p className="mt-0.5 text-[11px] text-ink/45">
          {t('insights.pixels')}: <bdi>{nValid}</bdi>/{bdiSafe(nTotal)}
        </p>
      )}
      {monthly && obs.indicator === 'monthly_mean_precipitation' && (
        <div className="mt-2 flex h-10 items-end gap-0.5 overflow-hidden" aria-hidden>
          {Object.entries(monthly).map(([m, v]) => (
            <div
              key={m}
              className="flex-1 rounded-t bg-sky/60"
              style={{ height: `${Math.min(100, Math.max(6, ((v ?? 0) / 4) * 100))}%` }}
              title={`${m}: ${v ?? '–'}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function bdiSafe(v: number | undefined): string {
  return v === undefined ? '–' : String(v)
}

const LABELS: Record<string, string> = {
  monthly_mean_air_temperature: 'insights.annualTemp',
  monthly_mean_daily_max_temperature: 'insights.hottestMax',
  monthly_mean_daily_min_temperature: 'insights.coldestMin',
  monthly_mean_precipitation: 'insights.annualPrecip',
  monthly_mean_relative_humidity: 'insights.humidity',
  soil_ph: 'insights.soilPh',
  soil_organic_carbon: 'insights.soilOc',
  soil_sand_fraction: 'insights.soilSand',
  soil_clay_fraction: 'insights.soilClay',
  soil_total_nitrogen: 'insights.soilN',
}

export default function FieldInsights() {
  const { t } = useTranslation()
  const { fieldId } = useParams()

  const { data, isLoading } = useQuery({
    queryKey: ['insights', fieldId],
    queryFn: () => api.get<InsightsOut>(`/api/v1/fields/${fieldId}/insights`),
  })

  if (isLoading) return <p className="text-sm text-ink/60">{t('common.loading')}</p>
  if (!data) return <p className="text-sm text-ink/60">{t('insights.noData')}</p>

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-forest">{t('insights.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('insights.subtitle')}</p>

      {data.climate.length === 0 && data.soil.length === 0 ? (
        <div className="card mt-4 p-6 text-sm text-ink/70">{t('insights.noData')}</div>
      ) : (
        <div className="mt-4 space-y-5">
          <section>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink/50">
              <CloudRain size={15} className="text-sky" /> {t('insights.climate')}
            </h2>
            <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {data.climate.map((o) => (
                <ObsCard key={o.indicator} obs={o} label={t(LABELS[o.indicator] ?? o.indicator)} />
              ))}
            </div>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink/50">
              <Layers size={15} className="text-leaf" /> {t('insights.soil')}
            </h2>
            {data.soil.length === 0 ? (
              <p className="mt-2 rounded-lg border border-amber/40 bg-amber/10 px-3 py-2 text-xs text-ink/75">{t('insights.soilUnavailable')}</p>
            ) : (
              <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {data.soil.map((o) => (
                  <ObsCard key={o.indicator} obs={o} label={t(LABELS[o.indicator] ?? o.indicator)} />
                ))}
              </div>
            )}
          </section>

          {data.limitations.length > 0 && (
            <section className="card p-4">
              <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-ink/50">
                <TriangleAlert size={15} className="text-amber" /> {t('insights.limitations')}
              </h2>
              <ul className="mt-2 list-disc space-y-1 ps-5 text-xs text-ink/70">
                {data.limitations.map((l, i) => (
                  <li key={i}><bdi>{l}</bdi></li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-ink/55">{t('disclaimer.soil')}</p>
              <p className="mt-1 text-xs text-ink/55">{t('disclaimer.yield')}</p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
