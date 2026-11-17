import { FLIGHT_DURATIONS, FLIGHT_ZOOMS, REDUCED_FLIGHT_DURATIONS } from '../config/observatory'
import type { BoundaryGeometry } from './boundaryData'
import { boundsOfGeometry, zoomToFitBounds, type TracePlan } from './geometryTrace'

export interface JourneyViewport {
  width: number
  height: number
}

/** The cinematic journey is a list of stages executed in order:
 * fly → progressive boundary trace → fade → fly → trace → handoff. */

export type JourneyStage =
  | { kind: 'fly'; lat: number; lon: number; zoom: number; durationMs: number; countryBounds?: [number, number, number, number] }
  | { kind: 'trace'; plan: TracePlan; durationMs: number; zoomDrift: number | null; geometry: unknown }
  | { kind: 'dimTrace'; opacity: number; durationMs: number }
  | { kind: 'fadeTrace'; durationMs: number }
  | { kind: 'marker'; lat: number; lon: number; durationMs: number }

export interface SearchJourneyInput {
  isCountryLevel: boolean
  country: BoundaryGeometry | null
  selected: BoundaryGeometry | null
  selectedPlace: { lat: number; lon: number }
  countryPlan: TracePlan | null
  selectedPlan: TracePlan | null
  reducedMotion: boolean
  viewport: JourneyViewport
}

interface CountryFraming {
  lat: number
  lon: number
  zoom: number
}

/** Frame the WHOLE country at the first country-level camera position so the
 * outline draws fully on screen; derived from the real geometry bounds. */
function frameCountry(country: BoundaryGeometry | null, viewport: JourneyViewport): CountryFraming {
  const bounds = country ? boundsOfGeometry(country.geometry) : null
  if (!bounds) {
    return { lat: country?.lat ?? 0, lon: country?.lon ?? 0, zoom: FLIGHT_ZOOMS.country }
  }
  const [west, south, east, north] = bounds
  return {
    lat: (south + north) / 2,
    lon: (west + east) / 2,
    zoom: zoomToFitBounds(west, south, east, north, viewport.width, viewport.height),
  }
}

/** Search flow stages. A country selection never invents a city stage; a
 * city selection draws the country during approach, then its own boundary.
 * Without reliable boundary geometry a precise marker stands in. */
export function buildSearchJourney(input: SearchJourneyInput): JourneyStage[] {
  const durations = input.reducedMotion ? REDUCED_FLIGHT_DURATIONS : FLIGHT_DURATIONS
  const traceMs = input.reducedMotion ? 400 : 2500
  const stages: JourneyStage[] = []

  const country = input.country
  const framing = frameCountry(country, input.viewport)
  const approach = country ?? input.selected
  if (approach) {
    const countryBounds = country ? boundsOfGeometry(country.geometry) ?? undefined : undefined
    stages.push({
      kind: 'fly',
      lat: approach === country ? framing.lat : approach.lat,
      lon: approach === country ? framing.lon : approach.lon,
      zoom: approach === country ? framing.zoom : FLIGHT_ZOOMS.country,
      durationMs: durations.country,
      ...(approach === country && countryBounds ? { countryBounds } : {}),
    })
  }
  if (input.countryPlan) {
    // The whole country is framed: draw the outline completely on screen
    // before any closer zoom.
    stages.push({
      kind: 'trace',
      plan: input.countryPlan,
      durationMs: traceMs,
      zoomDrift: null,
      geometry: input.country?.geometry ?? null,
    })
  }

  if (!input.isCountryLevel) {
    // The country outline stays on screen (dimmed) while the camera dives
    // toward the selected place, mirroring the city trace that follows.
    if (input.countryPlan) stages.push({ kind: 'dimTrace', opacity: 0.3, durationMs: 500 })
    stages.push({
      kind: 'fly',
      lat: input.selectedPlace.lat,
      lon: input.selectedPlace.lon,
      zoom: FLIGHT_ZOOMS.city,
      durationMs: durations.city,
    })
    if (input.selectedPlan) {
      stages.push({
        kind: 'trace',
        plan: input.selectedPlan,
        durationMs: Math.max(300, traceMs - 300),
        zoomDrift: input.reducedMotion ? null : 0.6,
        geometry: input.selected?.geometry ?? null,
      })
      stages.push({ kind: 'fadeTrace', durationMs: 550 })
    } else {
      stages.push({
        kind: 'marker',
        lat: input.selectedPlace.lat,
        lon: input.selectedPlace.lon,
        durationMs: input.reducedMotion ? 300 : 1400,
      })
      stages.push({ kind: 'fadeTrace', durationMs: 550 })
    }
  }

  stages.push({
    kind: 'fly',
    lat: input.selectedPlace.lat,
    lon: input.selectedPlace.lon,
    zoom: FLIGHT_ZOOMS.arrive,
    durationMs: durations.arrive,
  })
  return stages
}

export interface GpsJourneyInput {
  gps: { lat: number; lon: number }
  country: BoundaryGeometry | null
  local: BoundaryGeometry | null
  countryPlan: TracePlan | null
  localPlan: TracePlan | null
  reducedMotion: boolean
  viewport: JourneyViewport
}

/** GPS flow stages: country outline → local area outline (when OSM has one)
 * → exact GPS position → pulsing precise marker → map handoff. */
export function buildGpsJourney(input: GpsJourneyInput): JourneyStage[] {
  const durations = input.reducedMotion ? REDUCED_FLIGHT_DURATIONS : FLIGHT_DURATIONS
  const traceMs = input.reducedMotion ? 400 : 2500
  const stages: JourneyStage[] = []

  const gpsCountryFraming = input.country ? frameCountry(input.country, input.viewport) : null
  if (input.country) {
    const countryBounds = boundsOfGeometry(input.country.geometry) ?? undefined
    stages.push({
      kind: 'fly',
      lat: gpsCountryFraming!.lat,
      lon: gpsCountryFraming!.lon,
      zoom: gpsCountryFraming!.zoom,
      durationMs: durations.country,
      ...(countryBounds ? { countryBounds } : {}),
    })
    if (input.countryPlan) {
      stages.push({
        kind: 'trace',
        plan: input.countryPlan,
        durationMs: traceMs,
        zoomDrift: null,
        geometry: input.country.geometry,
      })
      stages.push({ kind: 'dimTrace', opacity: 0.3, durationMs: 500 })
    }
  } else {
    // Nothing resolvable around the GPS point: still approach in stages
    // instead of dropping straight onto the parcel view.
    stages.push({
      kind: 'fly',
      lat: input.gps.lat,
      lon: input.gps.lon,
      zoom: FLIGHT_ZOOMS.country,
      durationMs: durations.country,
    })
  }

  if (input.local && input.localPlan) {
    stages.push({
      kind: 'fly',
      lat: input.local.lat,
      lon: input.local.lon,
      zoom: FLIGHT_ZOOMS.city,
      durationMs: durations.city,
    })
    stages.push({
      kind: 'trace',
      plan: input.localPlan,
      durationMs: Math.max(300, traceMs - 300),
      zoomDrift: input.reducedMotion ? null : 0.6,
      geometry: input.local.geometry,
    })
    stages.push({ kind: 'fadeTrace', durationMs: 550 })
  }

  stages.push({
    kind: 'fly',
    lat: input.gps.lat,
    lon: input.gps.lon,
    zoom: 13.2,
    durationMs: input.local ? durations.arrive : durations.city,
  })
  stages.push({ kind: 'marker', lat: input.gps.lat, lon: input.gps.lon, durationMs: input.reducedMotion ? 300 : 1600 })
  return stages
}
