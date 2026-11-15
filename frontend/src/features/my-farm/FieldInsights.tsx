import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  CloudRain,
  Layers,
  TriangleAlert,
  Thermometer,
  Droplets,
  Satellite,
  ShieldCheck,
  ArrowLeft,
  Info
} from 'lucide-react'

import { api, type InsightsOut, type ObservationOut } from '../../api/client'
import { StatusBadge } from '../../app/components/ui'

function statusKind(quality: string, sourceId: string): 'live' | 'dataset' | 'cached' | 'unavailable' | 'demo' | 'failed' {
  if (quality === 'live') return sourceId === 'soilgrids' || sourceId === 'gaez_v5' ? 'dataset' : 'live'
  if (quality === 'cached') return 'cached'
  if (quality === 'demo_fixture') return 'demo'
  return 'unavailable'
}

function referencePeriod(o: { source_id: string; period_start: string | null; period_end: string | null; meta: Record<string, unknown> }): string | null {
  if (o.source_id === 'soilgrids') return 'SoilGrids 2020 release (ISRIC)'
  if (o.source_id === 'gaez_v5') return '2001–2020 baseline (AgERA5)'
  if (o.source_id === 'nasa_power') {
    const p = o.meta?.climatology_period as string | undefined
    return p ?? 'NASA POWER 30-year climatology'
  }
  return null
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS_IN_MONTHS = [31, 28.25, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MONTH_KEYS_UPPER = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC']

export default function FieldInsights() {
  const { t, i18n } = useTranslation()
  const { fieldId } = useParams()
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const isArabic = i18n.language === 'ar'

  const { data, isLoading } = useQuery({
    queryKey: ['insights', fieldId],
    queryFn: () => api.get<InsightsOut>(`/api/v1/fields/${fieldId}/insights`),
  })

  if (isLoading) {
    return (
      <div className="mx-auto max-w-5xl py-16 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-forest border-t-transparent" />
        <p className="mt-3 text-sm font-medium text-ink/70">{t('common.loading')}</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-lg py-16 text-center">
        <div className="card p-8">
          <p className="text-sm font-medium text-ink/70">{t('insights.noData')}</p>
        </div>
      </div>
    )
  }

  // Find individual observations for structured display
  const precipObs = data.climate.find((o) => o.indicator === 'monthly_mean_precipitation')
  const meanTempObs = data.climate.find((o) => o.indicator === 'monthly_mean_air_temperature')
  const maxTempObs = data.climate.find((o) => o.indicator === 'monthly_mean_daily_max_temperature')
  const minTempObs = data.climate.find((o) => o.indicator === 'monthly_mean_daily_min_temperature')
  const humidityObs = data.climate.find((o) => o.indicator === 'monthly_mean_relative_humidity')

  const phObs = data.soil.find((o) => o.indicator === 'soil_ph')
  const ocObs = data.soil.find((o) => o.indicator === 'soil_organic_carbon')
  const nObs = data.soil.find((o) => o.indicator === 'soil_total_nitrogen')
  const sandObs = data.soil.find((o) => o.indicator === 'soil_sand_fraction')
  const siltObs = data.soil.find((o) => o.indicator === 'soil_silt_fraction')
  const clayObs = data.soil.find((o) => o.indicator === 'soil_clay_fraction')

  const monthlyPrecip = precipObs?.meta?.monthly as Record<string, number | null> | undefined

  // Scientific Precipitation Conversion:
  // NASA POWER PRECTOTCORR is mm/day.
  // Aggregate daily rates by monthly days to get accurate annual rainfall (mm/year).
  let annualPrecipMm: number | null = null
  if (monthlyPrecip) {
    let sum = 0
    let validCount = 0
    for (let i = 0; i < 12; i++) {
      const v = monthlyPrecip[MONTH_KEYS_UPPER[i]] ?? monthlyPrecip[String(i + 1)] ?? monthlyPrecip[String(i + 1).padStart(2, '0')]
      if (typeof v === 'number') {
        sum += v * DAYS_IN_MONTHS[i]
        validCount++
      }
    }
    if (validCount > 0) annualPrecipMm = sum
  }
  if (annualPrecipMm === null && precipObs?.value !== null && precipObs?.value !== undefined) {
    annualPrecipMm = precipObs.value * 365.25
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 pb-16">
      {/* Precision Scientific Header (No repetitive AI dark banner!) */}
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
            <div className="inline-flex items-center gap-2 rounded-full border border-sky/30 bg-sky/10 px-3 py-0.5 text-xs font-semibold text-sky-800">
              <Satellite size={13} className="text-sky-700" />
              <span>{isArabic ? 'رصد الأرض والاستشعار عن بعد' : 'Scientific Earth Observation Instrument'}</span>
            </div>
            <h1 className="mt-2 font-display text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
              {t('insights.title')}
            </h1>
            <p className="mt-1 text-sm text-ink/70 max-w-2xl">
              {t('insights.subtitle')}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-ink/60">
            <span className="rounded-lg border border-line bg-cream/70 px-2.5 py-1">
              NASA POWER 0.5°
            </span>
            <span className="rounded-lg border border-line bg-cream/70 px-2.5 py-1">
              SoilGrids 250m
            </span>
            <span className="rounded-lg border border-line bg-cream/70 px-2.5 py-1">
              FAO GAEZ v5
            </span>
          </div>
        </div>
      </div>

      {/* CLIMATE & ATMOSPHERIC INTELLIGENCE (NASA POWER) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sky/10 text-sky-800 border border-sky/20">
              <CloudRain size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-forest">
                {t('insights.climate')}
              </h2>
              <p className="text-xs text-ink/60">
                NASA POWER Climatology · Spatial Resolution 0.5° × 0.5° (~55 km)
              </p>
            </div>
          </div>
          {precipObs && (
            <StatusBadge kind={statusKind(precipObs.quality_status, precipObs.source_id)} />
          )}
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Temperature Cluster Card */}
          <div className="card border border-line bg-white p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
              <span className="flex items-center gap-1.5">
                <Thermometer size={15} className="text-amber-700" />
                {t('insights.annualTemp')}
              </span>
              <span className="font-mono text-[11px] text-ink/40">°C</span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-extrabold text-forest">
                {meanTempObs?.value !== null && meanTempObs?.value !== undefined ? (
                  <bdi>{meanTempObs.value.toFixed(1)}</bdi>
                ) : (
                  <span className="text-sm text-ink/40">{t('common.unknown')}</span>
                )}
              </span>
              <span className="text-xs font-semibold text-ink/50">°C annual mean</span>
            </div>

            {/* Min / Max Thermal Envelope */}
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-cream/70 p-3 text-xs border border-line/60">
              <div>
                <span className="text-[10px] font-semibold text-sky-800 uppercase tracking-wider">
                  {t('insights.coldestMin')}
                </span>
                <p className="mt-0.5 font-display text-sm font-bold text-forest">
                  {minTempObs?.value !== null && minTempObs?.value !== undefined ? (
                    <><bdi>{minTempObs.value.toFixed(1)}</bdi> °C</>
                  ) : '–'}
                </p>
              </div>
              <div className="border-s border-line/70 ps-3">
                <span className="text-[10px] font-semibold text-amber-800 uppercase tracking-wider">
                  {t('insights.hottestMax')}
                </span>
                <p className="mt-0.5 font-display text-sm font-bold text-forest">
                  {maxTempObs?.value !== null && maxTempObs?.value !== undefined ? (
                    <><bdi>{maxTempObs.value.toFixed(1)}</bdi> °C</>
                  ) : '–'}
                </p>
              </div>
            </div>

            {/* Humidity */}
            {humidityObs?.value !== null && humidityObs?.value !== undefined && (
              <div className="flex items-center justify-between border-t border-line/50 pt-2 text-xs text-ink/70">
                <span className="flex items-center gap-1.5">
                  <Droplets size={13} className="text-sky-700" />
                  {t('insights.humidity')}
                </span>
                <span className="font-bold text-forest">
                  <bdi>{humidityObs.value.toFixed(0)}</bdi>%
                </span>
              </div>
            )}
          </div>

          {/* Precipitation & Monthly Histogram Card with Corrected Units */}
          <div className="card border border-line bg-white p-5 shadow-sm space-y-3 sm:col-span-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Droplets size={16} className="text-sky-700" />
                <div>
                  <span className="text-xs font-bold text-forest">
                    {t('insights.annualPrecip')}
                  </span>
                  <p className="text-[11px] text-ink/50">
                    NASA POWER 30-year agroclimatology baseline
                  </p>
                </div>
              </div>

              {/* Verified Annual Precipitation Display */}
              <div className="text-end">
                <div className="flex items-baseline gap-1 justify-end">
                  <span className="font-display text-2xl font-extrabold text-forest">
                    {annualPrecipMm !== null ? (
                      <bdi>{annualPrecipMm.toLocaleString(undefined, { maximumFractionDigits: 0 })}</bdi>
                    ) : '–'}
                  </span>
                  <span className="text-xs font-semibold text-ink/60">mm/yr</span>
                </div>
                {precipObs?.value !== null && precipObs?.value !== undefined && (
                  <span className="text-[10px] font-mono text-ink/50">
                    Daily normal: <bdi>{precipObs.value.toFixed(2)}</bdi> mm/day
                  </span>
                )}
              </div>
            </div>

            {/* Monthly Precipitation Histogram (Jan-Dec) */}
            {monthlyPrecip ? (
              <div className="pt-2">
                <div className="flex items-center justify-between text-[11px] text-ink/60 mb-1">
                  <span className="font-medium">
                    {isArabic ? 'توزيع هطول الأمطار الشهري' : 'Monthly Precipitation Distribution'}
                  </span>
                  {activeMonth !== null && (() => {
                    const monthKeyUpper = MONTH_KEYS_UPPER[activeMonth]
                    const daily = monthlyPrecip[monthKeyUpper] ?? monthlyPrecip[String(activeMonth + 1)] ?? 0
                    const monthlyTotal = typeof daily === 'number' ? daily * DAYS_IN_MONTHS[activeMonth] : 0
                    return (
                      <span className="font-mono text-xs font-bold text-forest">
                        {MONTH_NAMES[activeMonth]}: {monthlyTotal.toFixed(0)} mm/mo ({typeof daily === 'number' ? daily.toFixed(2) : '–'} mm/day)
                      </span>
                    )
                  })()}
                </div>

                <div
                  className="flex h-24 items-end gap-1.5 rounded-2xl bg-cream/50 p-2.5 border border-line/60"
                  aria-label="Monthly Precipitation Chart"
                >
                  {Array.from({ length: 12 }, (_, i) => {
                    const monthKeyUpper = MONTH_KEYS_UPPER[i]
                    const val = monthlyPrecip[monthKeyUpper] ?? monthlyPrecip[String(i + 1)] ?? 0
                    const dailyVal = typeof val === 'number' ? val : 0
                    const heightPercent = Math.min(100, Math.max(8, (dailyVal / 4.5) * 100))
                    const isHovered = activeMonth === i

                    return (
                      <div
                        key={monthKeyUpper}
                        className="group relative flex flex-1 flex-col items-center h-full justify-end cursor-pointer"
                        onMouseEnter={() => setActiveMonth(i)}
                        onMouseLeave={() => setActiveMonth(null)}
                      >
                        <div
                          className={`w-full rounded-t-lg transition-all ${
                            isHovered
                              ? 'bg-sky-600 shadow-md scale-y-105'
                              : 'bg-gradient-to-t from-sky/50 to-sky/90 group-hover:bg-sky-700'
                          }`}
                          style={{ height: `${heightPercent}%` }}
                        />
                        <span className="mt-1 font-mono text-[9px] font-bold text-ink/50 group-hover:text-forest">
                          {MONTH_NAMES[i]}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : (
              <p className="text-xs text-ink/40">No monthly distribution data available.</p>
            )}

            <div className="flex items-center gap-1.5 text-[10px] text-ink/50 pt-1">
              <Info size={12} className="text-sky-700 shrink-0" />
              <span>
                NASA POWER reports precipitation as daily rate (mm/day); annual values reflect monthly weighted totals.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* PEDOLOGICAL & SOIL INTELLIGENCE (ISRIC SOILGRIDS) */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-leaf/10 text-leaf border border-leaf/20">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="font-display text-lg font-bold text-forest">
                {t('insights.soil')}
              </h2>
              <p className="text-xs text-ink/60">
                ISRIC SoilGrids 2020 · 250m Resolution · 0–30 cm Surface Layer
              </p>
            </div>
          </div>
          {phObs && (
            <StatusBadge kind={statusKind(phObs.quality_status, phObs.source_id)} />
          )}
        </div>

        {data.soil.length === 0 ? (
          <div className="rounded-2xl border border-amber/30 bg-amber/5 p-4 text-xs text-ink/75">
            {t('insights.soilUnavailable')}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Soil pH Card */}
            <div className="card border border-line bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
                <span>{t('insights.soilPh')}</span>
                <span className="font-mono text-[10px] text-ink/40">pH</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-forest">
                  {phObs?.value !== null && phObs?.value !== undefined ? (
                    <bdi>{phObs.value.toFixed(1)}</bdi>
                  ) : '–'}
                </span>
                <span className="text-xs text-ink/50">
                  {phObs?.value !== null && phObs?.value !== undefined ? (
                    phObs.value < 6.0 ? (isArabic ? 'حمضي' : 'Acidic') : phObs.value > 7.5 ? (isArabic ? 'قلوي' : 'Alkaline') : (isArabic ? 'متعادل / مثالي' : 'Neutral / Optimal')
                  ) : ''}
                </span>
              </div>
              {/* Visual pH Scale Bar */}
              <div className="relative h-2 w-full rounded-full bg-gradient-to-r from-amber-400 via-leaf to-sky/70">
                {phObs?.value !== null && phObs?.value !== undefined && (
                  <div
                    className="absolute -top-1 h-4 w-1.5 rounded-full bg-forest shadow-md ring-1 ring-white"
                    style={{
                      left: `${Math.max(5, Math.min(95, ((phObs.value - 4) / (9 - 4)) * 100))}%`,
                    }}
                  />
                )}
              </div>
              <div className="flex justify-between text-[9px] font-mono text-ink/40">
                <span>{isArabic ? 'حمضي 4.0' : '4.0 Acid'}</span>
                <span>7.0</span>
                <span>{isArabic ? 'قلوي 9.0' : '9.0 Alk'}</span>
              </div>
            </div>

            {/* Soil Organic Carbon */}
            <div className="card border border-line bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
                <span>{t('insights.soilOc')}</span>
                <span className="font-mono text-[10px] text-ink/40">g/kg</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-forest">
                  {ocObs?.value !== null && ocObs?.value !== undefined ? (
                    <bdi>{ocObs.value.toFixed(1)}</bdi>
                  ) : '–'}
                </span>
                <span className="text-xs text-ink/50">g/kg SOC</span>
              </div>
              <p className="text-[11px] text-ink/50">
                {isArabic ? 'محتوى الكربون العضوي للتربة 0-30 سم' : '0–30 cm soil organic carbon (SoilGrids 2020)'}
              </p>
            </div>

            {/* Total Nitrogen */}
            <div className="card border border-line bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
                <span>{t('insights.soilN')}</span>
                <span className="font-mono text-[10px] text-ink/40">cg/kg</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl font-extrabold text-forest">
                  {nObs?.value !== null && nObs?.value !== undefined ? (
                    <bdi>{nObs.value.toFixed(1)}</bdi>
                  ) : '–'}
                </span>
                <span className="text-xs text-ink/50">cg/kg total N</span>
              </div>
              <p className="text-[11px] text-ink/50">
                {isArabic ? 'النيتروجين الكلي بدقة 250 متر' : 'Total soil nitrogen at 250m gridded resolution'}
              </p>
            </div>

            {/* Soil Texture Fraction Trio */}
            <div className="card border border-line bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center justify-between text-xs font-semibold text-ink/60">
                <span>{isArabic ? 'قوام التربة' : 'Soil Texture'}</span>
                <span className="font-mono text-[10px] text-ink/40">Fraction %</span>
              </div>
              {/* Stacked Composition Bar */}
              <div className="flex h-3 w-full overflow-hidden rounded-full border border-line bg-cream/70">
                <div
                  className="bg-amber-300"
                  style={{ width: `${sandObs?.value ?? 33}%` }}
                  title={`Sand: ${sandObs?.value?.toFixed(0) ?? '–'}%`}
                />
                <div
                  className="bg-leaf"
                  style={{ width: `${siltObs?.value ?? 33}%` }}
                  title={`Silt: ${siltObs?.value?.toFixed(0) ?? '–'}%`}
                />
                <div
                  className="bg-forest"
                  style={{ width: `${clayObs?.value ?? 34}%` }}
                  title={`Clay: ${clayObs?.value?.toFixed(0) ?? '–'}%`}
                />
              </div>
              <div className="grid grid-cols-3 gap-1 text-[10px] font-medium text-ink/70">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  {isArabic ? 'رمل' : 'Sand'}: {sandObs?.value?.toFixed(0) ?? '–'}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-leaf" />
                  {isArabic ? 'طمي' : 'Silt'}: {siltObs?.value?.toFixed(0) ?? '–'}%
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-forest" />
                  {isArabic ? 'طين' : 'Clay'}: {clayObs?.value?.toFixed(0) ?? '–'}%
                </span>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* SCIENTIFIC LIMITATIONS & HONESTY DISCLOSURE */}
      {data.limitations.length > 0 && (
        <section className="rounded-2xl border border-amber/30 bg-amber-50/60 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-sm font-bold text-amber-900">
            <TriangleAlert size={18} className="text-amber-700" />
            <span>{t('insights.limitations')}</span>
          </div>

          <ul className="list-disc space-y-1.5 ps-5 text-xs text-amber-950/80 leading-relaxed">
            {data.limitations.map((l, i) => (
              <li key={i}>
                <bdi>{l}</bdi>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-amber-200/60 pt-3 space-y-1 text-xs text-amber-900/70">
            <p className="font-semibold text-amber-950">Scientific Integrity Notice:</p>
            <p>{t('disclaimer.soil')}</p>
            <p>{t('disclaimer.yield')}</p>
          </div>
        </section>
      )}
    </div>
  )
}
