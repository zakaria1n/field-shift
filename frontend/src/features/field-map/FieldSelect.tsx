import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import {
  MapPin,
  Search,
  Radar,
  Loader2,
  Layers,
  CheckCircle2,
  Globe2,
  ArrowRight,
  Info,
  Sparkles,
  Compass,
  Satellite,
  Maximize2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

import { api, type FieldOut, type PlaceResult } from '../../api/client'
import { useWizard } from '../../state/wizard'
import { useFieldValidation } from './useFieldValidation'

const DEFAULT_CENTER: L.LatLngExpression = [33.89, -5.55] // Meknes agricultural plateau

const DEMO_PRESETS = [
  { name: 'Meknès Valley, Morocco', nameAr: 'سهل مكناس، المغرب', lat: 33.89, lon: -5.55, zoom: 14 },
  { name: 'Gharb Basin, Morocco', nameAr: 'حوض الغرب، المغرب', lat: 34.26, lon: -5.92, zoom: 14 },
  { name: 'Taroudant, Morocco', nameAr: 'تارودانت، المغرب', lat: 30.47, lon: -8.87, zoom: 14 },
  { name: 'Nile Delta, Egypt', nameAr: 'دلتا النيل، مصر', lat: 30.85, lon: 31.05, zoom: 14 },
  { name: 'Central Valley, California', nameAr: 'الوادي المركزي، كاليفورنيا', lat: 36.74, lon: -119.78, zoom: 14 },
]

type BaseMapKind = 'standard' | 'satellite'
type ViewMode = 'globe' | 'map'

export default function FieldSelect() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { field, setField, setFieldId } = useWizard()
  const isArabic = i18n.language === 'ar'

  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<L.Map | null>(null)
  const baseLayersRef = useRef<Record<BaseMapKind, L.TileLayer> | null>(null)
  const [basemap, setBasemap] = useState<BaseMapKind>('satellite') // default to satellite for cinematic AgriTech
  const [viewMode, setViewMode] = useState<ViewMode>('globe')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [targetLocationName, setTargetLocationName] = useState('')

  const [areaHa, setAreaHa] = useState<number | null>(field?.area_ha ?? null)
  const [name, setName] = useState(field?.name ?? '')
  const [searchQuery, setSearchQuery] = useState('')
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locationNote, setLocationNote] = useState<string | null>(null)
  const [polygonCount, setPolygonCount] = useState<number>(0)
  const [selection, setSelection] = useState<object | null>(null)
  const [saving, setSaving] = useState(false)
  const locationValidation = useFieldValidation(selection)

  const { data: results, isFetching: searching } = useQuery({
    queryKey: ['places', searchQuery],
    queryFn: () => api.get<{ results: PlaceResult[] }>(`/api/v1/places/search?q=${encodeURIComponent(searchQuery)}`),
    enabled: searchQuery.trim().length >= 2,
  })

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    const map = L.map(containerRef.current, {
      center: DEFAULT_CENTER,
      zoom: 13,
      minZoom: 3,
      maxZoom: 18,
      zoomControl: true,
    })

    const standard = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxNativeZoom: 18,
      maxZoom: 18,
      attribution: '&copy; OpenStreetMap contributors',
    })
    const satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxNativeZoom: 18,
      maxZoom: 18,
      attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics',
    })

    // Default to satellite layer
    satellite.addTo(map)
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
          try { map.removeLayer(layer) } catch { /* removed */ }
        }
      })
      setPolygonCount(1)
      updateArea(e.layer)
      e.layer.on('pm:edit', () => updateArea(e.layer))
      e.layer.on('pm:change', () => updateArea(e.layer))
      e.layer.on('pm:dragend', () => updateArea(e.layer))
    })

    map.on('pm:remove', () => {
      setAreaHa(null)
      setPolygonCount(0)
      setSelection(null)
      setGeoError(null)
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
    setAreaHa(sphericalHa(geo))
    setSelection(geo)
    setGeoError(null)
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

  function flyTo(lat: number, lon: number, zoom = 14, label = '') {
    if (viewMode === 'globe') {
      setIsTransitioning(true)
      setTargetLocationName(label || `${lat.toFixed(2)}°N, ${lon.toFixed(2)}°E`)
      setTimeout(() => {
        setViewMode('map')
        setIsTransitioning(false)
        setTimeout(() => {
          mapRef.current?.invalidateSize()
          mapRef.current?.flyTo([lat, lon], zoom, { duration: 1.5 })
        }, 150)
      }, 1200)
    } else {
      mapRef.current?.flyTo([lat, lon], zoom, { duration: 1.5 })
    }
  }

  function useMyLocation() {
    setLocationNote(null)
    if (!navigator.geolocation) {
      setLocationNote(t('field.locationDenied'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => flyTo(pos.coords.latitude, pos.coords.longitude, 15, isArabic ? 'موقعي الجغرافي' : 'Current Geolocation'),
      () => setLocationNote(t('field.locationDenied')),
      { timeout: 8000 },
    )
  }

  function confirmField() {
    if (!locationValidation.canProceed || saving) return
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
    const finalName = name.trim() || t('field.defaultName')
    setSaving(true)
    api
      .post<FieldOut>('/api/v1/fields', { name: finalName, geometry })
      .then((created) => {
        setField({ name: finalName, geometry: created.geometry_geojson, area_ha: created.area_ha })
        setFieldId(created.field_id)
        queryClient.invalidateQueries({ queryKey: ['dashboard'] })
        navigate(`/setup/questions?field=${created.field_id}`, {
          state: { fieldId: created.field_id, areaHa: created.area_ha },
        })
      })
      .catch((err) => setGeoError(err.message ?? t('error.generic')))
      .finally(() => setSaving(false))
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="space-y-6"
    >
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="kicker">{t('steps.field')}</p>
            <span className="badge-glow text-[10px]">Step 1 of 5</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-forest tracking-tight">
            {t('field.select.title')}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {t('field.select.subtitle')}
          </p>
        </div>

        {/* View Mode & Preset Quick Jump Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Globe vs Map Toggle Switch */}
          <div className="flex items-center gap-1 bg-cream-warm p-0.5 rounded-full border border-line">
            <button
              type="button"
              onClick={() => setViewMode('globe')}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                viewMode === 'globe' ? 'bg-forest text-white shadow-sm' : 'text-ink-muted hover:text-forest'
              }`}
            >
              <Globe2 size={13} />
              <span>{isArabic ? 'رؤية الفضاء' : 'Globe'}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setViewMode('map')
                setTimeout(() => mapRef.current?.invalidateSize(), 150)
              }}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                viewMode === 'map' ? 'bg-forest text-white shadow-sm' : 'text-ink-muted hover:text-forest'
              }`}
            >
              <Satellite size={13} />
              <span>{isArabic ? 'خريطة الأقمار' : 'Satellite Map'}</span>
            </button>
          </div>

          {/* Preset Location Chips */}
          <div className="hidden md:flex items-center gap-1">
            {DEMO_PRESETS.slice(0, 3).map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => flyTo(p.lat, p.lon, p.zoom, isArabic ? p.nameAr : p.name)}
                className="chip hover:border-leaf hover:text-forest hover:bg-leaf-soft transition-all text-[11px] py-0.5 px-2.5"
              >
                {isArabic ? p.nameAr.split('،')[0] : p.name.split(',')[0]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* =========================================================================
          MODE 1: CINEMATIC EARTH OBSERVATORY (01_Fullscreen_Earth.png)
         ========================================================================= */}
      {viewMode === 'globe' && (
        <motion.div
          key="globe-view"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.3 }}
          className="relative rounded-3xl overflow-hidden border border-forest-line bg-[#040E0B] shadow-2xl min-h-[500px] flex flex-col justify-between"
        >
          {/* Earth Space Photographic Backdrop */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <img
              src="/assets/earth_space_bg.webp"
              alt="Planet Earth seen from space orbit"
              className="w-full h-full object-cover filter brightness-95"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#040E0B]/90 via-transparent to-[#040E0B]/80" />
          </div>

          {/* Top Location Search Pill Bar (matching 02_Location_Search.png) */}
          <div className="relative z-20 p-4 sm:p-6 max-w-xl mx-auto w-full space-y-2">
            <div className="relative flex items-center shadow-2xl rounded-2xl bg-white/95 backdrop-blur-md border border-line p-1">
              <div className="ps-3 pe-2 text-leaf flex items-center justify-center">
                {searching ? (
                  <Loader2 size={18} className="animate-spin text-leaf" />
                ) : (
                  <Search size={18} className="text-leaf" />
                )}
              </div>
              <input
                className="flex-1 bg-transparent py-2.5 px-2 text-xs sm:text-sm text-forest font-semibold outline-none placeholder:text-ink/40"
                placeholder={t('field.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button
                type="button"
                onClick={useMyLocation}
                className="btn-leaf !py-2 !px-3.5 text-xs flex items-center gap-1.5 shrink-0 shadow-sm"
              >
                <Radar size={13} />
                <span className="hidden sm:inline">{t('field.useMyLocation')}</span>
              </button>
            </div>

            {/* Live Geocoding Results Dropdown */}
            {results && results.results.length > 0 && (
              <ul className="divide-y divide-line rounded-2xl border border-line bg-white/95 backdrop-blur-md shadow-2xl max-h-56 overflow-y-auto">
                {results.results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="w-full text-start px-4 py-2.5 text-xs hover:bg-leaf/10 flex items-center gap-2.5 transition-colors"
                      onClick={() => flyTo(r.lat, r.lon, 14, r.display_name)}
                    >
                      <MapPin size={14} className="text-leaf shrink-0" />
                      <span className="font-semibold text-forest truncate"><bdi>{r.display_name}</bdi></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}

            {locationNote && (
              <p className="text-xs text-amber-soft bg-black/60 px-3 py-1.5 rounded-xl border border-amber/30 text-center">
                {locationNote}
              </p>
            )}
          </div>

          {/* Center Orbital Title Prompt */}
          <div className="relative z-10 text-center p-6 space-y-3 max-w-md mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-forest-dark/80 backdrop-blur-md px-3.5 py-1 text-xs font-mono text-mint border border-leaf/30">
              <Compass size={13} className="text-leaf animate-spin" style={{ animationDuration: '8s' }} />
              <span>Earth Observation · 35,786 km Orbit</span>
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {isArabic ? 'استكشف الأرض أو ابحث عن موقعك' : 'Explore the Earth or Search for Your Location'}
            </h2>
            <p className="text-xs text-white/70 leading-relaxed">
              {isArabic
                ? 'استخدم البحث أعلاه للتوجه نحو إقليمك، أو انقر للنزول المباشر إلى خريطة الأقمار الصناعية ورسم حدود الحقل.'
                : 'Search any agricultural zone, or enter the satellite mapping canvas to trace your parcel boundary.'}
            </p>
          </div>

          {/* Bottom Action Footer inside Globe View */}
          <div className="relative z-20 p-4 sm:p-6 flex flex-wrap items-center justify-between gap-3 bg-gradient-to-t from-[#040E0B] to-transparent">
            {/* Quick preset jumps */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-mono text-white/50">{isArabic ? 'مناطق:' : 'Presets:'}</span>
              {DEMO_PRESETS.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => flyTo(p.lat, p.lon, p.zoom, isArabic ? p.nameAr : p.name)}
                  className="rounded-xl px-2.5 py-1 bg-white/10 hover:bg-leaf hover:text-white text-white/80 text-[11px] font-mono transition-all border border-white/10"
                >
                  {isArabic ? p.nameAr.split('،')[0] : p.name.split(',')[0]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                setViewMode('map')
                setTimeout(() => mapRef.current?.invalidateSize(), 150)
              }}
              className="btn-leaf text-xs px-5 py-2.5 inline-flex items-center gap-2 shadow-lg ms-auto"
            >
              <span>{isArabic ? 'الانتقال إلى خريطة الحقل' : 'Enter Map Directly'}</span>
              <ArrowRight size={14} className="rtl:rotate-180" />
            </button>
          </div>

          {/* Cinematic Fly-In Overlay during Transition */}
          <AnimatePresence>
            {isTransitioning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#040E0B]/90 backdrop-blur-lg flex flex-col items-center justify-center p-6 text-center space-y-4"
              >
                <div className="relative flex items-center justify-center">
                  <span className="absolute h-16 w-16 rounded-full bg-leaf/30 animate-ping" />
                  <span className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-leaf text-white shadow-glow">
                    <Satellite size={24} />
                  </span>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-mint">
                    {isArabic ? 'الاقتراب من المنطقة الزراعية' : 'Approaching Geographic Region'}
                  </span>
                  <h3 className="font-display text-xl sm:text-2xl font-extrabold text-white">
                    <bdi>{targetLocationName}</bdi>
                  </h3>
                  <p className="text-xs text-white/60">
                    {isArabic ? 'جاري تحميل طبقات الأقمار الصناعية عالية الدقة...' : 'Streaming high-resolution satellite Earth tiles...'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}

      {/* =========================================================================
          MODE 2: SATELLITE MAP & FIELD DRAWING (05_Agricultural_Area_Map.png)
         ========================================================================= */}
      <div className={`grid gap-6 lg:grid-cols-12 items-start ${viewMode === 'globe' ? 'hidden' : ''}`}>
        {/* Main Map Canvas Area */}
        <div className="lg:col-span-8 card overflow-hidden border border-line shadow-card relative">
          {/* Floating Map Controls Top Bar */}
          <div className="flex items-center justify-between gap-2 p-3 bg-white/95 backdrop-blur-md border-b border-line">
            <div className="flex items-center gap-1 bg-cream-warm p-0.5 rounded-full border border-line">
              <button
                type="button"
                onClick={() => switchBasemap('satellite')}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  basemap === 'satellite' ? 'bg-forest text-white shadow-sm' : 'text-ink-muted hover:text-forest'
                }`}
              >
                <Layers size={13} />
                {t('field.satellite')}
              </button>
              <button
                type="button"
                onClick={() => switchBasemap('standard')}
                className={`flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold transition-all ${
                  basemap === 'standard' ? 'bg-forest text-white shadow-sm' : 'text-ink-muted hover:text-forest'
                }`}
              >
                <Globe2 size={13} />
                {t('field.standard')}
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                className="btn-secondary !py-1 !px-3 text-xs flex items-center gap-1.5"
              >
                <Radar size={13} className="text-leaf" />
                <span>{t('field.useMyLocation')}</span>
              </button>
            </div>
          </div>

          {/* Leaflet Map DOM Container */}
          <div ref={containerRef} className="h-[460px] sm:h-[560px] w-full" />

          {/* Map Bottom Hint Banner */}
          <div className="flex items-center justify-between gap-2 bg-gradient-to-r from-cream-warm to-white px-4 py-2.5 border-t border-line text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <Info size={14} className="text-leaf shrink-0" />
              <span>{t('field.drawHint')}</span>
            </div>
            {polygonCount > 0 && (
              <span className="badge-glow text-[11px] text-leaf-dark">
                <CheckCircle2 size={12} className="text-leaf" /> Boundary Active
              </span>
            )}
          </div>
        </div>

        {/* Right Sidebar Form */}
        <aside className="lg:col-span-4 space-y-4">
          {/* Search Location Card */}
          <div className="card p-4 space-y-2">
            <label className="label text-xs uppercase tracking-wider font-mono text-ink-light" htmlFor="place-search">
              {t('field.search.placeholder')}
            </label>
            <div className="relative flex items-center">
              <div className="absolute start-3 pointer-events-none z-10 flex items-center justify-center">
                {searching ? (
                  <Loader2 className="h-4 w-4 animate-spin text-leaf" />
                ) : (
                  <Search className="h-4 w-4 text-leaf" />
                )}
              </div>
              <input
                id="place-search"
                className="input text-xs sm:text-sm"
                style={{ paddingInlineStart: '2.5rem', paddingInlineEnd: '2.5rem' }}
                placeholder={t('field.search.placeholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute end-3 h-5 w-5 rounded-full bg-cream hover:bg-cream-warm flex items-center justify-center text-xs text-ink/50 hover:text-ink transition-colors"
                  aria-label="Clear search"
                >
                  ✕
                </button>
              )}
            </div>

            {results && results.results.length === 0 && searchQuery.length >= 2 && (
              <p className="mt-2 text-xs text-ink-light italic">{t('field.search.noResults')}</p>
            )}

            {results && results.results.length > 0 && (
              <ul className="mt-2 divide-y divide-line max-h-48 overflow-y-auto rounded-xl border border-line bg-white shadow-sm">
                {results.results.map((r, i) => (
                  <li key={i}>
                    <button
                      type="button"
                      className="w-full text-start px-3 py-2 text-xs hover:bg-forest/5 flex items-center gap-2 transition-colors"
                      onClick={() => flyTo(r.lat, r.lon, 14, r.display_name)}
                    >
                      <MapPin size={13} className="text-leaf shrink-0" />
                      <span className="font-semibold text-forest truncate"><bdi>{r.display_name}</bdi></span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {locationNote && <p className="mt-2 text-xs text-amber-dark font-medium">{locationNote}</p>}
          </div>

          {/* Parcel Details & Hectare Calculation Card (07_Confirm_Field.png) */}
          <div className="card p-5 space-y-4 bg-white">
            <div>
              <label className="label text-xs uppercase tracking-wider font-mono text-ink-light" htmlFor="field-name">
                {t('field.name')}
              </label>
              <input
                id="field-name"
                className="input font-semibold"
                placeholder={t('field.namePlaceholder')}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            {/* Geodesic Area Counter Box */}
            <div className={`rounded-2xl border p-4 transition-all duration-300 ${
              areaHa !== null
                ? 'border-leaf/40 bg-leaf-soft/50 shadow-inner'
                : 'border-line bg-cream'
            }`}>
              <span className="block text-[11px] font-bold uppercase tracking-wider text-ink-light font-mono">
                {t('field.area')}
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-forest font-mono">
                  {areaHa === null ? '—' : areaHa.toLocaleString(i18n.language)}
                </span>
                <span className="text-sm font-bold text-ink-muted">
                  {t('common.hectare')}
                </span>
              </div>
              <p className="mt-1 text-[11px] text-ink-light">
                {areaHa === null
                  ? t('field.areaPending')
                  : isArabic
                    ? 'المساحة الجيوديسية محسوبة بدقة على السطح الإهليلجي للأرض (WGS84).'
                    : 'Geodesic area calculated across WGS84 Earth ellipsoid.'}
              </p>
            </div>

            {selection && !locationValidation.canProceed && (
              <div role="status" aria-live="polite" data-testid="field-validation" className="rounded-xl border border-amber/40 bg-amber-soft p-3 text-sm">
                {locationValidation.pending ? t('field.validation.checking') : t(`field.validation.${locationValidation.messageKey}`)}
                {!locationValidation.pending && !locationValidation.canProceed && <button type="button" className="btn-secondary mt-2" onClick={locationValidation.retry}>{t('common.retry')}</button>}
              </div>
            )}
            {geoError && (
              <p className="text-xs font-semibold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                {geoError}
              </p>
            )}

            {/* Confirm Field CTA */}
            <button
              type="button"
              className="btn-leaf w-full py-3.5 text-sm shadow-md"
              disabled={areaHa === null || !locationValidation.canProceed || saving}
              onClick={confirmField}
            >
              <span>{t('field.confirm')}</span>
              <ArrowRight className="rtl:rotate-180" size={17} />
            </button>
          </div>
        </aside>
      </div>
    </motion.div>
  )
}
