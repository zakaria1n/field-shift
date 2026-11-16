import { useTranslation } from 'react-i18next'
import { Leaf } from 'lucide-react'
import { useWizard } from '../../../state/wizard'

import LocationSearch from './LocationSearch'
import type { SelectedPlace } from '../utils/observatoryMath'

/** Canonical top bar: leaf logo + wordmark, centered search pill, EN/العربية.
 * Overlays both the globe and the drawing map exactly like the references. */
export default function ObservatoryNavbar({
  onSelectPlace,
  onUseLocation,
  searchingLocation,
}: {
  onSelectPlace: (query: string, place: SelectedPlace) => void
  onUseLocation: () => void
  searchingLocation?: boolean
}) {
  const { i18n } = useTranslation()
  const { setLang } = useWizard()
  const isArabic = i18n.language === 'ar'

  return (
    <nav className="absolute inset-x-0 top-0 z-30">
      <div className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-7 sm:py-4">
        <span className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#229E65]">
            <Leaf size={18} className="text-white" />
          </span>
          <span className="font-display text-xl font-extrabold tracking-tight">
            <span className="text-white">Field</span>
            <span className="text-[#8FE627]">Shift</span>
          </span>
        </span>

        <div className="mx-auto w-full max-w-xl sm:max-w-2xl">
          <LocationSearch
            onSelect={onSelectPlace}
            onUseLocation={onUseLocation}
            searchingLocation={searchingLocation}
            testId="observatory-search"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs font-bold">
          <button
            type="button"
            onClick={() => setLang('en')}
            aria-pressed={!isArabic}
            className={`rounded-full border px-3 py-1 transition-colors ${
              !isArabic
                ? 'border-lime-300/70 bg-black/25 text-white'
                : 'border-white/30 text-white/75 hover:text-white'
            }`}
          >
            EN
          </button>
          <span className="h-4 w-px bg-white/30" aria-hidden="true" />
          <button
            type="button"
            onClick={() => setLang('ar')}
            aria-pressed={isArabic}
            className={`font-ar transition-colors ${isArabic ? 'text-lime-200' : 'text-white/75 hover:text-white'}`}
          >
            العربية
          </button>
        </div>
      </div>
    </nav>
  )
}
