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

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-cream-warm/80 border border-forest/15 shadow-inner ${className}`}>
      {/* Precision agricultural coordinate grid background */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full"
        style={{ width, height }}
        preserveAspectRatio="xMidYMid meet"
        aria-label="Cadastral field boundary polygon"
      >
        <defs>
          <pattern id="field-grid" width="10" height="10" patternUnits="userSpaceOnUse">
            <path d="M 10 0 L 0 0 0 10" fill="none" stroke="rgba(16, 44, 36, 0.05)" strokeWidth="0.5" />
          </pattern>
          <linearGradient id="field-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#24A06B" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#173E32" stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {/* Grid pattern */}
        <rect width="100" height="100" fill="url(#field-grid)" />

        {/* Boundary Polygon */}
        <polygon
          points={points}
          fill="url(#field-fill)"
          stroke="#173E32"
          strokeWidth="2.2"
          strokeLinejoin="round"
          strokeLinecap="round"
          className="transition-all duration-300 drop-shadow-sm"
        />

        {/* Boundary vertices */}
        {coords.slice(0, -1).map(([lon, lat], i) => {
          const x = offsetX + ((lon - minX) / rangeX) * scaleX
          const y = offsetY + ((maxY - lat) / rangeY) * scaleY
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2"
              fill="#24A06B"
              stroke="#FFFFFF"
              strokeWidth="0.8"
            />
          )
        })}

        {/* North Compass Arrow indicator in top-right */}
        <g transform="translate(85, 12)">
          <circle cx="0" cy="0" r="6" fill="rgba(255,255,255,0.85)" stroke="rgba(16, 44, 36, 0.15)" strokeWidth="0.5" />
          <path d="M 0 -4 L 2.5 3 L 0 1.5 L -2.5 3 Z" fill="#173E32" />
          <text x="0" y="-5.5" textAnchor="middle" fontSize="4.5" fontWeight="bold" fill="#173E32" fontFamily="monospace">N</text>
        </g>
      </svg>
    </div>
  )
}
export default FieldPolygonThumbnail
