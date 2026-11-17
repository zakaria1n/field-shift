import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { MapPin } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { ESRI_ATTRIBUTION, ESRI_IMAGERY_TILES } from '../../earth-observatory/config/observatory'

type Coordinate = [number, number]
type Ring = Coordinate[]
type PolygonCoordinates = Ring[]

export interface FieldOutline {
  d: string
  centroid: { x: number; y: number }
  centroidGeo: { lat: number; lon: number }
}

type Geometry = { type?: string; coordinates?: unknown } | null | undefined
type TileState = 'loading' | 'ready' | 'unavailable'

/** Conventional Esri satellite map preview fitted to the selected GeoJSON.
 * The vector boundary remains real even if satellite tiles are unavailable. */
export default function SelectedFieldVisualization({ geometry }: { geometry: Geometry }) {
  const { t } = useTranslation()
  const mapNodeRef = useRef<HTMLDivElement>(null)
  const [tileState, setTileState] = useState<TileState>('loading')
  const outline = useMemo(() => buildOutline(geometry), [geometry])

  useEffect(() => {
    const container = mapNodeRef.current
    if (!container || !outline || !geometry) return

    setTileState('loading')
    const map = L.map(container, {
      zoomControl: false,
      attributionControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
      zoomSnap: 0.25,
      zoomDelta: 0.5,
      maxZoom: 18,
      preferCanvas: false,
    })

    const tiles = L.tileLayer(ESRI_IMAGERY_TILES, {
      maxNativeZoom: 18,
      maxZoom: 18,
      keepBuffer: 1,
      updateWhenIdle: true,
      attribution: ESRI_ATTRIBUTION,
    })
    let loadedTiles = 0
    let imageryReady = false
    let disposed = false
    let readyFrame = 0
    let resizeFrame = 0
    tiles.on('tileload', () => { loadedTiles += 1 })
    tiles.on('load', () => {
      if (loadedTiles > 0) {
        imageryReady = true
        setTileState('ready')
      }
      else setTileState('unavailable')
    })
    tiles.addTo(map)

    const parcelOptions = {
      style: () => ({
        color: '#E8F7A8',
        weight: 3,
        opacity: 1,
        fillColor: '#A3E635',
        fillOpacity: 0.12,
        lineCap: 'round',
        lineJoin: 'round',
        fillRule: 'evenodd',
      }),
      smoothFactor: 0,
    } as L.GeoJSONOptions
    const parcel = L.geoJSON(geometry as GeoJSON.GeoJsonObject, parcelOptions).addTo(map)

    const bounds = parcel.getBounds()
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [34, 54], maxZoom: 18, animate: false })
      L.marker([outline.centroidGeo.lat, outline.centroidGeo.lon], {
        icon: L.divIcon({
          className: 'ea-parcel-pin-icon',
          html: '<span class="ea-parcel-pin"><span></span></span>',
          iconSize: [20, 24],
          iconAnchor: [10, 21],
        }),
        interactive: false,
        keyboard: false,
        bubblingMouseEvents: false,
      }).addTo(map)
    }
    const revealParcelOutline = () => {
      const paths = container.querySelectorAll<SVGPathElement>('.leaflet-overlay-pane path')
      paths.forEach((path) => {
        try {
          const length = path.getTotalLength()
          if (!length || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
          path.style.strokeDasharray = `${length}`
          path.style.strokeDashoffset = `${length}`
          path.style.transition = 'stroke-dashoffset 1.5s cubic-bezier(.2,.7,.2,1)'
          requestAnimationFrame(() => { if (!disposed) path.style.strokeDashoffset = '0' })
        } catch {
          // Browsers without SVG path measurement keep the static real outline.
        }
      })
    }
    map.whenReady(() => {
      readyFrame = requestAnimationFrame(() => {
        if (disposed) return
        revealParcelOutline()
      })
    })

    const unavailableTimer = window.setTimeout(() => {
      if (!imageryReady) setTileState('unavailable')
    }, 8000)
    const resizeObserver = new ResizeObserver(() => { if (!disposed) map.invalidateSize({ pan: false }) })
    resizeObserver.observe(container)
    resizeFrame = requestAnimationFrame(() => { if (!disposed) map.invalidateSize({ pan: false }) })

    return () => {
      disposed = true
      cancelAnimationFrame(readyFrame)
      cancelAnimationFrame(resizeFrame)
      window.clearTimeout(unavailableTimer)
      resizeObserver.disconnect()
      map.remove()
    }
  }, [geometry, outline])

  if (!outline || !geometry) {
    return (
      <div className="ea-field-geometry-unavailable" data-testid="field-visualization-empty" role="status">
        <MapPin size={18} aria-hidden="true" />
        <span>{t('ea.field.geometryUnavailable')}</span>
      </div>
    )
  }

  return (
    <>
      <div className="ea-field-map-wrap" data-testid="field-visualization" data-geometry-type={geometry.type} data-polygon-count={countPolygons(geometry)} data-imagery-state={tileState}>
        <div ref={mapNodeRef} className="ea-field-map" aria-label={t('ea.field.geometryLabel')} role="img" />
        {tileState === 'ready' && <span className="ea-map-attribution">{ESRI_ATTRIBUTION}</span>}
        {tileState !== 'ready' && (
          <div className="ea-field-map-status" data-testid="field-imagery-placeholder" role="status">
            <span>{t(tileState === 'loading' ? 'ea.field.imageryLoading' : 'ea.field.imageryUnavailable')}</span>
          </div>
        )}
      </div>
    </>
  )
}

function countPolygons(geometry: Geometry): number {
  if (geometry?.type === 'Polygon') return 1
  if (geometry?.type !== 'MultiPolygon' || !Array.isArray(geometry.coordinates)) return 0
  return geometry.coordinates.length
}

export function buildOutline(geometry: Geometry): FieldOutline | null {
  try {
    let polygons: PolygonCoordinates[]
    if (geometry?.type === 'Polygon') polygons = [geometry.coordinates as PolygonCoordinates]
    else if (geometry?.type === 'MultiPolygon') polygons = geometry.coordinates as PolygonCoordinates[]
    else return null
    if (!Array.isArray(polygons) || polygons.length === 0) return null

    const validPolygons = polygons
      .map((polygon) => Array.isArray(polygon) ? polygon.filter(isValidRing) : [])
      .filter((polygon) => polygon.length > 0)
    const allPositions = validPolygons.flatMap((polygon) => polygon.flat())
    if (!allPositions.length) return null

    const meanLatitude = allPositions.reduce((sum, point) => sum + point[1], 0) / allPositions.length
    const longitudeScale = Math.max(0.05, Math.cos((meanLatitude * Math.PI) / 180))
    const project = ([lon, lat]: Coordinate): Coordinate => [lon * longitudeScale, lat]
    const projected = validPolygons.map((polygon) => polygon.map((ring) => ring.map(project)))
    const positions = projected.flatMap((polygon) => polygon.flat())
    const minX = Math.min(...positions.map(([x]) => x))
    const maxX = Math.max(...positions.map(([x]) => x))
    const minY = Math.min(...positions.map(([, y]) => y))
    const maxY = Math.max(...positions.map(([, y]) => y))
    const rangeX = Math.max(maxX - minX, 1e-10)
    const rangeY = Math.max(maxY - minY, 1e-10)
    const scale = Math.min((420 - 68) / rangeX, (220 - 48) / rangeY)
    const draw = ([x, y]: Coordinate): Coordinate => [
      210 + (x - (minX + maxX) / 2) * scale,
      110 - (y - (minY + maxY) / 2) * scale,
    ]
    const pathParts = projected.flatMap((polygon) => polygon.map((ring) => {
      const points = ring.map(draw)
      return `${points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`).join(' ')} Z`
    }))
    const d = pathParts.join(' ')
    if (!d) return null

    let weightedX = 0
    let weightedY = 0
    let netArea = 0
    projected.forEach((polygon) => polygon.forEach((ring, ringIndex) => {
      const stats = ringCentroid(ring)
      const weight = Math.abs(stats.area) * (ringIndex === 0 ? 1 : -1)
      weightedX += stats.x * weight
      weightedY += stats.y * weight
      netArea += weight
    }))
    const center: Coordinate = Math.abs(netArea) > 1e-16
      ? [weightedX / netArea, weightedY / netArea]
      : [(minX + maxX) / 2, (minY + maxY) / 2]
    const centroid = draw(center)
    return {
      d,
      centroid: { x: centroid[0], y: centroid[1] },
      centroidGeo: { lon: center[0] / longitudeScale, lat: center[1] },
    }
  } catch {
    return null
  }
}

function isValidRing(value: unknown): value is Ring {
  return Array.isArray(value) && value.length >= 4 && value.every((point) =>
    Array.isArray(point) && Number.isFinite(point[0]) && Number.isFinite(point[1]),
  )
}

function ringCentroid(ring: Ring): { area: number; x: number; y: number } {
  let twiceArea = 0
  let xTotal = 0
  let yTotal = 0
  for (let i = 0; i < ring.length - 1; i += 1) {
    const [x1, y1] = ring[i]
    const [x2, y2] = ring[i + 1]
    const cross = x1 * y2 - x2 * y1
    twiceArea += cross
    xTotal += (x1 + x2) * cross
    yTotal += (y1 + y2) * cross
  }
  const signedArea = twiceArea / 2
  if (Math.abs(signedArea) < 1e-16) {
    const points = ring.slice(0, -1)
    return {
      area: 0,
      x: points.reduce((sum, p) => sum + p[0] / points.length, 0),
      y: points.reduce((sum, p) => sum + p[1] / points.length, 0),
    }
  }
  return { area: Math.abs(signedArea), x: xTotal / (6 * signedArea), y: yTotal / (6 * signedArea) }
}
