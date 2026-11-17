import { LngLat, type Map as MapLibreMap } from 'maplibre-gl'

import { createBoundaryDirector } from './boundaryLayers'
import type { BoundaryDirector, Cancellation } from './boundaryLayers'
import type { JourneyStage } from './journeyPlan'

export type FlightPhase = 'country' | 'city' | 'arriving'

export interface JourneyHooks {
  onPhase: (phase: FlightPhase) => void
}

/** One eased camera move. Resolves on the moveend that reports the camera at
 * rest — a foreign instant `setView` (map prewarm) firing mid-flight must not
 * resolve the stage early, which would collapse the whole journey into
 * instant jumps. The watchdog still covers user interruptions. */
function flyTo(map: MapLibreMap, target: { center: [number, number]; zoom: number; duration: number }): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      if (map.isMoving()) return
      done = true
      clearTimeout(watchdog)
      map.off('moveend', finish)
      resolve()
    }
    const watchdog = setTimeout(finish, target.duration + 2500)
    map.on('moveend', finish)
    map.flyTo({
      center: target.center,
      zoom: target.zoom,
      duration: target.duration,
      curve: 1.4,
      essential: true,
    })
  })
}

/** Executes the staged journey: flights, progressive boundary traces, fades
 * and the GPS marker. Resolves true only when every stage completed without
 * cancellation. */
export async function runJourney(
  map: MapLibreMap,
  director: BoundaryDirector,
  stages: JourneyStage[],
  hooks: JourneyHooks,
  cancel: Cancellation,
): Promise<boolean> {
  for (const stage of stages) {
    if (cancel.isCancelled()) return false

    switch (stage.kind) {
      case 'fly': {
        hooks.onPhase(stage.zoom >= 12 ? 'arriving' : stage.zoom >= 7 ? 'city' : 'country')
        let center: [number, number] = [stage.lon, stage.lat]
        let zoom = stage.zoom
        if (stage.countryBounds) {
          if (import.meta.env.DEV) {
            const root = document.querySelector<HTMLElement>('[data-testid="observatory-root"]')
            if (root) root.dataset.countryFrameBounds = stage.countryBounds.join(',')
          }
          const [west, south, east, north] = stage.countryBounds
          const fitted = map.cameraForBounds([[west, south], [east, north]], {
            padding: { top: 120, right: 150, bottom: 180, left: 150 },
            maxZoom: stage.zoom,
          })
          if (fitted?.center) {
            const fittedCenter = LngLat.convert(fitted.center)
            center = [fittedCenter.lng, fittedCenter.lat]
            // Keep the existing conservative fit and take the more distant
            // camera if the live map viewport needs additional room.
            zoom = Math.min(stage.zoom, fitted.zoom ?? stage.zoom)
          }
        }
        await flyTo(map, { center, zoom, duration: stage.durationMs })
        if (stage.countryBounds && import.meta.env.DEV) {
          const root = document.querySelector<HTMLElement>('[data-testid="observatory-root"]')
          if (root) {
            const [west, south, east, north] = stage.countryBounds
            const corners = [
              map.project([west, south]),
              map.project([west, north]),
              map.project([east, south]),
              map.project([east, north]),
            ]
            const xs = corners.map((point) => point.x)
            const ys = corners.map((point) => point.y)
            root.dataset.countryFramePixels = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
              .map((value) => value.toFixed(1))
              .join(',')
          }
        }
        break
      }
      case 'trace': {
        if (stage.zoomDrift != null) {
          const current = map.getZoom()
          map.easeTo({ zoom: current + stage.zoomDrift, duration: stage.durationMs, essential: true })
        }
        const completed = await director.runTrace(stage.plan, stage.durationMs, cancel)
        if (!completed) return false
        if (stage.geometry) director.showAreaFill(stage.geometry)
        break
      }
      case 'dimTrace': {
        const ok = await director.dimTrace(stage.opacity, stage.durationMs, cancel)
        if (!ok) return false
        break
      }
      case 'fadeTrace': {
        const ok = await director.fadeOutTrace(stage.durationMs, cancel)
        if (!ok) return false
        break
      }
      case 'marker': {
        hooks.onPhase('arriving')
        const ok = await director.pulseMarker([stage.lon, stage.lat], stage.durationMs, cancel)
        if (!ok) return false
        break
      }
    }
  }
  return !cancel.isCancelled()
}

export { createBoundaryDirector }
export type { BoundaryDirector }
