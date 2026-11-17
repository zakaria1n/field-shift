import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

import { GLOBE_MAX_ZOOM, GLOBE_HOME } from '../config/observatory'
import { GLOBE_INITIAL_VIEW, GLOBE_SKY, buildGlobeStyle } from '../globe/globeStyle'
import { webglSupported } from '../utils/observatoryMath'

/** Real interactive 3D globe (MapLibre globe projection) with satellite
 * imagery, place labels, atmospheric limb and a CSS starfield in space.
 * Reports the map instance upward and cleans up all WebGL resources. */
export default function GlobeViewer({
  onReady,
  onUnsupported,
}: {
  onReady: (map: MapLibreMap) => void
  onUnsupported: () => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapLibreMap | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return
    if (!webglSupported()) {
      onUnsupported()
      return
    }

    let disposed = false
    let map: MapLibreMap
    try {
      map = new MapLibreMap({
        container: containerRef.current,
        style: buildGlobeStyle(),
        center: GLOBE_INITIAL_VIEW.center,
        zoom: GLOBE_INITIAL_VIEW.zoom,
        maxZoom: GLOBE_MAX_ZOOM,
        minZoom: 1.2,
        // Credits render in the page-level AttributionBadge instead.
        attributionControl: false,
        // Canvas interactions stay LTR even in the RTL layout; overlays handle RTL.
        dragRotate: true,
        fadeDuration: 0,
      })
    } catch {
      onUnsupported()
      return
    }
    mapRef.current = map

    // Expose camera telemetry only in dev so browser checks can verify the
    // animated geographic target instead of inferring it from the caption.
    const syncCameraTelemetry = () => {
      if (!import.meta.env.DEV || !containerRef.current) return
      const center = map.getCenter()
      containerRef.current.dataset.cameraLon = center.lng.toFixed(4)
      containerRef.current.dataset.cameraLat = center.lat.toFixed(4)
      containerRef.current.dataset.cameraZoom = map.getZoom().toFixed(3)
      containerRef.current.dataset.cameraMoving = String(map.isMoving())
      const bounds = map.getBounds()
      containerRef.current.dataset.cameraBounds = bounds.toArray().flat().map((value) => value.toFixed(4)).join(',')
    }
    if (import.meta.env.DEV) {
      map.on('move', syncCameraTelemetry)
      map.on('moveend', syncCameraTelemetry)
    }

    map.on('style.load', () => {
      map.setProjection({ type: 'globe' })
      map.setSky(GLOBE_SKY)
    })
    map.on('load', () => {
      if (disposed) return
      map.resize()
      setLoading(false)
      onReady(map)
    })
    map.on('error', () => {
      /* tile hiccups are non-fatal; the globe keeps rendering */
    })

    return () => {
      disposed = true
      map.off('move', syncCameraTelemetry)
      map.off('moveend', syncCameraTelemetry)
      map.remove()
      mapRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="absolute inset-0" data-testid="globe-viewer">
      {/* Inline position wins over `.maplibregl-map`'s stylesheet `relative`. */}
      <div ref={containerRef} dir="ltr" className="inset-0" style={{ position: 'absolute' }} aria-label="Interactive 3D Earth" data-testid="globe-camera-state" />
      {/* Starfield lives in front of the canvas space but behind all UI. */}
      <div className="observatory-stars pointer-events-none absolute inset-0" aria-hidden="true" />
      {loading && (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          <span className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-lime-300" />
        </div>
      )}
    </div>
  )
}
