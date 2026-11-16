/** Camera, imagery and timing constants for the Earth-to-field journey.
 * Zoom values follow the 256 px tile convention shared by MapLibre (globe)
 * and Leaflet (drawing map), so the handoff keeps the same visual scale. */

export const GLOBE_HOME = {
  center: [9, 30] as [number, number],
  zoom: 2.1,
}

export const FLIGHT_ZOOMS = {
  country: 4.4,
  city: 9.8,
  arrive: 12.6,
} as const

export const FLIGHT_DURATIONS = {
  country: 2600,
  city: 3000,
  arrive: 2400,
  crossfade: 850,
} as const

/** Reduced motion keeps the journey functional without the long camera show. */
export const REDUCED_FLIGHT_DURATIONS = {
  country: 450,
  city: 450,
  arrive: 450,
  crossfade: 300,
} as const

export const GLOBE_MAX_ZOOM = 12.8

/** Fallback drawing-map view when the farmer skips the search (Meknès plateau,
 * same default the previous field-selection page used). */
export const MAP_DEFAULT = {
  center: [33.89, -5.55] as [number, number],
  zoom: 13.5,
}

export const MAP_DRAW_ZOOM = 14

/** Esri World Imagery — same satellite tiles the drawing map already used. */
export const ESRI_IMAGERY_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
export const ESRI_ATTRIBUTION = 'Tiles © Esri, Maxar, Earthstar Geographics'

/** Esri reference layer: place labels + boundaries readable over imagery. */
export const ESRI_LABEL_TILES =
  'https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}'
export const ESRI_LABEL_ATTRIBUTION = 'Labels © Esri, HERE, Garmin'

export const OSMP_STANDARD_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSMP_ATTRIBUTION = '&copy; OpenStreetMap contributors'

/** Provider credits shown by the single compact attribution badge. */
export const ATTRIBUTION = {
  imagery: 'Tiles © Esri, Maxar, Earthstar Geographics',
  labels: 'Labels © Esri, HERE, Garmin',
  osm: 'Boundary data © OpenStreetMap contributors',
  standard: '© OpenStreetMap contributors',
  short: '© Esri · © OpenStreetMap',
} as const

/** Failed tiles blend into the dark canvas instead of flashing pale boxes. */
export const TRANSPARENT_TILE_DATA_URI =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII='

export const BOUNDARY_COLORS = {
  line: '#D9F99D',
  lineSoft: '#A3E635',
  fill: 'rgba(163, 230, 117, 0.16)',
} as const
