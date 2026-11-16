import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'

import { easeInOutCubic } from './geometryTrace'
import type { TracePlan } from './geometryTrace'

const EMPTY_GEOJSON: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] }

export interface Cancellation {
  isCancelled(): boolean
}

function sleep(ms: number, cancel: Cancellation): Promise<boolean> {
  return new Promise((resolve) => {
    const started = performance.now()
    const tick = () => {
      if (cancel.isCancelled()) return resolve(false)
      if (performance.now() - started >= ms) return resolve(true)
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

function animatePaint(
  map: MapLibreMap,
  layer: string,
  property: 'line-opacity' | 'fill-opacity' | 'circle-opacity' | 'circle-radius' | 'circle-stroke-opacity',
  from: number,
  to: number,
  durationMs: number,
  cancel: Cancellation,
): Promise<boolean> {
  return new Promise((resolve) => {
    const started = performance.now()
    const tick = () => {
      if (cancel.isCancelled()) return resolve(false)
      const p = Math.min(1, (performance.now() - started) / durationMs)
      map.setPaintProperty(layer, property, from + (to - from) * easeInOutCubic(p))
      if (p < 1) requestAnimationFrame(tick)
      else resolve(true)
    }
    requestAnimationFrame(tick)
  })
}

function headPoint(lonlat: [number, number]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'Point', coordinates: lonlat } }],
  }
}

export interface BoundaryDirector {
  /** Progressive luminous trace over a pre-built plan. Resolves false when
   * cancelled — the journey runner checks its token after every stage. */
  runTrace: (plan: TracePlan, durationMs: number, cancel: Cancellation) => Promise<boolean>
  /** Static full outline, used for reduced motion instead of the animation. */
  showFullOutline: (plan: TracePlan) => void
  fadeOutTrace: (durationMs: number, cancel: Cancellation) => Promise<boolean>
  /** Keep the completed outline on screen at reduced opacity. */
  dimTrace: (opacity: number, durationMs: number, cancel: Cancellation) => Promise<boolean>
  /** Soft fill under the completed boundary. */
  showAreaFill: (geometry: unknown) => void
  /** Pulsing precise-location marker (GPS flow). */
  pulseMarker: (lonlat: [number, number], durationMs: number, cancel: Cancellation) => Promise<boolean>
  hideMarker: () => void
  clearAll: () => void
}

/** Drives the style-declared boundary layers. All data is real geographic
 * GeoJSON, so the animation stays glued to the globe while the camera moves. */
export function createBoundaryDirector(map: MapLibreMap): BoundaryDirector {
  const traceSource = map.getSource('boundary-trace') as GeoJSONSource | undefined
  const headSource = map.getSource('boundary-head') as GeoJSONSource | undefined
  const areaSource = map.getSource('boundary-area') as GeoJSONSource | undefined

  const setTraceOpacity = (value: number) => {
    map.setPaintProperty('boundary-core', 'line-opacity', value)
    map.setPaintProperty('boundary-glow', 'line-opacity', value * 0.55)
  }

  const hideMarker = () => {
    headSource?.setData(EMPTY_GEOJSON)
    map.setPaintProperty('boundary-head-halo', 'circle-opacity', 0)
    map.setPaintProperty('boundary-head-dot', 'circle-opacity', 0)
    map.setPaintProperty('boundary-head-dot', 'circle-stroke-opacity', 0)
  }

  return {
    runTrace: (plan, durationMs, cancel) => {
      return new Promise((resolve) => {
        const started = performance.now()
        let lastFrame = -1
        const tick = () => {
          if (cancel.isCancelled()) return resolve(false)
          const p = easeInOutCubic(Math.min(1, (performance.now() - started) / durationMs))
          const k = Math.min(plan.steps, Math.round(p * plan.steps))
          if (k !== lastFrame) {
            lastFrame = k
            traceSource?.setData(plan.frames[k])
            headSource?.setData(headPoint(plan.headTrack[k]))
            setTraceOpacity(1)
            map.setPaintProperty('boundary-head-halo', 'circle-opacity', 0.5)
            map.setPaintProperty('boundary-head-dot', 'circle-opacity', 1)
            map.setPaintProperty('boundary-head-dot', 'circle-stroke-opacity', 1)
          }
          if (k < plan.steps) requestAnimationFrame(tick)
          else resolve(true)
        }
        requestAnimationFrame(tick)
      })
    },

    showFullOutline: (plan) => {
      traceSource?.setData(plan.frames[plan.steps])
      headSource?.setData(EMPTY_GEOJSON)
      setTraceOpacity(1)
    },

    dimTrace: (opacity, durationMs, cancel) => {
      return (async () => {
        const ok = await animatePaint(map, 'boundary-core', 'line-opacity', 1, opacity, durationMs, cancel)
        if (!cancel.isCancelled()) {
          map.setPaintProperty('boundary-glow', 'line-opacity', opacity * 0.55)
        }
        return ok
      })()
    },

    fadeOutTrace: (durationMs, cancel) => {
      return (async () => {
        const current = Number(map.getPaintProperty('boundary-core', 'line-opacity') ?? 1)
        const ok = await animatePaint(map, 'boundary-core', 'line-opacity', current, 0, durationMs, cancel)
        if (!cancel.isCancelled()) {
          map.setPaintProperty('boundary-glow', 'line-opacity', 0)
          headSource?.setData(EMPTY_GEOJSON)
          hideMarker()
        }
        return ok
      })()
    },

    showAreaFill: (geometry) => {
      areaSource?.setData({
        type: 'FeatureCollection',
        features: [{ type: 'Feature', properties: {}, geometry: geometry as GeoJSON.Geometry }],
      })
      void animatePaint(map, 'boundary-area-fill', 'fill-opacity', 0, 0.14, 700, { isCancelled: () => false })
    },

    pulseMarker: (lonlat, durationMs, cancel) => {
      return (async () => {
        headSource?.setData(headPoint(lonlat))
        const started = performance.now()
        while (!cancel.isCancelled()) {
          const t = (performance.now() - started) / 900
          const pulse = (Math.sin(t * Math.PI * 2) + 1) / 2
          map.setPaintProperty('boundary-head-halo', 'circle-opacity', 0.25 + 0.45 * pulse)
          map.setPaintProperty('boundary-head-halo', 'circle-radius', 9 + 7 * pulse)
          map.setPaintProperty('boundary-head-dot', 'circle-opacity', 1)
          map.setPaintProperty('boundary-head-dot', 'circle-stroke-opacity', 1)
          if (performance.now() - started >= durationMs) break
          await sleep(50, cancel)
        }
        return !cancel.isCancelled()
      })()
    },

    hideMarker,

    clearAll: () => {
      traceSource?.setData(EMPTY_GEOJSON)
      headSource?.setData(EMPTY_GEOJSON)
      areaSource?.setData(EMPTY_GEOJSON)
      map.setPaintProperty('boundary-core', 'line-opacity', 0)
      map.setPaintProperty('boundary-glow', 'line-opacity', 0)
      map.setPaintProperty('boundary-area-fill', 'fill-opacity', 0)
      hideMarker()
    },
  }
}
