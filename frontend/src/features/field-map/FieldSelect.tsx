import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import { MapPin, Search, Radar, Loader2 } from 'lucide-react'

import { api, type FieldOut, type PlaceResult } from '../../api/client'
import { useWizard } from '../../state/wizard'

const DEFAULT_CENTER: L.LatLngExpression = [33.9, -5.55] // demo region; user can pan anywhere

type BaseMapKind = 'standard' | 'satellite'

export default function FieldSelect() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { field, setField } = useWizard()

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseLayersRef = useRef<Record<BaseMapKind, L.TileLayer> | null>(null)
  const [basemap, setBasemap] = useState<BaseMapKind>('standard')
  const [areaHa, setAreaHa] = useState<number | null>(field?.area_ha ?? null)
  const [name, setName] = useState(field?.name ?? '')
  const [searchQuery, setSearchQuery] = useState('')
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locationNote, setLocationNote] = useState<string | null>(null)

  const { data: results, isFetching: searching } = useQuery({
    queryKey: ['places', searchQuery],
    queryFn: () => api.get<{ results: PlaceResult[] }>(`/api/v1/places/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.trim().length >= 2,
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, { center: DEFAULT_CENTER, zoom: 12, zoomControl: true })
    const standard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    })
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics',
    })
    standard.addTo(map)
    baseLayersRef.current = { standard, satellite }
    mapRef.current = map

    map.pm.addControls({
      position: 'topleft',
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawText: false,
      drawPolygon: true,
      editMode: true,
      dragMode: true,
      removalMode: true,
      cutPolygon: false,
      rotateMode: false,
    })
    map.on('pm:create', (e: any) => {
      // Only one polygon at a time: remove any previous layer.
      map.eachLayer((layer) => {
        if ((layer as any).pm && (layer as any) !== e.layer) {
          try { map.removeLayer(layer) } catch { /* already removed */ }
        }
      })
      updateArea(e.layer)
      e.layer.on('pm:edit', () => updateArea(e.layer))
    })
    map.on('pm:remove', () => {
      setAreaHa(null)
    })

    return () => {
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function layerToGeoJson(layer: L.Polygon) {
    const data = layer.toGeoJSON()
    return { type: data.geometry.type, coordinates: data.geometry.coordinates }
  }

  function updateArea(layer: L.Polygon) {
    const geo = layerToGeoJson(layer)
    // Geodesic area is computed by the backend; use a client-side spherical
    // estimate for the live label, the authoritative value arrives on save.
    setAreaHa(sphericalHa(geo))
  }

  function sphericalHa(geo: { type: string; coordinates: any }): number | null {
    try {
      const rings: [number, number][][] =
        geo.type === 'Polygon' ? [geo.coordinates[0]] : geo.coordinates.map((p: any) => p[0])
      let total = 0
      const R = 6378137
      for (const ring of rings) {
        let sum = 0
        for (let i = 0; i < ring.length - 1; i++) {
          const [lon1, lat1] = ring[i]
          const [lon2, lat2] = ring[i + 1]
          sum += ((lon2 - lon1) * Math.PI) / 180 * (2 + Math.sin((lat1 * Math.PI) / 180) + Math.sin((lat2 * Math.PI) / 180))
        }
        total += Math.abs((sum * R * R) / 2)
      }
      return Math.round((total / 10000) * 100) / 100
    } catch {
      return null
    }
  }

  function switchBasemap(kind: BaseMapKind) {
    if (!mapRef.current || !baseLayersRef.current) return
    const layers = baseLayersRef.current
    if (basemap !== kind) {
      mapRef.current.removeLayer(layers[basemap])
      layers[kind].addTo(mapRef.current)
      setBasemap(kind)
    }
  }

  function flyTo(lat: number, lon: number, zoom = 14) {
    mapRef.current?.flyTo([lat, lon], zoom)
  }

  function useMyLocation() {
    setLocationNote(null)
    if (!navigator.geolocation) {
      setLocationNote(t('field.locationDenied'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.latitude, pos.coords.longitude, 14),
      () => setLocationNote(t('field.locationDenied')),
      { timeout: 8000 },
    )
  }

  function confirmField() {
    const map = mapRef.current
    if (!map || areaHa === null) return
    let geometry: { type: string; coordinates: unknown } | null = null
    map.eachLayer((layer) => {
      if ((layer as any).pm && layer instanceof L.Polygon) {
        geometry = layerToGeoJson(layer as L.Polygon)
      }
    })
    if (!geometry) {
      setGeoError(t('field.noPolygon'))
      return
    }
    setField({ name: name.trim() || t('field.defaultName'), geometry, area_ha: areaHa })
    // Create on the server; authoritative area comes back from the backend.
    api
      .post<FieldOut>('/api/v1/fields', { name: name.trim() || t('field.defaultName'), geometry })
      .then((created) => {
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        navigate(`/setup/questions?field=${created.field_id}`, {
          state: { fieldId: created.field_id, areaHa: created.area_ha },
        })
      })
      .catch((err) => setGeoError(err.message ?? t('error.generic')))
  }

  return (
    <div>
      <p className="kicker">{t('steps.field')}</p>
      <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest">{t('field.select.title')}</h1>
      <p className="mt-1 text-sm text-ink/70">{t('field.select.subtitle')}</p>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="card overflow-hidden">
          <div className="flex items-center gap-2 border-b border-line px-3 py-2">
            <button
              onClick={() => switchBasemap('standard')}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${basemap === 'standard' ? 'bg-forest text-white' : 'text-ink/70 hover:bg-forest/5'}`}
            >
              {t('field.standard')}
            </button>
            <button
              onClick={() => switchBasemap('satellite')}
              className={`rounded-full px-3 py-1 text-xs font-semibold ${basemap === 'satellite' ? 'bg-forest text-white' : 'text-ink/70 hover:bg-forest/5'}`}
            >
              {t('field.satellite')}
            </button>
            <button onClick={useMyLocation} className="ms-auto inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1 text-xs font-semibold text-ink/70 hover:bg-forest/5">
              <Radar size={14} /> {t('field.useMyLocation')}
            </button>
          </div>
          <div ref={containerRef} className="h-[420px] sm:h-[520px] w-full" />
          <p className="border-t border-line px-3 py-2 text-xs text-ink/60">{t('field.drawHint')}</p>
        </div>

        <aside className="space-y-4">
          <div className="card p-4">
            <label className="label" htmlFor="place-search">{t('field.search.placeholder')}</label>
            <div className="relative">
              <Search className="absolute top-2.5 start-3 h-4 w-4 text-ink/40" aria-hidden />
              <input
                id="place-search"
                className="input ps-9"
                placeholder={t('field.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searching && <Loader2 className="absolute top-2.5 end-3 h-4 w-4 animate-spin text-ink/40" />}
            </div>
            {results && results.results.length === 0 && searchQuery.length >= 2 && (
              <p className="mt-2 text-xs text-ink/60">{t('field.search.noResults')}</p>
            )}
            <ul className="mt-2 divide-y divide-line max-h-40 overflow-y-auto">
              {(results?.results ?? []).map((r, i) => (
                <li key={i}>
                  <button
                    className="w-full text-start px-1 py-2 text-xs hover:bg-forest/5 rounded"
                    onClick={() => flyTo(r.lat, r.lon)}
                  >
                    <span className="flex items-center gap-1.5 font-semibold text-forest"><MapPin size={12} /> <bdi>{r.display_name}</bdi></span>
                  </button>
                </li>
              ))}
            </ul>
            {locationNote && <p className="mt-2 text-xs text-amber font-medium">{locationNote}</p>}
          </div>

          <div className="card p-4 space-y-3">
            <div>
              <label className="label" htmlFor="field-name">{t('field.name')}</label>
              <input
                id="field-name"
                className="input"
                placeholder={t('field.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-lg bg-cream border border-line px-3 py-2">
              <span className="text-sm font-medium text-ink/70">{t('field.area')}</span>
              <span className="font-bold text-forest">
                {areaHa === null ? t('field.areaPending') : <><bdi>{areaHa.toLocaleString(i18n.language)}</bdi> {t('common.hectare')}</>}
              </span>
            </div>
            {geoError && <p className="text-xs font-medium text-red-600">{geoError}</p>}
            <button className="btn-primary w-full" disabled={areaHa === null} onClick={confirmField}>
              {t('field.confirm')}
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}
