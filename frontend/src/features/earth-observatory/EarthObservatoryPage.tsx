import { useCallback, Suspense, lazy, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import type { Map as MapLibreMap } from 'maplibre-gl'
import { MapPin, Navigation, PenTool, MousePointerClick, Satellite, Map as MapIcon } from 'lucide-react'
import { motion } from 'framer-motion'

import { api, type FieldOut } from '../../api/client'
import { useWizard } from '../../state/wizard'
import { useFieldValidation } from '../field-map/useFieldValidation'
import { FLIGHT_ZOOMS, MAP_DEFAULT, MAP_DRAW_ZOOM } from './config/observatory'
import { fetchSelectionBoundaries, fetchGpsBoundaries, focusCountryGeometryNearPoint, type SelectionBoundaries } from './globe/boundaryData'
import { runJourney, createBoundaryDirector, type FlightPhase, type BoundaryDirector } from './globe/flight'
import { buildSearchJourney, buildGpsJourney } from './globe/journeyPlan'
import { buildTracePlan } from './globe/geometryTrace'
import { usePrefersReducedMotion } from './hooks/usePrefersReducedMotion'
import {
  countryFromDisplayName,
  leafletZoomForGlobeZoom,
  polygonAreaHa,
  type SelectedPlace,
} from './utils/observatoryMath'
import ObservatoryNavbar from './components/ObservatoryNavbar'
import AttributionBadge from './components/AttributionBadge'
import MapToolbar from './components/MapToolbar'
import MapToolbarInfo from './components/MapToolbarInfo'
import FieldConfirmation from './components/FieldConfirmation'
import type { MapGeometry, MapMode, MapView, SatelliteMapHandle } from './components/SatelliteFieldMap'

// The 3D engines are code-split: maplibre only loads when the globe renders,
// leaflet/geoman only when the drawing map mounts.
const GlobeViewer = lazy(() => import('./components/GlobeViewer'))
const SatelliteFieldMap = lazy(() => import('./components/SatelliteFieldMap'))

type PagePhase = 'earth' | 'handoff' | 'map'

const TRANSITION_DURATION = { globe: 0.85, map: 0.85 }

export default function EarthObservatoryPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { setField, setFieldId } = useWizard()
  const isArabic = i18n.language === 'ar'
  const reducedMotion = usePrefersReducedMotion()

  // ----- journey state
  const [phase, setPhase] = useState<PagePhase>('earth')
  const [flightPhase, setFlightPhase] = useState<FlightPhase | null>(null)
  const [selected, setSelected] = useState<SelectedPlace | null>(null)
  const [boundaryKind, setBoundaryKind] = useState<'polygon' | 'point' | null>(null)
  const [findingLocation, setFindingLocation] = useState(false)
  const [mapMounted, setMapMounted] = useState(false)
  const [mapTarget, setMapTarget] = useState<MapView & { settleTo?: number }>(MAP_DEFAULT)
  const [prewarmAt, setPrewarmAt] = useState<MapView | null>(null)

  // ----- map stage state
  const mapApiRef = useRef<SatelliteMapHandle | null>(null)
  const globeMapRef = useRef<MapLibreMap | null>(null)
  const directorRef = useRef<BoundaryDirector | null>(null)
  const journeyTokenRef = useRef(0)
  const pendingJourneyRef = useRef<(() => void) | null>(null)
  const [basemap, setBasemap] = useState<'satellite' | 'standard'>('satellite')
  const [selection, setSelection] = useState<MapGeometry | null>(null)
  const [areaHa, setAreaHa] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [mode, setMode] = useState<MapMode>(null)
  const [drawingActive, setDrawingActive] = useState(false)
  const [infoOpen, setInfoOpen] = useState(false)
  const [geoError, setGeoError] = useState<string | null>(null)
  const [locationNote, setLocationNote] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const locationValidation = useFieldValidation(selection)

  const applyGeometry = useCallback((geometry: MapGeometry | null) => {
    setSelection(geometry)
    setAreaHa(geometry ? polygonAreaHa(geometry) : null)
    setGeoError(null)
  }, [])

  // ----- globe wiring
  const handleGlobeReady = useCallback((map: MapLibreMap) => {
    globeMapRef.current = map
    directorRef.current = createBoundaryDirector(map)
    const pending = pendingJourneyRef.current
    if (pending) {
      pendingJourneyRef.current = null
      pending()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleGlobeUnsupported = useCallback(() => {
    setMapTarget(MAP_DEFAULT)
    setMapMounted(true)
    setPhase('map')
    setLocationNote((current) => current ?? t('obs.webglFallback'))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t])

  // A journey token cancels the previous journey's flights, traces and fades
  // the moment a new search or geolocation request begins.
  function beginJourney(map: MapLibreMap) {
    const token = ++journeyTokenRef.current
    map.stop()
    directorRef.current?.clearAll()
    const cancel = { isCancelled: () => journeyTokenRef.current !== token }
    return { token, cancel }
  }

  // ----- search: Earth → country trace → city trace → map handoff
  async function startJourney(query: string, place: SelectedPlace) {
    setSelected(place)
    setFlightPhase(null)
    setBoundaryKind(null)
    setLocationNote(null)

    const map = globeMapRef.current
    if (!map) {
      pendingJourneyRef.current = () => void startJourney(query, place)
      return
    }
    const { cancel } = beginJourney(map)
    setFindingLocation(true)

    let resolved: SelectionBoundaries = { selected: null, isCountryLevel: false, country: null }
    try {
      resolved = await fetchSelectionBoundaries(query, place)
    } catch {
      /* geocoding unavailable → graceful marker fallback, journey continues */
    }
    setFindingLocation(false)
    if (cancel.isCancelled() || globeMapRef.current !== map) {
      // A newer search took over: drop this journey's caption cleanly.
      setFlightPhase(null)
      return
    }

    setBoundaryKind(resolved.selected ? 'polygon' : 'point')
    // The destination is known: prewarm farm-scale imagery for it while the
    // cinematic flight is still in progress, so the handoff reveals a loaded map.
    setPrewarmAt({ center: [place.lat, place.lon], zoom: MAP_DRAW_ZOOM })
    setMapMounted(true)
    const director = directorRef.current
    if (!director) return
    const countryForJourney = resolved.country
      ? { ...resolved.country, geometry: focusCountryGeometryNearPoint(resolved.country.geometry, place.lat, place.lon) }
      : null
    const stages = buildSearchJourney({
      isCountryLevel: resolved.isCountryLevel,
      country: countryForJourney,
      selected: resolved.selected,
      selectedPlace: place,
      countryPlan: countryForJourney ? buildTracePlan(countryForJourney.geometry) : null,
      selectedPlan: resolved.selected ? buildTracePlan(resolved.selected.geometry) : null,
      reducedMotion,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    })

    const completed = await runJourney(map, director, stages, { onPhase: setFlightPhase }, cancel)
    if (!completed || cancel.isCancelled() || globeMapRef.current !== map) {
      setFlightPhase(null)
      return
    }
    beginHandoff({
      center: [place.lat, place.lon],
      zoom: leafletZoomForGlobeZoom(FLIGHT_ZOOMS.arrive),
      settleTo: MAP_DRAW_ZOOM,
    })
  }

  // ----- GPS: reverse geocode → country trace → local trace → exact position
  function runGpsJourney(lat: number, lon: number) {
    const place: SelectedPlace = {
      lat,
      lon,
      displayName: isArabic ? 'موقعي الجغرافي' : 'Current location',
    }
    setSelected(place)
    setFlightPhase(null)
    setBoundaryKind('point')
    setLocationNote(null)

    const map = globeMapRef.current
    if (!map) {
      pendingJourneyRef.current = () => runGpsJourney(lat, lon)
      return
    }
    const { cancel } = beginJourney(map)
    // The authorized GPS coordinates are the destination: prewarm immediately,
    // in parallel with the reverse geocoding.
    setPrewarmAt({ center: [lat, lon], zoom: MAP_DRAW_ZOOM })
    setMapMounted(true)
    setFindingLocation(true)

    void (async () => {
      let gps: { country: SelectionBoundaries['country']; local: SelectionBoundaries['selected'] } = {
        country: null,
        local: null,
      }
      try {
        gps = await fetchGpsBoundaries(lat, lon)
      } catch {
        /* reverse geocoding unavailable → fly straight to the real GPS point */
      }
      setFindingLocation(false)
      if (cancel.isCancelled() || globeMapRef.current !== map) return
      setBoundaryKind(gps.local ? 'polygon' : 'point')

      const director = directorRef.current
      if (!director) return
      const countryForJourney = gps.country
        ? { ...gps.country, geometry: focusCountryGeometryNearPoint(gps.country.geometry, lat, lon) }
        : null
      const stages = buildGpsJourney({
        gps: { lat, lon },
        country: countryForJourney,
        local: gps.local,
        countryPlan: countryForJourney ? buildTracePlan(countryForJourney.geometry) : null,
        localPlan: gps.local ? buildTracePlan(gps.local.geometry) : null,
        reducedMotion,
        viewport: { width: window.innerWidth, height: window.innerHeight },
      })

      const completed = await runJourney(map, director, stages, { onPhase: setFlightPhase }, cancel)
      if (!completed || cancel.isCancelled() || globeMapRef.current !== map) {
        setFlightPhase(null)
        return
      }
      beginHandoff({
        center: [lat, lon],
        zoom: leafletZoomForGlobeZoom(13.2),
        settleTo: MAP_DRAW_ZOOM,
      })
    })()
  }

  function beginHandoff(target: { center: [number, number]; zoom: number; settleTo?: number }) {
    setMapTarget(target)
    setMapMounted(true)
    setPhase('handoff')
    const duration = reducedMotion ? 300 : 850
    setTimeout(() => setPhase('map'), duration + 60)
  }

  function enterMapDirectly() {
    journeyTokenRef.current += 1
    setSelected(null)
    setFlightPhase(null)
    beginHandoff(MAP_DEFAULT)
  }

  function useMyLocation() {
    setLocationNote(null)
    if (!navigator.geolocation) {
      setLocationNote(t('obs.location.error'))
      return
    }
    setFindingLocation(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setFindingLocation(false)
        if (phase === 'map') {
          const place: SelectedPlace = {
            lat: pos.coords.latitude,
            lon: pos.coords.longitude,
            displayName: isArabic ? 'موقعي الجغرافي' : 'Current location',
          }
          setSelected(place)
          mapApiRef.current?.clearModes()
          mapApiRef.current?.flyTo(place.lat, place.lon, 15)
          return
        }
        runGpsJourney(pos.coords.latitude, pos.coords.longitude)
      },
      () => {
        setFindingLocation(false)
        setLocationNote(t('obs.location.error'))
      },
      { timeout: 8000, maximumAge: 60000 },
    )
  }

  // ----- search selection (works on the globe and inside the map stage)
  function handleSelectPlace(query: string, place: SelectedPlace) {
    if (phase === 'map') {
      setSelected(place)
      mapApiRef.current?.clearModes()
      mapApiRef.current?.flyTo(place.lat, place.lon, 13.5)
      return
    }
    void startJourney(query, place)
  }

  // After the handoff, settle gently to the farm-scale zoom for drawing.
  useEffect(() => {
    if (phase !== 'map' || !mapTarget.settleTo) return
    const { center, settleTo } = mapTarget
    const timer = setTimeout(() => mapApiRef.current?.flyTo(center[0], center[1], settleTo), 350)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

  // ----- confirm field (unchanged backend contract)
  function confirmField() {
    if (!locationValidation.canProceed || saving) return
    const geometry = selection
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
          state: { fieldId: created.field_id, areaHa: created.area_ha, fieldTransition: true },
        })
      })
      .catch((err) => setGeoError(err.message ?? t('error.generic')))
      .finally(() => setSaving(false))
  }

  // ----- flight captions (03/04 references)
  const countryName = selected ? countryFromDisplayName(selected.displayName) : ''
  let caption: string | null = null
  if (findingLocation) caption = t('obs.caption.finding')
  else if (flightPhase === 'country' || flightPhase === 'city') caption = t('obs.caption.flight', { name: countryName })
  else if (flightPhase === 'arriving') caption = t('obs.caption.arriving')
  else if (phase === 'earth' && !flightPhase) caption = t('obs.caption.explore')

  const hintKey = drawingActive
    ? 'obs.map.hintDraw'
    : selection
      ? 'obs.map.hintAdjust'
      : 'obs.map.hintTrace'

  return (
    <div className="earth-observatory relative h-[100svh] w-full overflow-hidden bg-[#04070C]" data-testid="observatory-root" data-flight-phase={flightPhase ?? 'idle'} data-page-phase={phase}>
      {/* ---- Layer 1: 3D globe (fades out during the handoff) */}
      {phase !== 'map' && (
        <motion.div
          className="absolute inset-0"
          animate={{ opacity: phase === 'handoff' ? 0 : 1 }}
          transition={{ duration: TRANSITION_DURATION.globe, ease: 'easeInOut' }}
          style={{ pointerEvents: phase === 'handoff' ? 'none' : 'auto' }}
        >
          <Suspense fallback={<div className="absolute inset-0" />}>
            <GlobeViewer onReady={handleGlobeReady} onUnsupported={handleGlobeUnsupported} />
          </Suspense>
        </motion.div>
      )}

      {/* ---- Layer 2: drawing map (mounts at handoff start, fades in) */}
      {mapMounted && (
        <motion.div
          className="absolute inset-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: phase === 'earth' ? 0 : 1 }}
          transition={{ duration: TRANSITION_DURATION.map, ease: 'easeInOut' }}
          style={{ pointerEvents: phase === 'map' ? 'auto' : 'none' }}
        >
          <Suspense fallback={<div className="absolute inset-0" />}>
            <SatelliteFieldMap
              ref={mapApiRef}
              view={mapTarget}
              prewarmAt={prewarmAt}
              basemap={basemap}
              onGeometryChange={applyGeometry}
              onDrawingActiveChange={setDrawingActive}
              onModeChange={setMode}
            />
          </Suspense>
        </motion.div>
      )}

      {/* ---- Top bar: logo + search + language (both stages) */}
      <ObservatoryNavbar
        onSelectPlace={handleSelectPlace}
        onUseLocation={useMyLocation}
        searchingLocation={findingLocation}
      />

      {/* ---- Globe stage chrome */}
      {phase === 'earth' && (
        <div className="pointer-events-none absolute inset-0 z-20 flex flex-col">
          <p className="mx-auto mt-[4.6rem] px-4 text-center text-xs font-medium text-white/85 sm:text-sm" data-testid="search-hint">
            {t('obs.search.hint')}
          </p>

          <div className="mt-auto pb-10 text-center">
            {/* Region badge during arrival (04_Approaching_Taroudant.png) */}
            {selected && flightPhase === 'arriving' && (
              <motion.span
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mx-auto mb-24 inline-flex items-center gap-2 rounded-full bg-[#0B1410]/85 px-4 py-2 text-sm font-bold text-white shadow-2xl backdrop-blur-md"
                data-testid="place-badge"
              >
                <MapPin size={15} className="text-[#A3E635]" />
                <bdi>{selected.displayName}</bdi>
              </motion.span>
            )}

            {caption && (
              <motion.p
                key={caption}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-lg italic text-white/90 sm:text-xl"
                data-testid="journey-caption"
              >
                {caption}
              </motion.p>
            )}
            <span className="mx-auto mt-3 block h-1 w-16 rounded-full bg-[#8FE627]" aria-hidden="true" />

            {!flightPhase && !findingLocation && (
              <div className="pointer-events-auto mx-auto mt-6 flex flex-col items-center gap-2">
                <button
                  type="button"
                  onClick={useMyLocation}
                  className="inline-flex items-center gap-2 rounded-full border border-[#A3E635]/45 bg-[#0B1410]/85 px-5 py-2.5 text-sm font-bold text-white shadow-lg backdrop-blur-md transition-colors hover:border-[#A3E635] hover:bg-[#142219]"
                  data-testid="use-my-location-primary"
                >
                  <Navigation size={15} className="text-[#A3E635]" />
                  {t('obs.location.primary')}
                </button>
                <button
                  type="button"
                  onClick={enterMapDirectly}
                  className="text-[11px] font-semibold text-white/55 underline underline-offset-4 transition-colors hover:text-white/85"
                >
                  {t('obs.enterMap')}
                </button>
              </div>
            )}
          </div>

          {boundaryKind === 'point' && selected && flightPhase !== null && (
            <p className="absolute inset-x-0 top-1/3 text-center text-xs font-semibold text-white/70">
              {t('obs.caption.noBoundary')}
            </p>
          )}

          {locationNote && (
            <p className="absolute inset-x-0 top-24 mx-auto w-fit max-w-[90vw] rounded-xl border border-amber/40 bg-black/70 px-4 py-2 text-center text-xs font-semibold text-amber-soft backdrop-blur-md">
              {locationNote}
            </p>
          )}
        </div>
      )}

      {/* ---- Map stage chrome */}
      {phase === 'map' && (
        <>
          {selected && (
            <span
              className="absolute start-4 top-[4.9rem] z-20 inline-flex max-w-[300px] items-center gap-2 rounded-full bg-[#0B1410]/85 px-3.5 py-1.5 text-xs font-bold text-white shadow-lg backdrop-blur-md sm:start-6"
              data-testid="map-place-badge"
            >
              <MapPin size={13} className="shrink-0 text-[#A3E635]" />
              <bdi className="truncate">{selected.displayName.split(',')[0]}</bdi>
            </span>
          )}

          {/* Location + basemap pills (05_Agricultural_Area_Map.png) */}
          <div className="pointer-events-none absolute inset-x-0 top-[4.8rem] z-20 flex justify-center">
            <div className="pointer-events-auto flex items-center gap-2">
              <button
                type="button"
                onClick={useMyLocation}
                className="inline-flex items-center gap-2 rounded-full bg-[#0B1410]/85 px-4 py-2 text-xs font-bold text-white shadow-lg backdrop-blur-md transition-colors hover:bg-[#142219]"
              >
                <Navigation size={13} className="text-[#A3E635]" />
                {t('field.useMyLocation')}
              </button>
              <span className="h-5 w-px bg-white/25" aria-hidden="true" />
              <div className="flex items-center rounded-full bg-white p-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => setBasemap('satellite')}
                  aria-pressed={basemap === 'satellite'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    basemap === 'satellite' ? 'bg-[#A3E635] text-[#17352D]' : 'text-[#4A6359] hover:text-[#17352D]'
                  }`}
                >
                  <Satellite size={13} />
                  {t('field.satellite')}
                </button>
                <button
                  type="button"
                  onClick={() => setBasemap('standard')}
                  aria-pressed={basemap === 'standard'}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${
                    basemap === 'standard' ? 'bg-[#A3E635] text-[#17352D]' : 'text-[#4A6359] hover:text-[#17352D]'
                  }`}
                >
                  <MapIcon size={13} />
                  {t('field.standard')}
                </button>
              </div>
            </div>
          </div>

          <MapToolbar
            actions={{
              zoomIn: () => mapApiRef.current?.zoomIn(),
              zoomOut: () => mapApiRef.current?.zoomOut(),
              startDrawing: () => {
                mapApiRef.current?.startDrawing()
                setInfoOpen(false)
              },
              toggleEdit: () => { mapApiRef.current?.toggleEdit() },
              toggleRemoval: () => { mapApiRef.current?.toggleRemoval() },
              toggleInfo: () => setInfoOpen((open) => !open),
              locate: useMyLocation,
            }}
            mode={mode}
            infoOpen={infoOpen}
            hasGeometry={Boolean(selection)}
          />
          <MapToolbarInfo open={infoOpen} onClose={() => setInfoOpen(false)} />

          {/* Bottom instruction pill (05/06 references) */}
          <div className="pointer-events-none absolute inset-x-0 bottom-6 z-20 flex justify-center">
            <span
              className="inline-flex items-center gap-2.5 rounded-full bg-[#0B1410]/85 px-5 py-2.5 text-sm font-bold text-white shadow-2xl backdrop-blur-md"
              data-testid="drawing-hint"
            >
              {drawingActive ? (
                <MousePointerClick size={16} className="text-[#A3E635]" />
              ) : (
                <PenTool size={16} className="text-[#A3E635]" />
              )}
              {t(hintKey)}
            </span>
          </div>

          {selection && (
            <FieldConfirmation
              name={name}
              onNameChange={setName}
              areaHa={areaHa}
              validation={locationValidation.validation}
              validationPending={locationValidation.pending}
              validationMessageKey={locationValidation.messageKey}
              onValidationRetry={locationValidation.retry}
              error={geoError}
              saving={saving}
              canConfirm={areaHa !== null && locationValidation.canProceed && !saving}
              onConfirm={confirmField}
            />
          )}

          {locationNote && (
            <p className="absolute inset-x-0 top-32 z-30 mx-auto w-fit max-w-[90vw] rounded-xl border border-amber/40 bg-black/70 px-4 py-2 text-center text-xs font-semibold text-amber-soft backdrop-blur-md">
              {locationNote}
            </p>
          )}
        </>
      )}

      {/* ---- Single provider-credit control for both engines */}
      <AttributionBadge basemap={phase === 'map' ? basemap : 'satellite'} />
    </div>
  )
}
