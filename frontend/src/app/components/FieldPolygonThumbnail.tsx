import React from 'react'
import { MapPin } from 'lucide-react'

interface GeometryGeoJSON {
  type: string
  coordinates: unknown
}

interface FieldPolygonThumbnailProps {
  geometry?: GeometryGeoJSON | null
  className?: string
  width?: number | string
  height?: number | string
}

export function FieldPolygonThumbnail({
  geometry,
  className = '',
  width = '100%',
  height = '100%',
}: FieldPolygonThumbnailProps) {
  if (!geometry || !geometry.coordinates) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-forest/5 border border-forest/15 ${className}`}>
        <MapPin size={24} className="text-leaf/60" />
      </div>
    )
  }

  // Extract outer ring of Polygon or first polygon of MultiPolygon
  let coords: [number, number][] = []
  try {
    if (geometry.type === 'Polygon') {
      const rings = geometry.coordinates as [number, number][][]
      coords = rings[0] || []
    } else if (geometry.type === 'MultiPolygon') {
      const polys = geometry.coordinates as [number, number][][][]
      coords = polys[0]?.[0] || []
    }
  } catch {
    coords = []
  }

  if (coords.length < 3) {
    return (
      <div className={`flex items-center justify-center rounded-2xl bg-forest/5 border border-forest/15 ${className}`}>
        <MapPin size={24} className="text-leaf/60" />
      </div>
    )
  }

  // Calculate bounding box [minLon, minLat, maxLon, maxLat]
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const [lon, lat] of coords) {
    if (lon < minX) minX = lon
    if (lon > maxX) maxX = lon
    if (lat < minY) minY = lat
    if (lat > maxY) maxY = lat
  }

  const rangeX = maxX - minX || 0.0001
  const rangeY = maxY - minY || 0.0001

  // Normalize into 100x100 SVG space with 15px padding
  const pad = 15
  const innerSize = 100 - pad * 2

  // Preserve aspect ratio
  const maxRange = Math.max(rangeX, rangeY)
  const scaleX = (rangeX / maxRange) * innerSize
  const scaleY = (rangeY / maxRange) * innerSize

  const offsetX = pad + (innerSize - scaleX) / 2
  const offsetY = pad + (innerSize - scaleY) / 2

  const points = coords
    .map(([lon, lat]) => {
      // Invert Y because latitude increases northward, SVG Y increases downward
      const x = offsetX + ((lon - minX) / rangeX) * scaleX
      const y = offsetY + ((maxY - lat) / rangeY) * scaleY
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const centerLon = (minX + maxX) / 2
  const centerLat = (minY + maxY) / 2
  const zoom = 15
  const n = 2 ** zoom
  const tileX = Math.floor(((centerLon + 180) / 360) * n)
  const latRad = (centerLat * Math.PI) / 180
  const tileY = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n
  )
  const satelliteTileUrl = `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${zoom}/${tileY}/${tileX}`

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-forest-surface border border-forest/20 shadow-inner group ${className}`}>
      {/* Real Earth Satellite Imagery Backdrop */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <img
          src={satelliteTileUrl}
          alt="Satellite earth imagery of field parcel"
          className="w-full h-full object-cover scale-110 filter brightness-90 contrast-110 transition-transform duration-700 group-hover:scale-125"
          onError={(e) => {
            // Graceful fallback to styled agricultural terrain texture if tile cannot load
            (e.target as HTMLElement).style.display = 'none'
          }}
        />
        {/* Cinematic atmospheric depth overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-forest/60 via-transparent to-forest/30" />
      </div>

      {/* Precision Cadastral SVG Polygon Overlay */}
      <svg
        viewBox="0 0 100 100"
        className="relative z-10 w-full h-full"
        style={{ width, height }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Cadastral field boundary polygon"
      >
        <defs>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#081A15" floodOpacity="0.8" />
          </filter>
          <linearGradient id="field-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#24A06B" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#10B981" stopOpacity="0.25" />
          </linearGradient>
        </defs>

        {/* Boundary Polygon */}
        <polygon
          points={points}
          fill="url(#field-fill)"
          stroke="#FFFFFF"
          strokeWidth="2.4"
          strokeLinejoin="round"
          strokeLinecap="round"
          filter="url(#glow)"
          className="transition-all duration-300"
        />

        {/* Boundary vertices */}
        {coords.slice(0, -1).map(([lon, lat], i) => {
          const x = offsetX + ((lon - minX) / rangeX) * scaleX
          const y = offsetY + ((maxY - lat) / rangeY) * scaleY
          return (
            <g key={i}>
              <circle
                cx={x}
                cy={y}
                r="3"
                fill="#10B981"
                stroke="#FFFFFF"
                strokeWidth="1.2"
                filter="url(#glow)"
              />
              <circle
                cx={x}
                cy={y}
                r="1.2"
                fill="#FFFFFF"
              />
            </g>
          )
        })}

        {/* North Compass Arrow indicator in top-right */}
        <g transform="translate(85, 14)">
          <circle cx="0" cy="0" r="7" fill="rgba(8, 26, 21, 0.75)" stroke="rgba(255, 255, 255, 0.4)" strokeWidth="0.8" />
          <path d="M 0 -4.5 L 2.8 3 L 0 1.5 L -2.8 3 Z" fill="#34D399" />
          <text x="0" y="-6" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#FFFFFF" fontFamily="monospace">N</text>
        </g>
      </svg>
    </div>
  )
}
export default FieldPolygonThumbnail
