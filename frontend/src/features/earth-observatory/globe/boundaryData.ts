import { isBoundaryPolygon, simplifyBoundaryGeometry } from '../utils/observatoryMath'
import type { SelectedPlace } from '../utils/observatoryMath'

/** Geographic boundary retrieval (OpenStreetMap via Nominatim).
 * Search coordinates are never treated as boundaries: every stage uses the
 * real administrative polygon of the matching feature, or falls back to an
 * elegant marker when no reliable geometry exists. */

const NOMINATIM = 'https://nominatim.openstreetmap.org'

export interface BoundaryGeometry {
  name: string
  geometry: unknown
  lat: number
  lon: number
}

export interface SelectionBoundaries {
  /** The boundary of exactly what the user picked (city, town, province or a
   * country itself) — never a different level. */
  selected: BoundaryGeometry | null
  /** True when the selection is itself a country. */
  isCountryLevel: boolean
  /** The containing country when the selection is below country level. */
  country: BoundaryGeometry | null
}

export interface GpsBoundaries {
  country: BoundaryGeometry | null
  /** City / local administrative area containing the GPS point. */
  local: BoundaryGeometry | null
}

/** Keep the country outline geographically coherent with the chosen place.
 * Some country GeoJSONs contain distant overseas territories; fitting every
 * component at once can move a city search to an unrelated ocean. Starting
 * with the component containing the place, include nearby islands/land parts
 * within 300 km (transitively), while leaving remote territories out of this
 * local country-stage view. The underlying lookup/cache data is not mutated. */
export function focusCountryGeometryNearPoint(geometry: unknown, lat: number, lon: number): unknown {
  const geo = geometry as { type?: string; coordinates?: unknown } | null
  if (geo?.type !== 'MultiPolygon' || !Array.isArray(geo.coordinates)) return geometry

  const polygons = geo.coordinates as number[][][][]
  const components = polygons.map((rings) => ({
    rings,
    bounds: polygonBounds(rings),
  }))
  const containing = components.flatMap((component, index) =>
    component.rings[0] && pointInRing([lon, lat], component.rings[0]) &&
    !component.rings.slice(1).some((hole) => pointInRing([lon, lat], hole)) ? [index] : [],
  )
  const chosen = new Set<number>(containing)
  if (chosen.size === 0) {
    let nearestIndex = -1
    let nearestDistance = Infinity
    components.forEach((component, index) => {
      const distance = pointToBoundsKm(lon, lat, component.bounds)
      if (distance < nearestDistance) {
        nearestDistance = distance
        nearestIndex = index
      }
    })
    if (nearestIndex >= 0) chosen.add(nearestIndex)
  }

  let changed = true
  while (changed) {
    changed = false
    for (let candidate = 0; candidate < components.length; candidate += 1) {
      if (chosen.has(candidate)) continue
      if ([...chosen].some((selected) => boundsDistanceKm(components[candidate].bounds, components[selected].bounds) <= 300)) {
        chosen.add(candidate)
        changed = true
      }
    }
  }

  const focused = polygons.filter((_, index) => chosen.has(index))
  return focused.length > 0 ? { type: 'MultiPolygon', coordinates: focused } : geometry
}

type GeographicBounds = [number, number, number, number]

function polygonBounds(rings: number[][][]): GeographicBounds {
  // Country rings can contain tens of thousands of vertices. Avoid spreading
  // those into Math.min/max, which exceeds the engine's argument limit on
  // large countries and aborts the journey before its first camera stage.
  let west = Infinity
  let south = Infinity
  let east = -Infinity
  let north = -Infinity
  for (const ring of rings) {
    for (const point of ring) {
      const [lon, lat] = point
      if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
      west = Math.min(west, lon)
      south = Math.min(south, lat)
      east = Math.max(east, lon)
      north = Math.max(north, lat)
    }
  }
  return [west, south, east, north]
}

function pointInRing(point: [number, number], ring: number[][]): boolean {
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    const crosses = (yi > point[1]) !== (yj > point[1]) &&
      point[0] < ((xj - xi) * (point[1] - yi)) / ((yj - yi) || Number.EPSILON) + xi
    if (crosses) inside = !inside
  }
  return inside
}

function pointToBoundsKm(lon: number, lat: number, bounds: GeographicBounds): number {
  return boundsDistanceKm([lon, lat, lon, lat], bounds)
}

function boundsDistanceKm(a: GeographicBounds, b: GeographicBounds): number {
  const latGap = Math.max(0, a[1] - b[3], b[1] - a[3])
  let lonGap = Infinity
  for (const shift of [-360, 0, 360]) {
    const shiftedWest = b[0] + shift
    const shiftedEast = b[2] + shift
    lonGap = Math.min(lonGap, Math.max(0, a[0] - shiftedEast, shiftedWest - a[2]))
  }
  const centerLat = ((a[1] + a[3] + b[1] + b[3]) / 4) * Math.PI / 180
  const dx = lonGap * 111.32 * Math.cos(centerLat)
  const dy = latGap * 111.32
  return Math.hypot(dx, dy)
}

interface NominatimRow {
  lat: string | number
  lon: string | number
  display_name?: string
  addresstype?: string
  address?: Record<string, string>
  geojson?: { type?: string; coordinates?: unknown } | null
}

/** Nominatim allows roughly one request per second per client; the queue
 * spaces calls out and retries with growing backoff so a shared-IP burst
 * cannot break the journey (a final failure just falls back to the marker). */
const MIN_REQUEST_INTERVAL_MS = 1100
const RETRY_BACKOFF_MS = [1200, 2600]
let lastRequestAt = 0

/** The search endpoint returns an array; the reverse endpoint returns a
 * single object. Both are normalized to rows so the GPS journey can read the
 * reverse result instead of silently discarding it. */
export function normalizeRows(data: unknown): NominatimRow[] {
  if (Array.isArray(data)) return data as NominatimRow[]
  if (data && typeof data === 'object') return [data as NominatimRow]
  return []
}

async function nominatim(path: string, params: Record<string, string>, signal?: AbortSignal): Promise<NominatimRow[]> {
  const call = async (): Promise<NominatimRow[]> => {
    const url = new URL(`${NOMINATIM}/${path}`)
    url.searchParams.set('format', 'jsonv2')
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
    const res = await fetch(url.toString(), { signal })
    if (!res.ok) throw new Error(`boundary lookup failed: HTTP ${res.status}`)
    const data: unknown = await res.json()
    return normalizeRows(data)
  }
  let rows: NominatimRow[] | null = null
  let lastError: unknown = null
  for (let attempt = 0; attempt <= RETRY_BACKOFF_MS.length; attempt++) {
    const gap = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestAt)
    const backoff = attempt === 0 ? 0 : RETRY_BACKOFF_MS[attempt - 1]
    const wait = Math.max(gap, backoff)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    if (signal?.aborted) throw new Error('boundary lookup aborted')
    lastRequestAt = Date.now()
    try {
      rows = await call()
      break
    } catch (error) {
      if (signal?.aborted) throw error
      lastError = error
    }
  }
  if (!rows) throw lastError ?? new Error('boundary lookup failed')
  return rows
}

/** Successful lookups are cached for the browser session: revisiting the same
 * place replays the journey instantly without spending provider quota. */
const CACHE_KEY = 'fieldshift.boundaryCache.v1'
const CACHE_TTL_MS = 30 * 60 * 1000

function cacheGet<T>(key: string): T | null {
  try {
    const raw = sessionStorage.getItem(`${CACHE_KEY}:${key}`)
    if (!raw) return null
    const entry = JSON.parse(raw) as { at: number; value: T }
    if (Date.now() - entry.at > CACHE_TTL_MS) return null
    return entry.value
  } catch {
    return null
  }
}

function cacheSet<T>(key: string, value: T): void {
  try {
    sessionStorage.setItem(`${CACHE_KEY}:${key}`, JSON.stringify({ at: Date.now(), value }))
  } catch {
    /* storage full or unavailable — the journey still works uncached */
  }
}

function nearestPolygon(rows: NominatimRow[], lat: number, lon: number): BoundaryGeometry | null {
  const bearing = rows
    .map((row) => ({ row, dist: Math.hypot(Number(row.lat) - lat, Number(row.lon) - lon) }))
    .sort((a, b) => a.dist - b.dist)
  // Prefer a row that actually carries boundary geometry; a plain point is
  // only a fallback and is reported as "no polygon".
  for (const { row } of bearing) {
    const geometry = simplifyBoundaryGeometry(row.geojson)
    if (isBoundaryPolygon(geometry)) {
      return { name: row.display_name ?? '', geometry, lat: Number(row.lat), lon: Number(row.lon) }
    }
  }
  return null
}

/** The user picked a suggestion: resolve its own real boundary plus, when the
 * selection is below country level, the containing country's boundary. */
export async function fetchSelectionBoundaries(
  query: string,
  place: SelectedPlace,
  signal?: AbortSignal,
): Promise<SelectionBoundaries> {
  const cacheKey = `sel:${query.toLowerCase()}:${place.lat.toFixed(2)}:${place.lon.toFixed(2)}`
  const cached = cacheGet<SelectionBoundaries>(cacheKey)
  if (cached) return cached

  const rows = await nominatim(
    'search',
    { q: query, limit: '5', polygon_geojson: '1', addressdetails: '1' },
    signal,
  )
  if (rows.length === 0) return { selected: null, isCountryLevel: false, country: null }

  const nearest = rows
    .map((row) => ({ row, dist: Math.hypot(Number(row.lat) - place.lat, Number(row.lon) - place.lon) }))
    .sort((a, b) => a.dist - b.dist)[0].row

  const address = nearest.address ?? {}
  const countryName = address.country ?? ''
  const countryCode = address.country_code ?? ''
  // Nominatim tags the feature class of the picked row; only a country row
  // counts as country-level so a city stage is never invented.
  const isCountryLevel = nearest.addresstype === 'country'

  const selected = nearestPolygon([nearest], place.lat, place.lon)
  if (isCountryLevel) {
    const result: SelectionBoundaries = { selected, isCountryLevel: true, country: selected }
    cacheSet(cacheKey, result)
    return result
  }

  let country: BoundaryGeometry | null = null
  let lookupFailed = false
  if (countryName && countryCode) {
    try {
      const countryRows = await nominatim(
        'search',
        { q: countryName, countrycodes: countryCode, polygon_geojson: '1', limit: '1' },
        signal,
      )
      country = nearestPolygon(countryRows, Number(countryRows[0]?.lat ?? 0), Number(countryRows[0]?.lon ?? 0))
    } catch (fetchError) {
      if (signal?.aborted) throw fetchError
      country = null
      lookupFailed = true
    }
  }
  const result: SelectionBoundaries = { selected, isCountryLevel: false, country }
  if (!lookupFailed) cacheSet(cacheKey, result)
  return result
}

/** GPS flow: reverse-geocode the authorized coordinates to find the containing
 * local administrative area (city level) and the country, both with real
 * boundaries when OSM has them. */
export async function fetchGpsBoundaries(lat: number, lon: number, signal?: AbortSignal): Promise<GpsBoundaries> {
  const cacheKey = `gps:${lat.toFixed(2)}:${lon.toFixed(2)}`
  const cached = cacheGet<GpsBoundaries>(cacheKey)
  if (cached) return cached

  const rows = await nominatim(
    'reverse',
    { lat: String(lat), lon: String(lon), zoom: '10', polygon_geojson: '1', addressdetails: '1' },
    signal,
  )
  const row = rows[0]
  if (!row) return { country: null, local: null }

  const address = row.address ?? {}
  const geometry = simplifyBoundaryGeometry(row.geojson)
  const local = isBoundaryPolygon(geometry)
    ? { name: row.display_name ?? '', geometry, lat: Number(row.lat), lon: Number(row.lon) }
    : null

  let country: BoundaryGeometry | null = null
  let lookupFailed = false
  const countryName = address.country ?? ''
  const countryCode = address.country_code ?? ''
  if (countryName && countryCode) {
    try {
      const countryRows = await nominatim(
        'search',
        { q: countryName, countrycodes: countryCode, polygon_geojson: '1', limit: '1' },
        signal,
      )
      country = nearestPolygon(countryRows, Number(countryRows[0]?.lat ?? 0), Number(countryRows[0]?.lon ?? 0))
    } catch (fetchError) {
      if (signal?.aborted) throw fetchError
      country = null
      lookupFailed = true
    }
  }
  const result: GpsBoundaries = { country, local }
  if (!lookupFailed) cacheSet(cacheKey, result)
  return result
}
