import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ChevronDown, Search } from 'lucide-react'

import type { CropOut } from '../../../api/client'
import { cropHasOwnImage, getCropAsset } from '../../../assets/crops/cropRegistry'

export type CropSelection = { status: 'planted'; crop_id: string } | { status: 'fallow' | 'unknown'; crop_id: null }

/** Searchable crop selector with a constrained popup: internal scrolling,
 * keyboard support, images and bilingual labels. Replaces the native select
 * whose open list used to cover large parts of the page. */
export default function CropCombobox({
  crops,
  status,
  cropId,
  onChange,
  label,
}: {
  crops: CropOut[]
  status: 'planted' | 'fallow' | 'unknown'
  cropId: string | null
  onChange: (selection: CropSelection) => void
  label: string
}) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'
  const [open, setOpen] = useState(false)
  const [dropUp, setDropUp] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)

  // Open upward when there is not enough room below — the selector lives
  // inside a scrollable column and the popup must never be clipped.
  const toggle = () => {
    if (!open) {
      const rect = buttonRef.current?.getBoundingClientRect()
      setDropUp(Boolean(rect && window.innerHeight - rect.bottom < 340 && rect.top > 340))
    }
    setOpen((v) => !v)
  }

  useEffect(() => {
    if (!open) return
    const onOutside = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [open])

  useEffect(() => {
    if (open) searchRef.current?.focus()
  }, [open])

  const selectedCrop = status === 'planted' ? crops.find((c) => c.crop_id === cropId) ?? null : null
  const selectedAsset = getCropAsset(cropId)
  const displayLabel =
    status === 'planted' && selectedCrop
      ? isArabic ? selectedCrop.name_ar : selectedCrop.name_en
      : status === 'fallow'
        ? t('q.history.fallow')
        : t('q.history.unknown')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return crops
    return crops.filter((c) => c.name_en.toLowerCase().includes(q) || c.name_ar.includes(query.trim()))
  }, [crops, query, isArabic])

  function choose(next: CropSelection) {
    onChange(next)
    setOpen(false)
    setQuery('')
  }

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        onClick={toggle}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
        }}
        className="flex w-full items-center gap-2 rounded-xl border border-white/20 bg-[#0B1410] px-2.5 py-2 text-xs font-bold text-white transition-colors hover:border-[#A3E635]/60"
      >
        {status === 'planted' && selectedAsset && cropHasOwnImage(selectedAsset.id) && selectedAsset.image && (
          <img src={selectedAsset.image} alt="" className="h-6 w-6 shrink-0 rounded-md object-cover" />
        )}
        <span className="min-w-0 flex-1 truncate text-start">{displayLabel}</span>
        <ChevronDown size={14} className={`shrink-0 text-white/50 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div
          className={`absolute inset-x-0 z-50 overflow-hidden rounded-xl border border-white/15 bg-[#0B1410] shadow-2xl ${
            dropUp ? 'bottom-full mb-1.5' : 'top-full mt-1.5'
          }`}
          role="listbox"
          aria-label={label}
        >
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Search size={13} className="shrink-0 text-white/40" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpen(false)
                event.stopPropagation()
              }}
              placeholder={t('fp.history.searchCrops')}
              className="w-full bg-transparent text-xs font-semibold text-white outline-none placeholder:text-white/35"
              aria-label={t('fp.history.searchCrops')}
            />
          </div>
          <ul className="farm-scroll max-h-56 overflow-y-auto py-1" role="presentation">
            {(['unknown', 'fallow'] as const).map((special) => (
              <li key={special} role="option" aria-selected={status === special}>
                <button
                  type="button"
                  onClick={() => choose({ status: special, crop_id: null })}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-start text-xs font-bold transition-colors ${
                    status === special ? 'bg-[#A3E635]/15 text-[#C9F58E]' : 'text-white/80 hover:bg-white/5'
                  }`}
                >
                  {status === special && <Check size={13} className="text-[#A3E635]" />}
                  {special === 'fallow' ? t('q.history.fallow') : t('q.history.unknown')}
                </button>
              </li>
            ))}
            <li className="my-1 h-px bg-white/10" aria-hidden />
            {filtered.map((crop) => {
              const asset = getCropAsset(crop.crop_id)
              const active = status === 'planted' && cropId === crop.crop_id
              return (
                <li key={crop.crop_id} role="option" aria-selected={active}>
                  <button
                    type="button"
                    onClick={() => choose({ status: 'planted', crop_id: crop.crop_id })}
                    className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-start text-xs font-semibold transition-colors ${
                      active ? 'bg-[#A3E635]/15 text-[#C9F58E]' : 'text-white/85 hover:bg-white/5'
                    }`}
                  >
                    {asset && cropHasOwnImage(crop.crop_id) && asset.image ? (
                      <img src={asset.image} alt="" className="h-7 w-7 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[11px] font-extrabold"
                        style={{ background: asset ? asset.bgLight : 'rgba(255,255,255,0.06)', color: asset ? asset.accent : 'rgba(255,255,255,0.5)' }}
                      >
                        {(isArabic ? crop.name_ar : crop.name_en).trim().charAt(0)}
                      </span>
                    )}
                    <bdi className="min-w-0 flex-1 truncate">{isArabic ? crop.name_ar : crop.name_en}</bdi>
                    {active && <Check size={13} className="shrink-0 text-[#A3E635]" />}
                  </button>
                </li>
              )
            })}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-xs text-white/40">{t('fp.history.noCropsFound')}</li>
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
