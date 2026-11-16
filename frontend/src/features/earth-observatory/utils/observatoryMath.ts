/** Pure helpers for the Earth Observatory journey: place naming, camera zoom
 * mapping between the globe (MapLibre) and the drawing map (Leaflet), and
 * lightweight GeoJSON conditioning for boundary highlighting. */

/** The trailing comma segment of a Nominatim display name is the country. */
export function countryFromDisplayName(displayName: string): string {
  const parts = displayName.split(',').map((p) => p.trim()).filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 1] : displayName
}

export interface SelectedPlace {
  lat: number
  lon: number
  displayName: string
}

/** Rounding to 4 decimals (~11 m) keeps administrative boundaries light enough
 * for a single GeoJSON source without altering the visible outline. */
function roundRing(ring: number[][]): number[][] {
  return ring.map(([lon, lat]) => [Math.round(lon * 10000) / 10000, Math.round(lat * 10000) / 10000])
}

export function simplifyBoundaryGeometry(geometry: unknown): unknown {
  if (!geometry || typeof geometry !== 'object') return null
  const geo = geometry as { type?: string; coordinates?: unknown }
  if (geo.type === 'Polygon' && Array.isArray(geo.coordinates)) {
    return { type: 'Polygon', coordinates: (geo.coordinates as number[][][]).map(roundRing) }
  }
  if (geo.type === 'MultiPolygon' && Array.isArray(geo.coordinates)) {
    return {
      type: 'MultiPolygon',
      coordinates: (geo.coordinates as number[][][][]).map((poly) => poly.map(roundRing)),
    }
  }
  return null
}

export function isBoundaryPolygon(geometry: unknown): boolean {
  const type = (geometry as { type?: string } | null)?.type
  return type === 'Polygon' || type === 'MultiPolygon'
}

const MIN_LEAFLET_ZOOM = 12.5
const MAX_LEAFLET_ZOOM = 14

/** Raster sources are declared with tileSize 256 on both engines, so zoom
 * levels share the same scale convention and the handoff keeps the view size. */
export function leafletZoomForGlobeZoom(globeZoom: number): number {
  const zoom = Math.min(MAX_LEAFLET_ZOOM, Math.max(MIN_LEAFLET_ZOOM, globeZoom))
  return Math.round(zoom * 2) / 2
}

/** Hectare area of a GeoJSON polygon on the WGS84 sphere — the same formula
 * the previous field-selection page used, kept for calculation continuity. */
export function polygonAreaHa(geo: { type: string; coordinates: unknown }): number | null {
  try {
    const coordinates = geo.coordinates as unknown
    const rings: [number, number][][] =
      geo.type === 'Polygon'
        ? [(coordinates as number[][][])[0] as [number, number][]]
        : (coordinates as number[][][][]).map((poly) => poly[0] as [number, number][])
    if (!Array.isArray(rings) || rings.some((ring) => !Array.isArray(ring) || ring.length < 4)) return null
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
    const ha = Math.round((total / 10000) * 100) / 100
    return Number.isFinite(ha) ? ha : null
  } catch {
    return null
  }
}

/** True when WebGL is usable; the page falls back to the flat map otherwise. */
export function webglSupported(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return Boolean(canvas.getContext('webgl2') ?? canvas.getContext('webgl'))
  } catch {
    return false
  }
}
