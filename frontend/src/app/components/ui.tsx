import React from 'react'
import { useTranslation } from 'react-i18next'
import { CloudRain, TriangleAlert, Info, Sparkles, CheckCircle2 } from 'lucide-react'

import type { CropOut } from '../../api/client'
import { CropVisual, type CropSlotData } from './CropVisual'

export { CropVisual }

export function cropName(
  crop: { crop_id: string | null; name_en: string | null; name_ar: string | null; fallow?: boolean },
  lang: string,
): string {
  if (crop.fallow || !crop.crop_id) return ''
  return (lang === 'ar' ? crop.name_ar : crop.name_en) || crop.crop_id
}

/** Crop slot chip used across timelines and cards - upgraded with real botanical artwork. */
export function CropChip({
  slot,
  size = 'md',
  interactive = false,
  selected = false,
  onClick,
}: {
  slot: {
    crop_id: string | null
    name_en?: string | null
    name_ar?: string | null
    fallow?: boolean
    slot_id?: string
    year_number?: number
  }
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  selected?: boolean
  onClick?: () => void
}) {
  return (
    <CropVisual
      slot={slot}
      size={size}
      interactive={interactive}
      selected={selected}
      onClick={onClick}
    />
  )
}

/** Score indicator row: normalized 0..1 reference with honest missing state and glowing gradient meters. */
export function IndicatorRow({
  label,
  value,
  status,
  weight,
}: {
  label: string
  value: number | null
  status: string
  weight?: number
}) {
  const { t } = useTranslation()
  const pct = value === null ? 0 : Math.round(value * 100)

  // Determine indicator color theme
  const getMeterColor = (val: number | null) => {
    if (val === null) return 'bg-amber/40'
    if (val >= 0.7) return 'bg-gradient-to-r from-leaf to-emerald-400'
    if (val >= 0.45) return 'bg-gradient-to-r from-sky to-sky-deep'
    return 'bg-gradient-to-r from-amber to-amber-dark'
  }

  return (
    <div className="group">
      <div className="flex items-center justify-between text-xs mb-1.5">
        <span className="font-semibold text-ink-muted group-hover:text-forest transition-colors">
          {label}
        </span>
        <div className="flex items-center gap-1.5 font-mono">
          {weight !== undefined && (
            <span className="text-[10px] text-ink-light font-normal">
              ({weight}%)
            </span>
          )}
          {value === null ? (
            <span className="text-amber-dark font-bold text-[11px] bg-amber-soft px-1.5 py-0.5 rounded">
              {t('plan.indicators.unavailable')}
            </span>
          ) : (
            <span className="font-bold text-forest text-xs">{pct}%</span>
          )}
        </div>
      </div>
      <div
        className="h-2 rounded-full bg-line/80 overflow-hidden p-0.5"
        role="img"
        aria-label={`${label}: ${value === null ? t('common.unknown') : pct}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${getMeterColor(value)}`}
          style={{ width: `${value === null ? 100 : pct}%` }}
        />
      </div>
    </div>
  )
}

export function StatusBadge({
  kind,
  children,
}: {
  kind: 'live' | 'dataset' | 'cached' | 'unavailable' | 'failed' | 'demo' | 'pending'
  children?: React.ReactNode
}) {
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
    live: 'bg-leaf-soft text-leaf-dark border-leaf/30 shadow-[0_0_8px_rgba(34,158,101,0.12)]',
    dataset: 'bg-purple-50 text-purple-800 border-purple-200',
    cached: 'bg-sky-soft text-sky-deep border-sky/30',
    unavailable: 'bg-amber-soft text-amber-dark border-amber/30',
    failed: 'bg-red-50 text-red-700 border-red-200',
    demo: 'bg-purple-50 text-purple-800 border-purple-200',
    pending: 'bg-line-subtle text-ink-light border-line',
  }
  const icon =
    kind === 'live' ? (
      <Sparkles size={11} className="text-leaf" />
    ) : kind === 'unavailable' || kind === 'failed' ? (
      <TriangleAlert size={11} className="text-amber-dark" />
    ) : kind === 'demo' || kind === 'dataset' ? (
      <Info size={11} className="text-purple-600" />
    ) : kind === 'cached' ? (
      <CloudRain size={11} className="text-sky" />
    ) : null

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-bold tracking-tight ${styles[kind]}`}
    >
      {icon}
      {children ?? labels[kind]}
    </span>
  )
}
