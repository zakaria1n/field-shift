import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Crosshair, Loader2, MapPin, Search } from 'lucide-react'

import { api, type PlaceResult } from '../../../api/client'
import type { SelectedPlace } from '../utils/observatoryMath'

/** Canonical top search pill: live geocoder suggestions (backend Nominatim
 * proxy) plus a geolocate target. Enter picks the first suggestion. */
export default function LocationSearch({
  onSelect,
  onUseLocation,
  searchingLocation = false,
  testId,
}: {
  onSelect: (query: string, place: SelectedPlace) => void
  onUseLocation: () => void
  searchingLocation?: boolean
  testId?: string
}) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [debounced, setDebounced] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(text.trim()), 300)
    return () => clearTimeout(timer)
  }, [text])

  const { data, isFetching, isError } = useQuery({
    queryKey: ['observatory-places', debounced],
    queryFn: () =>
      api.get<{ results: PlaceResult[] }>(`/api/v1/places/search?q=${encodeURIComponent(debounced)}`),
    enabled: debounced.length >= 2,
    staleTime: 60_000,
  })

  const results = debounced.length >= 2 ? (data?.results ?? []) : []
  const busy = isFetching || searchingLocation

  const pick = (place: SelectedPlace) => {
    setOpen(false)
    setText(place.displayName.split(',')[0]?.trim() ?? '')
    onSelect(debounced || place.displayName, place)
  }

  return (
    <div className="relative w-full" data-testid={testId}>
      <div className="flex h-12 items-center gap-2 rounded-full bg-white px-4 shadow-2xl sm:h-14">
        <span className="shrink-0 text-[#17352D]">
          {busy ? <Loader2 size={19} className="animate-spin text-leaf" /> : <Search size={19} />}
        </span>
        <input
          type="text"
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-label={t('obs.search.placeholder')}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-semibold text-[#17352D] outline-none placeholder:font-normal placeholder:text-[#8AA39A]"
          placeholder={t('obs.search.placeholder')}
          value={text}
          onChange={(event) => {
            setText(event.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && results.length > 0) {
              const first = results[0]
              pick({ lat: first.lat, lon: first.lon, displayName: first.display_name })
            } else if (event.key === 'Escape') {
              setOpen(false)
            }
          }}
        />
        <span className="h-6 w-px shrink-0 bg-[#E3EBE6]" aria-hidden="true" />
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            onUseLocation()
          }}
          className="shrink-0 rounded-full p-1.5 text-leaf transition-colors hover:bg-leaf-soft"
          aria-label={t('field.useMyLocation')}
          title={t('field.useMyLocation')}
        >
          <Crosshair size={19} />
        </button>
      </div>

      {open && results.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl bg-white py-1 text-start shadow-2xl">
          {results.slice(0, 5).map((result, index) => (
            <li key={`${result.lat}-${result.lon}-${index}`}>
              <button
                type="button"
                className={`flex w-full items-center gap-3 px-4 py-2.5 text-start text-sm transition-colors ${
                  index === 0
                    ? 'bg-[#DFF5C8] font-bold text-[#17352D]'
                    : 'font-semibold text-[#17352D] hover:bg-[#F2F8EC]'
                }`}
                onClick={() => pick({ lat: result.lat, lon: result.lon, displayName: result.display_name })}
              >
                <MapPin size={16} className={index === 0 ? 'text-[#3E7A1F]' : 'text-[#4A6359]'} shrink-0 />
                <bdi className="truncate">{result.display_name}</bdi>
              </button>
            </li>
          ))}
        </ul>
      )}

      {open && debounced.length >= 2 && !busy && results.length === 0 && data && (
        <p className="absolute inset-x-0 top-full z-40 mt-2 rounded-xl bg-white/95 px-4 py-2.5 text-start text-xs font-semibold text-[#4A6359] shadow-xl">
          {t('obs.search.noResults')}
        </p>
      )}

      {open && debounced.length >= 2 && isError && (
        <p className="absolute inset-x-0 top-full z-40 mt-2 rounded-xl bg-white/95 px-4 py-2.5 text-start text-xs font-semibold text-amber-dark shadow-xl">
          {t('obs.search.unavailable')}
        </p>
      )}
    </div>
  )
}
