import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Sprout, Sparkles } from 'lucide-react'
import { getCropAsset, type CropAssetMeta } from '../../assets/crops/cropRegistry'

export interface CropSlotData {
  crop_id: string | null
  name_en?: string | null
  name_ar?: string | null
  fallow?: boolean
  slot_id?: string
  year_number?: number
}

interface CropVisualProps {
  slot: CropSlotData
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  interactive?: boolean
  selected?: boolean
  showFamily?: boolean
  showBadge?: boolean
  showName?: boolean
  className?: string
  onClick?: () => void
}

export function CropVisual({
  slot,
  size = 'md',
  interactive = false,
  selected = false,
  showFamily = false,
  showBadge = true,
  showName = true,
  className = '',
  onClick,
}: CropVisualProps) {
  const { t, i18n } = useTranslation()
  const [imgError, setImgError] = useState(false)
  const isArabic = i18n.language === 'ar'

  const isFallow = slot.fallow || !slot.crop_id
  const meta: CropAssetMeta | null = slot.crop_id ? getCropAsset(slot.crop_id) : null

  const displayName = isFallow
    ? t('plan.fallow')
    : (isArabic ? slot.name_ar : slot.name_en) ||
      (isArabic ? meta?.nameAr : meta?.nameEn) ||
      slot.crop_id ||
      t('plan.fallow')

  // Size variations
  const sizeMap = {
    xs: {
      box: 'px-2 py-1 min-w-[4.5rem]',
      img: 'w-7 h-7',
      text: 'text-[10px]',
      subtext: 'text-[8px]',
      icon: 13,
    },
    sm: {
      box: 'px-2.5 py-1.5 min-w-[5.75rem]',
      img: 'w-9 h-9',
      text: 'text-[11px]',
      subtext: 'text-[9px]',
      icon: 16,
    },
    md: {
      box: 'px-3.5 py-3 min-w-[7.5rem]',
      img: 'w-14 h-14',
      text: 'text-xs',
      subtext: 'text-[10px]',
      icon: 22,
    },
    lg: {
      box: 'px-4 py-4 min-w-[9.5rem]',
      img: 'w-20 h-20',
      text: 'text-sm',
      subtext: 'text-xs',
      icon: 28,
    },
    xl: {
      box: 'px-5 py-5 min-w-[12rem]',
      img: 'w-28 h-28',
      text: 'text-base font-bold',
      subtext: 'text-xs',
      icon: 36,
    },
  }[size]

  return (
    <div
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      className={`group relative flex flex-col items-center justify-center rounded-2xl transition-all duration-300 text-center select-none ${
        sizeMap.box
      } ${
        isFallow
          ? 'border border-dashed border-line bg-cream-warm/70 text-ink-muted'
          : selected
            ? 'border-2 border-leaf bg-white shadow-glow ring-2 ring-leaf/20 text-forest'
            : 'border border-line/90 bg-white shadow-sm hover:shadow-md hover:border-leaf/50 text-ink'
      } ${interactive ? 'cursor-pointer hover:-translate-y-1 active:translate-y-0' : ''} ${className}`}
      title={meta ? `${meta.nameEn} / ${meta.nameAr} (${meta.family})` : displayName}
    >
      {/* Nitrogen Fixer Indicator Tag */}
      {meta?.fixesNitrogen && showBadge && size !== 'xs' && (
        <span
          className="absolute -top-1.5 -end-1.5 flex items-center gap-0.5 rounded-full bg-emerald-700 text-white px-1.5 py-0.5 text-[8px] font-bold shadow-sm"
          title={isArabic ? 'مثبت للنيتروجين الحيوي' : 'Nitrogen fixer'}
        >
          <Sparkles size={8} /> N₂
        </span>
      )}

      {/* Visual representation: Botanical Illustration or Fallback */}
      <div
        className={`relative flex items-center justify-center rounded-xl overflow-hidden mb-1.5 ${sizeMap.img} ${
          isFallow ? 'bg-cream' : 'bg-gradient-to-b from-cream to-white'
        }`}
        style={meta && !isFallow ? { backgroundColor: meta.bgLight } : undefined}
      >
        {meta?.image && !isFallow && !imgError ? (
          <img
            src={meta.image}
            alt={displayName}
            loading="lazy"
            onError={() => setImgError(true)}
            className="w-full h-full object-contain p-0.5 transition-transform duration-300 group-hover:scale-110 drop-shadow-sm"
          />
        ) : (
          <div className="flex items-center justify-center w-full h-full">
            <Sprout
              size={sizeMap.icon}
              className={`${isFallow ? 'text-ink-light/40' : 'text-leaf'}`}
            />
          </div>
        )}
      </div>

      {/* Crop Name */}
      {showName && (
        <span className={`font-bold leading-snug tracking-tight ${sizeMap.text}`}>
          <bdi>{displayName}</bdi>
        </span>
      )}

      {/* Optional Family or Rotation Group Subtext */}
      {showFamily && meta && !isFallow && (
        <span className={`font-mono uppercase tracking-wider text-ink-light mt-0.5 ${sizeMap.subtext}`}>
          <bdi>{meta.group}</bdi>
        </span>
      )}
    </div>
  )
}
