/** Progressive boundary tracing on real geographic geometry.
 *
 * A polygon boundary is flattened into its rings; the rings are then traced
 * one after another (exterior first, holes after, islands in order) so the
 * luminous line draws continuously around the shape. The planner pre-slices
 * every animation frame as real GeoJSON, so rendering stays anchored to the
 * globe surface — no screen-space tricks. */

export type Ring = [number, number][]

export interface TracePlan {
  /** frames[k] is the boundary revealed up to progress k/steps (GeoJSON
   * LineString collection, rings drawn in order). */
  frames: GeoJSON.FeatureCollection[]
  /** headTrack[k] is the exact tip coordinate of frame k. */
  headTrack: [number, number][]
  steps: number
}

/** Geographic bbox [west, south, east, north] of any traced geometry. */
export function boundsOfGeometry(geometry: unknown): [number, number, number, number] | null {
  const rings = flattenRings(geometry)
  if (rings.length === 0) return null
  let south = 90
  let north = -90
  const longitudes: number[] = []
  for (const ring of rings) {
    for (const [lon, lat] of ring) {
      longitudes.push(normalizeLongitude360(lon))
      if (lat < south) south = lat
      if (lat > north) north = lat
    }
  }
  // Use the smallest circular interval. Ordinary min/max makes countries
  // crossing ±180° appear almost world-wide (for example Russia or Fiji).
  longitudes.sort((a, b) => a - b)
  let largestGap = -1
  let gapAfter = 0
  for (let index = 0; index < longitudes.length; index += 1) {
    const current = longitudes[index]
    const next = index === longitudes.length - 1 ? longitudes[0] + 360 : longitudes[index + 1]
    const gap = next - current
    if (gap > largestGap) {
      largestGap = gap
      gapAfter = index
    }
  }
  const west = normalizeLongitude180(longitudes[(gapAfter + 1) % longitudes.length])
  let east = normalizeLongitude180(longitudes[gapAfter])
  if (east < west) east += 360
  return [west, south, east, north]
}

function normalizeLongitude360(longitude: number): number {
  return ((longitude % 360) + 360) % 360
}

function normalizeLongitude180(longitude: number): number {
  const normalized = ((longitude + 180) % 360 + 360) % 360 - 180
  return normalized === -180 && longitude > 0 ? 180 : normalized
}

function mercatorY(lat: number): number {
  const phi = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180
  return (1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2
}

/** Zoom that frames the bounds inside the viewport with comfortable padding.
 * Derived from the real geometry, so every country gets its own altitude. */
export function zoomToFitBounds(
  west: number,
  south: number,
  east: number,
  north: number,
  viewportWidth: number,
  viewportHeight: number,
  fill = 0.62,
): number {
  const worldPx = 512
  const spanX = Math.max(1e-6, Math.abs(east - west) / 360)
  const spanY = Math.max(1e-6, Math.abs(mercatorY(north) - mercatorY(south)))
  const zoomX = Math.log2((viewportWidth * fill) / (spanX * worldPx))
  const zoomY = Math.log2((viewportHeight * fill) / (spanY * worldPx))
  return Math.max(2.2, Math.min(6.4, Math.min(zoomX, zoomY)))
}

export function easeInOutCubic(t: number): number {
  const x = Math.min(1, Math.max(0, t))
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2
}

/** All rings of a Polygon/MultiPolygon in drawing order. */
export function flattenRings(geometry: unknown): Ring[] {
  if (!geometry || typeof geometry !== 'object') return []
  const geo = geometry as { type?: string; coordinates?: unknown }
  if (geo.type === 'Polygon' && Array.isArray(geo.coordinates)) {
    return (geo.coordinates as number[][][]).map((ring) => toRing(ring))
  }
  if (geo.type === 'MultiPolygon' && Array.isArray(geo.coordinates)) {
    return (geo.coordinates as number[][][][]).flatMap((polygon) =>
      (polygon as number[][][]).map((ring) => toRing(ring)),
    )
  }
  return []
}

function toRing(raw: number[][]): Ring {
  const ring: Ring = []
  for (const point of raw) {
    if (!Array.isArray(point) || point.length < 2) continue
    const lon = Number(point[0])
    const lat = Number(point[1])
    if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue
    const last = ring[ring.length - 1]
    if (last && last[0] === lon && last[1] === lat) continue
    ring.push([lon, lat])
  }
  if (ring.length > 2) {
    const first = ring[0]
    const last = ring[ring.length - 1]
    if (first[0] === last[0] && first[1] === last[1]) ring.pop()
    if (ring.length > 2) ring.push([first[0], first[1]])
  }
  return ring
}

function ringLengths(rings: Ring[]): number[] {
  return rings.map((ring) => {
    let total = 0
    for (let i = 1; i < ring.length; i++) {
      total += Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1])
    }
    return total
  })
}

/** Coordinate at distance `at` along the ring (planar interpolation). */
function pointAtDistance(ring: Ring, at: number): [number, number] {
  let remaining = at
  for (let i = 1; i < ring.length; i++) {
    const seg = Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1])
    if (remaining <= seg || i === ring.length - 1) {
      const t = seg === 0 ? 0 : Math.min(1, remaining / seg)
      return [
        ring[i - 1][0] + (ring[i][0] - ring[i - 1][0]) * t,
        ring[i - 1][1] + (ring[i][1] - ring[i - 1][1]) * t,
      ]
    }
    remaining -= seg
  }
  return ring[ring.length - 1]
}

function ringSlice(ring: Ring, at: number): Ring {
  const slice: Ring = [ring[0]]
  let remaining = at
  for (let i = 1; i < ring.length; i++) {
    const seg = Math.hypot(ring[i][0] - ring[i - 1][0], ring[i][1] - ring[i - 1][1])
    if (remaining <= seg) {
      const t = seg === 0 ? 0 : Math.min(1, remaining / seg)
      slice.push([
        ring[i - 1][0] + (ring[i][0] - ring[i - 1][0]) * t,
        ring[i - 1][1] + (ring[i][1] - ring[i - 1][1]) * t,
      ])
      return slice
    }
    slice.push(ring[i])
    remaining -= seg
  }
  return slice
}

function lineFeature(ring: Ring): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: ring },
  }
}

/** Pre-slice the boundary into `steps` animation frames plus the head track.
 * Returns null when the geometry cannot be traced (missing/empty rings). */
export function buildTracePlan(geometry: unknown, steps = 44): TracePlan | null {
  const rings = flattenRings(geometry).filter((ring) => ring.length >= 4)
  if (rings.length === 0) return null
  const lengths = ringLengths(rings)
  const total = lengths.reduce((sum, len) => sum + len, 0)
  if (!(total > 0)) return null

  const frames: GeoJSON.FeatureCollection[] = []
  const headTrack: [number, number][] = []

  for (let k = 0; k <= steps; k++) {
    const distance = (k / steps) * total
    const features: GeoJSON.Feature[] = []
    let tip: [number, number] = rings[0][0]
    let consumed = 0
    for (let r = 0; r < rings.length; r++) {
      const ringEnd = consumed + lengths[r]
      if (distance >= ringEnd) {
        features.push(lineFeature(rings[r]))
        consumed = ringEnd
        tip = rings[r][rings[r].length - 1]
      } else {
        const at = distance - consumed
        const slice = ringSlice(rings[r], at)
        if (slice.length >= 2) features.push(lineFeature(slice))
        tip = pointAtDistance(rings[r], at)
        consumed = distance
        break
      }
    }
    frames.push({ type: 'FeatureCollection', features })
    headTrack.push(tip)
  }

  return { frames, headTrack, steps }
}
