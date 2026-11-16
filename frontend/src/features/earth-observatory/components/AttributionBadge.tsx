import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronUp } from 'lucide-react'

import { ATTRIBUTION } from '../config/observatory'

/** The single provider-credit control for both the globe and the drawing map.
 * Collapsed it shows the short mandatory credits; expanding lists every
 * provider detail. Both engines' built-in attribution controls are disabled,
 * so no duplicate credit pills appear around the globe→map transition. */
export default function AttributionBadge({ basemap }: { basemap: 'satellite' | 'standard' }) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)

  return (
    <div
      className="absolute bottom-1.5 end-2 z-40 max-w-[calc(100vw-1rem)] text-[10px] leading-tight text-white/70"
      data-testid="attribution-badge"
    >
      <button
        type="button"
        onClick={() => setExpanded((open) => !open)}
        aria-expanded={expanded}
        aria-label={t('obs.attribution.title')}
        className="inline-flex max-w-[70vw] items-center gap-1 rounded-md bg-[#060E0B]/70 px-2 py-1 backdrop-blur-sm transition-colors hover:bg-[#0B1410]/85"
      >
        <span className="truncate">
          {basemap === 'satellite' ? ATTRIBUTION.short : ATTRIBUTION.standard}
        </span>
        {expanded ? <ChevronUp size={11} className="shrink-0" /> : <ChevronDown size={11} className="shrink-0" />}
      </button>

      {expanded && (
        <div className="absolute bottom-full end-0 mb-1 w-64 rounded-lg border border-white/10 bg-[#060E0B]/90 p-2.5 backdrop-blur-md">
          <p className="mb-1.5 font-bold text-white/85">{t('obs.attribution.title')}</p>
          <ul className="space-y-1">
            <li>{ATTRIBUTION.imagery}</li>
            <li>{ATTRIBUTION.labels}</li>
            <li>{ATTRIBUTION.osm}</li>
            {basemap === 'standard' && <li>{ATTRIBUTION.standard}</li>}
          </ul>
        </div>
      )}
    </div>
  )
}
