import type { Map as MapLibreMap } from 'maplibre-gl'

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
        await flyTo(map, { center: [stage.lon, stage.lat], zoom: stage.zoom, duration: stage.durationMs })
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
