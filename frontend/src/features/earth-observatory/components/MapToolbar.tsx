import { useTranslation } from 'react-i18next'
import { Info, Minus, Navigation, Pencil, PenTool, Plus, Trash2 } from 'lucide-react'

import type { MapMode } from './SatelliteFieldMap'

export interface ToolbarActions {
  zoomIn: () => void
  zoomOut: () => void
  startDrawing: () => void
  toggleEdit: () => void
  toggleRemoval: () => void
  toggleInfo: () => void
  locate: () => void
}

/** Left vertical control rail (canonical dark buttons): zoom, draw, edit,
 * delete, info, plus a locate shortcut. */
export default function MapToolbar({
  actions,
  mode,
  infoOpen,
  hasGeometry,
}: {
  actions: ToolbarActions
  mode: MapMode
  infoOpen: boolean
  hasGeometry: boolean
}) {
  const { t } = useTranslation()

  const base =
    'flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B1410]/85 text-white/85 shadow-lg backdrop-blur-md transition-all hover:bg-[#142219] hover:text-white border border-white/10'
  const active = '!bg-[#A3E635] !text-[#17352D] !border-[#A3E635]'

  const tools: { key: string; label: string; icon: typeof Plus; onClick: () => void; isActive: boolean; hidden?: boolean }[] = [
    { key: 'zoom-in', label: t('obs.map.tool.zoomIn'), icon: Plus, onClick: actions.zoomIn, isActive: false },
    { key: 'zoom-out', label: t('obs.map.tool.zoomOut'), icon: Minus, onClick: actions.zoomOut, isActive: false },
    { key: 'draw', label: t('obs.map.tool.draw'), icon: PenTool, onClick: actions.startDrawing, isActive: mode === 'draw' },
    { key: 'edit', label: t('obs.map.tool.edit'), icon: Pencil, onClick: actions.toggleEdit, isActive: mode === 'edit', hidden: !hasGeometry },
    { key: 'remove', label: t('obs.map.tool.delete'), icon: Trash2, onClick: actions.toggleRemoval, isActive: mode === 'remove', hidden: !hasGeometry },
    { key: 'info', label: t('obs.map.tool.info'), icon: Info, onClick: actions.toggleInfo, isActive: infoOpen },
  ]

  return (
    <div className="absolute start-3 top-1/2 z-20 flex -translate-y-1/2 flex-col items-center gap-2">
      {tools
        .filter((tool) => !tool.hidden)
        .map((tool) => {
          const Icon = tool.icon
          return (
            <button
              key={tool.key}
              type="button"
              onClick={tool.onClick}
              className={`${base} ${tool.isActive ? active : ''}`}
              aria-label={tool.label}
              aria-pressed={tool.isActive}
              title={tool.label}
            >
              <Icon size={17} />
            </button>
          )
        })}
      <span className="my-0.5 h-px w-6 bg-white/20" aria-hidden="true" />
      <button type="button" onClick={actions.locate} className={base} aria-label={t('field.useMyLocation')} title={t('field.useMyLocation')}>
        <Navigation size={16} />
      </button>
    </div>
  )
}

