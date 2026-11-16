import type { StyleSpecification } from 'maplibre-gl'

import {
  BOUNDARY_COLORS,
  ESRI_ATTRIBUTION,
  ESRI_IMAGERY_TILES,
  ESRI_LABEL_ATTRIBUTION,
  ESRI_LABEL_TILES,
  GLOBE_HOME,
} from '../config/observatory'

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

/** Raster-only style: real satellite imagery + a subtle label overlay.
 * tileSize 256 keeps zoom parity with the Leaflet drawing map. The boundary
 * animation sources/layers are declared here from the start so the trace is
 * guaranteed to render on the globe; runtime code only feeds data. */
export function buildGlobeStyle(): StyleSpecification {
  return {
    version: 8,
    sources: {
      esriSatellite: {
        type: 'raster',
        tiles: [ESRI_IMAGERY_TILES],
        tileSize: 256,
        attribution: ESRI_ATTRIBUTION,
        maxzoom: 18,
      },
      placeLabels: {
        type: 'raster',
        tiles: [ESRI_LABEL_TILES],
        tileSize: 256,
        attribution: `${ESRI_LABEL_ATTRIBUTION} · Boundary data © OpenStreetMap contributors`,
        maxzoom: 19,
      },
      'boundary-area': { type: 'geojson', data: EMPTY_GEOJSON },
      'boundary-trace': { type: 'geojson', data: EMPTY_GEOJSON },
      'boundary-head': { type: 'geojson', data: EMPTY_GEOJSON },
    },
    layers: [
      { id: 'space', type: 'background', paint: { 'background-color': '#04070C' } },
      { id: 'earth-imagery', type: 'raster', source: 'esriSatellite', paint: { 'raster-fade-duration': 300 } },
      { id: 'earth-labels', type: 'raster', source: 'placeLabels', paint: { 'raster-opacity': 0.85 } },
      {
        id: 'boundary-area-fill',
        type: 'fill',
        source: 'boundary-area',
        paint: { 'fill-color': BOUNDARY_COLORS.lineSoft, 'fill-opacity': 0 },
      },
      {
        id: 'boundary-glow',
        type: 'line',
        source: 'boundary-trace',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': BOUNDARY_COLORS.lineSoft,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 4.5, 10, 13],
          'line-blur': 5,
          'line-opacity': 0,
        },
      },
      {
        id: 'boundary-core',
        type: 'line',
        source: 'boundary-trace',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': BOUNDARY_COLORS.line,
          'line-width': ['interpolate', ['linear'], ['zoom'], 2, 1.7, 10, 3.4],
          'line-opacity': 0,
        },
      },
      {
        id: 'boundary-head-halo',
        type: 'circle',
        source: 'boundary-head',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 7, 10, 13],
          'circle-color': BOUNDARY_COLORS.lineSoft,
          'circle-blur': 0.9,
          'circle-opacity': 0,
        },
      },
      {
        id: 'boundary-head-dot',
        type: 'circle',
        source: 'boundary-head',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 2, 3.5, 10, 5.5],
          'circle-color': '#FFFFFF',
          'circle-stroke-color': BOUNDARY_COLORS.line,
          'circle-stroke-width': 1.6,
          'circle-opacity': 0,
          'circle-stroke-opacity': 0,
        },
      },
    ],
  }
}

export const GLOBE_INITIAL_VIEW = GLOBE_HOME

export const GLOBE_SKY = {
  'sky-color': '#071120',
  'horizon-color': '#8FC2EA',
  'fog-color': '#071120',
  'fog-ground-blend': 0.1,
  'horizon-fog-blend': 0.2,
  'sky-horizon-blend': 0.6,
  'atmosphere-blend': 0.85,
}
