import { useTranslation } from 'react-i18next'
import { Sprout, CloudRain, TriangleAlert, Info } from 'lucide-react'

import type { CropOut } from '../../api/client'

export function cropName(crop: { crop_id: string | null; name_en: string | null; name_ar: string | null; fallow?: boolean }, lang: string): string {
  if (crop.fallow || !crop.crop_id) return ''
  return (lang === 'ar' ? crop.name_ar : crop.name_en) || crop.crop_id
}

/** Crop slot chip used across timelines and cards. */
export function CropChip({ slot, size = 'md' }: { slot: { crop_id: string | null; name_en: string | null; name_ar: string | null; fallow?: boolean }; size?: 'sm' | 'md' }) {
  const { t, i18n } = useTranslation()
  const name = slot.fallow || !slot.crop_id ? t('plan.fallow') : cropName(slot, i18n.language)
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-xl border ${
        slot.fallow || !slot.crop_id ? 'border-line bg-cream text-ink/60' : 'border-line bg-white text-ink'
      } ${size === 'sm' ? 'px-2 py-1.5 min-w-[5rem]' : 'px-3 py-3 min-w-[6.5rem]'}`}
      title={slot.crop_id ?? undefined}
    >
      <Sprout className={`mb-1 ${slot.fallow || !slot.crop_id ? 'text-ink/40' : 'text-leaf'}`} size={size === 'sm' ? 16 : 22} aria-hidden />
      <span className={`font-semibold text-center leading-tight ${size === 'sm' ? 'text-[11px]' : 'text-sm'}`}>
        <bdi>{name}</bdi>
      </span>
    </div>
  )
}

/** Score indicator row: normalized 0..1 reference with honest missing state. */
export function IndicatorRow({ label, value, status }: { label: string; value: number | null; status: string }) {
  const { t } = useTranslation()
  const pct = value === null ? 0 : Math.round(value * 100)
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-ink/80">{label}</span>
        {value === null ? (
          <span className="text-amber font-semibold">{t('plan.indicators.unavailable')}</span>
        ) : (
          <span className="font-semibold text-forest">{pct}</span>
        )}
      </div>
      <div className="h-2 rounded-full bg-line overflow-hidden" role="img" aria-label={`${label}: ${value === null ? t('common.unknown') : pct}`}>
        <div
          className={`h-full rounded-full ${value === null ? 'bg-amber/50' : value >= 0.6 ? 'bg-leaf' : value >= 0.35 ? 'bg-sky' : 'bg-amber'}`}
          style={{ width: `${value === null ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}

export function StatusBadge({ kind, children }: { kind: 'live' | 'dataset' | 'cached' | 'unavailable' | 'failed' | 'demo' | 'pending'; children?: React.ReactNode }) {
  const { t } = useTranslation()
  const labels: Record<string, string> = {
    live: t('analysis.source.live'),
    dataset: t('analysis.source.dataset'),
    cached: t('analysis.source.cached'),
    unavailable: t('analysis.source.unavailable'),
    failed: t('analysis.source.failed'),
    demo: t('analysis.source.demo_fixture'),
    pending: t('analysis.source.pending'),
  }
  const styles: Record<string, string> = {
    live: 'bg-leaf/10 text-forest border-leaf/40',
    dataset: 'bg-purple-100 text-purple-700 border-purple-300',
    cached: 'bg-sky/10 text-sky border-sky/40',
    unavailable: 'bg-amber/10 text-amber border-amber/40',
    failed: 'bg-red-100 text-red-700 border-red-300',
    demo: 'bg-purple-100 text-purple-700 border-purple-300',
    pending: 'bg-line text-ink/60 border-line',
  }
  const icon = kind === 'live' ? <CloudRain size={12} /> : kind === 'unavailable' || kind === 'failed' ? <TriangleAlert size={12} /> : kind === 'demo' || kind === 'dataset' ? <Info size={12} /> : null
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold ${styles[kind]}`}>
      {icon}
      {children ?? labels[kind]}
    </span>
  )
}
