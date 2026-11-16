import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'

import {
  ESRI_LABEL_ATTRIBUTION,
  ESRI_LABEL_TILES,
  ESRI_ATTRIBUTION,
  ESRI_IMAGERY_TILES,
  OSMP_ATTRIBUTION,
  OSMP_STANDARD_TILES,
  TRANSPARENT_TILE_DATA_URI,
} from '../config/observatory'

export type MapGeometry = { type: string; coordinates: unknown }
export type MapMode = 'draw' | 'edit' | 'remove' | null

export interface SatelliteMapHandle {
  flyTo: (lat: number, lon: number, zoom?: number) => void
  zoomIn: () => void
  zoomOut: () => void
  startDrawing: () => void
  toggleEdit: () => boolean
  toggleRemoval: () => boolean
  activeMode: () => MapMode
  clearModes: () => void
}

export interface MapView {
  center: [number, number]
  zoom: number
}

interface SatelliteFieldMapProps {
  /** Camera view; the first value initializes the map, later values are
   * applied instantly so the instance is never destroyed and recreated. */
  view: MapView
  /** Prewarms farm-scale tiles for the destination while the globe flight is
   * still in progress, so the handoff reveals an already-loaded map. */
  prewarmAt: MapView | null
  basemap: 'satellite' | 'standard'
  onGeometryChange: (geometry: MapGeometry | null) => void
  onDrawingActiveChange: (active: boolean) => void
  onModeChange: (mode: MapMode) => void
}

function layerToGeoJson(layer: L.Polygon): MapGeometry {
  const data = layer.toGeoJSON()
  return { type: data.geometry.type, coordinates: data.geometry.coordinates }
}

function clearModes(map: L.Map) {
  try { map.pm.disableDraw('Polygon') } catch { /* not drawing */ }
  try { map.pm.disableGlobalEditMode() } catch { /* not editing */ }
  try { map.pm.disableGlobalRemovalMode() } catch { /* not removing */ }
}

/** The real drawing canvas: Leaflet satellite map + geoman polygon workflow,
 * same GeoJSON/area/validation pipeline as before, restyled to the canonical
 * observatory look. Geoman's built-in toolbar is suppressed; the observatory
 * toolbar drives the modes programmatically. */
const SatelliteFieldMap = forwardRef<SatelliteMapHandle, SatelliteFieldMapProps>(
  function SatelliteFieldMap({ view, prewarmAt, basemap, onGeometryChange, onDrawingActiveChange, onModeChange }, ref) {
    const containerRef = useRef<HTMLDivElement>(null)
    const mapRef = useRef<L.Map | null>(null)
    const baseLayersRef = useRef<Record<'satellite' | 'standard', L.TileLayer> | null>(null)
    const labelsLayerRef = useRef<L.TileLayer | null>(null)
    const callbacksRef = useRef({ onGeometryChange, onDrawingActiveChange, onModeChange })
    callbacksRef.current = { onGeometryChange, onDrawingActiveChange, onModeChange }
    const initialViewRef = useRef(view)

    useEffect(() => {
      const container = containerRef.current
      if (!container || mapRef.current) return
      const map = L.map(container, {
        center: initialViewRef.current.center,
        zoom: initialViewRef.current.zoom,
        minZoom: 3,
        maxZoom: 19,
        zoomControl: false,
        zoomSnap: 0.5,
        attributionControl: false,
      })

      const standard = L.tileLayer(OSMP_STANDARD_TILES, {
        maxNativeZoom: 19,
        maxZoom: 19,
        attribution: OSMP_ATTRIBUTION,
        keepBuffer: 4,
        updateWhenIdle: false,
        updateWhenZooming: false,
        errorTileUrl: TRANSPARENT_TILE_DATA_URI,
      })
      const satellite = L.tileLayer(ESRI_IMAGERY_TILES, {
        maxNativeZoom: 18,
        maxZoom: 19,
        attribution: ESRI_ATTRIBUTION,
        keepBuffer: 4,
        updateWhenIdle: false,
        updateWhenZooming: false,
        errorTileUrl: TRANSPARENT_TILE_DATA_URI,
      })
      satellite.addTo(map)
      baseLayersRef.current = { standard, satellite }

      // Label-only overlay above imagery so place names stay readable.
      map.createPane('observatoryLabels')
      const labelsPane = map.getPane('observatoryLabels')
      if (labelsPane) {
        labelsPane.style.zIndex = '650'
        labelsPane.style.pointerEvents = 'none'
      }
      const labels = L.tileLayer(ESRI_LABEL_TILES, {
        pane: 'observatoryLabels',
        maxNativeZoom: 19,
        maxZoom: 19,
        attribution: ESRI_LABEL_ATTRIBUTION,
        keepBuffer: 2,
        updateWhenIdle: false,
        errorTileUrl: TRANSPARENT_TILE_DATA_URI,
      })
      labels.addTo(map)
      labelsLayerRef.current = labels

      // No geoman toolbar UI: the observatory toolbar drives the modes.
      map.pm.setGlobalOptions({
        templineStyle: { color: '#A3E635', weight: 3 },
        hintlineStyle: { color: '#D9F99D', weight: 2, dashArray: '6,8' },
        pathOptions: { color: '#A3E635', weight: 3, fillColor: '#3F6212', fillOpacity: 0.08 },
        markerStyle: {
          icon: L.divIcon({ className: 'observatory-vertex', iconSize: [14, 14], iconAnchor: [7, 7] }),
        },
      })

      map.on('pm:create', (event: any) => {
        // One polygon at a time: drop any previous boundary layer.
        map.eachLayer((layer) => {
          if ((layer as any).pm && (layer as any) !== event.layer) {
            try { map.removeLayer(layer) } catch { /* already gone */ }
          }
        })
        event.layer.setStyle({ color: '#A3E635', weight: 3, fillColor: '#3F6212', fillOpacity: 0.08 })
        callbacksRef.current.onGeometryChange(layerToGeoJson(event.layer))
        event.layer.on('pm:edit', () => callbacksRef.current.onGeometryChange(layerToGeoJson(event.layer)))
        event.layer.on('pm:change', () => callbacksRef.current.onGeometryChange(layerToGeoJson(event.layer)))
        event.layer.on('pm:dragend', () => callbacksRef.current.onGeometryChange(layerToGeoJson(event.layer)))
      })

      map.on('pm:remove', () => callbacksRef.current.onGeometryChange(null))

      map.on('pm:drawstart', () => callbacksRef.current.onDrawingActiveChange(true))
      map.on('pm:drawend', () => callbacksRef.current.onDrawingActiveChange(false))
      map.on('pm:create', () => callbacksRef.current.onDrawingActiveChange(false))

      const syncMode = () => {
        const mode: MapMode = map.pm.globalDrawModeEnabled()
          ? 'draw'
          : map.pm.globalEditModeEnabled()
            ? 'edit'
            : map.pm.globalRemovalModeEnabled()
              ? 'remove'
              : null
        callbacksRef.current.onModeChange(mode)
      }
      for (const event of ['pm:drawstart', 'pm:drawend', 'pm:create', 'pm:remove', 'pm:globaldrawmodetoggled', 'pm:globaleditmodetoggled', 'pm:globalremovalmodetoggled']) {
        map.on(event, syncMode)
      }

      mapRef.current = map
      L.control.scale({ metric: true, imperial: true, position: 'bottomleft' }).addTo(map)
      setTimeout(() => map.invalidateSize(), 60)

      return () => {
        map.remove()
        mapRef.current = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      const layers = baseLayersRef.current
      const map = mapRef.current
      if (!layers || !map) return
      if (basemap === 'satellite') {
        if (map.hasLayer(layers.standard)) map.removeLayer(layers.standard)
        layers.satellite.addTo(map)
        labelsLayerRef.current?.addTo(map)
      } else {
        map.removeLayer(layers.satellite)
        if (labelsLayerRef.current && map.hasLayer(labelsLayerRef.current)) map.removeLayer(labelsLayerRef.current)
        layers.standard.addTo(map)
      }
    }, [basemap])

    // The map instance is created once; later views are applied in place.
    const initializedRef = useRef(false)
    useEffect(() => {
      const map = mapRef.current
      if (!map) return
      if (!initializedRef.current) {
        initializedRef.current = true
        return
      }
      map.setView(view.center, view.zoom, { animate: false })
    }, [view])

    // Load farm-scale imagery for the destination while the globe still flies.
    useEffect(() => {
      const map = mapRef.current
      if (!map || !prewarmAt) return
      map.setView(prewarmAt.center, prewarmAt.zoom, { animate: false })
    }, [prewarmAt])

    useImperativeHandle(ref, () => ({
      flyTo: (lat, lon, targetZoom) => mapRef.current?.flyTo([lat, lon], targetZoom ?? 14, { duration: 1.6 }),
      zoomIn: () => mapRef.current?.zoomIn(),
      zoomOut: () => mapRef.current?.zoomOut(),
      startDrawing: () => {
        const map = mapRef.current
        if (!map) return
        clearModes(map)
        map.pm.enableDraw('Polygon')
      },
      toggleEdit: () => {
        const map = mapRef.current
        if (!map) return false
        if (map.pm.globalEditModeEnabled()) {
          map.pm.disableGlobalEditMode()
          return false
        }
        clearModes(map)
        map.pm.enableGlobalEditMode()
        return true
      },
      toggleRemoval: () => {
        const map = mapRef.current
        if (!map) return false
        if (map.pm.globalRemovalModeEnabled()) {
          map.pm.disableGlobalRemovalMode()
          return false
        }
        clearModes(map)
        map.pm.enableGlobalRemovalMode()
        return true
      },
      activeMode: () => {
        const map = mapRef.current
        if (!map) return null
        if (map.pm.globalDrawModeEnabled()) return 'draw'
        if (map.pm.globalEditModeEnabled()) return 'edit'
        if (map.pm.globalRemovalModeEnabled()) return 'remove'
        return null
      },
      clearModes: () => {
        const map = mapRef.current
        if (map) clearModes(map)
      },
    }), [])

    return <div ref={containerRef} dir="ltr" className="absolute inset-0 earth-observatory-map" />
  },
)

export default SatelliteFieldMap
