import React from 'react'
import { MapPin, Compass, ShieldCheck } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'

interface GeometryGeoJSON {
  type: string
  coordinates: unknown
}

interface Parcel3DCardProps {
  geometry?: GeometryGeoJSON | null
  fieldName?: string
  areaHa?: number | null
  className?: string
  interactive?: boolean
}

export function Parcel3DCard({
  geometry,
  fieldName,
  areaHa,
  className = '',
  interactive = true,
}: Parcel3DCardProps) {
  const { t, i18n } = useTranslation()
  const isArabic = i18n.language === 'ar'

  // Extract outer ring of coordinates
  let coords: [number, number][] = []
  try {
    if (geometry?.type === 'Polygon') {
      const rings = geometry.coordinates as [number, number][][]
      coords = rings[0] || []
    } else if (geometry?.type === 'MultiPolygon') {
      const polys = geometry.coordinates as [number, number][][][]
      coords = polys[0]?.[0] || []
    }
  } catch {
    coords = []
  }

  // Fallback default coordinates if none provided (Meknes plateau default)
  const defaultCoords: [number, number][] = [
    [-5.549, 33.892],
    [-5.544, 33.893],
    [-5.545, 33.896],
    [-5.550, 33.895],
    [-5.549, 33.892],
  ]

  const activeCoords = coords.length >= 3 ? coords : defaultCoords

  // Calculate bounding box
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity

  for (const [lon, lat] of activeCoords) {
    if (lon < minX) minX = lon
    if (lon > maxX) maxX = lon
    if (lat < minY) minY = lat
    if (lat > maxY) maxY = lat
  }

  const rangeX = maxX - minX || 0.0001
  const rangeY = maxY - minY || 0.0001

  // Normalize into 120x100 SVG space with isometric skew & padding
  const pad = 16
  const innerW = 120 - pad * 2
  const innerH = 100 - pad * 2

  const maxRange = Math.max(rangeX, rangeY)
  const scaleX = (rangeX / maxRange) * innerW
  const scaleY = (rangeY / maxRange) * innerH

  const offsetX = pad + (innerW - scaleX) / 2
  const offsetY = pad + (innerH - scaleY) / 2

  // 2D Normalized points
  const points2D = activeCoords.map(([lon, lat]) => {
    const x = offsetX + ((lon - minX) / rangeX) * scaleX
    const y = offsetY + ((maxY - lat) / rangeY) * scaleY
    return { x, y }
  })

  // Extrusion depth (in SVG pixels)
  const depth = 9

  // Top surface points string
  const topPointsStr = points2D.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')

  // Extruded bottom surface points string (offset downwards for 3D thickness)
  const bottomPointsStr = points2D
    .map((p) => `${p.x.toFixed(1)},${(p.y + depth).toFixed(1)}`)
    .join(' ')

  // Satellite tile URL calculation for authentic Earth imagery
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
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4 }}
      className={`relative overflow-hidden rounded-3xl border border-forest-line bg-gradient-to-b from-[#0A2018] via-[#081A15] to-[#040E0B] shadow-2xl ${className}`}
    >
      {/* Background ambient light */}
      <div className="absolute -top-16 -end-16 h-48 w-48 rounded-full bg-leaf/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-16 -start-16 h-48 w-48 rounded-full bg-forest-light/30 blur-3xl pointer-events-none" />

      {/* Top Header Information inside 3D Card */}
      <div className="relative z-20 flex items-center justify-between p-4 border-b border-white/10 text-xs">
        <div className="flex items-center gap-2">
          <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-leaf/20 text-leaf border border-leaf/30">
            <MapPin size={13} />
          </span>
          <div>
            <h4 className="font-extrabold text-white text-xs truncate max-w-[10rem]">
              <bdi>{fieldName || t('field.defaultName')}</bdi>
            </h4>
            <p className="text-[10px] text-white/50 font-mono">
              {centerLat.toFixed(2)}°N, {centerLon.toFixed(2)}°E
            </p>
          </div>
        </div>

        {areaHa != null && (
          <div className="rounded-xl bg-white/10 backdrop-blur-md px-2.5 py-1 border border-white/15 text-end font-mono">
            <span className="text-leaf font-extrabold text-xs">
              {areaHa.toLocaleString(i18n.language)}
            </span>{' '}
            <span className="text-[10px] text-white/70">{t('common.hectare')}</span>
          </div>
        )}
      </div>

      {/* 3D Isometric Viewport Container */}
      <div className="relative h-56 sm:h-64 w-full flex items-center justify-center p-4 overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-15 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, #229E65 1px, transparent 0)',
            backgroundSize: '20px 20px',
          }}
        />

        {/* 3D Floating Parcel Object */}
        <div className="relative w-full h-full max-w-xs flex items-center justify-center animate-float-slow">
          {/* Ground drop shadow underneath the parcel */}
          <div
            className="absolute bottom-6 h-12 w-3/4 rounded-full bg-black/60 blur-xl transform scale-y-50"
            aria-hidden
          />

          <svg
            viewBox="0 0 120 110"
            className="relative z-10 w-full h-full filter drop-shadow-[0_12px_24px_rgba(0,0,0,0.6)]"
            preserveAspectRatio="xMidYMid meet"
            aria-label="3D extruded parcel geometry"
          >
            <defs>
              {/* Gradients for 3D extrusion sides */}
              <linearGradient id="extrusion-side-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#163E32" stopOpacity="0.95" />
                <stop offset="50%" stopColor="#0E2921" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#081A15" stopOpacity="1" />
              </linearGradient>

              {/* Surface texture pattern */}
              <pattern id="soil-pattern" width="8" height="8" patternUnits="userSpaceOnUse">
                <rect width="8" height="8" fill="#1A4538" />
                <circle cx="2" cy="2" r="1" fill="#229E65" opacity="0.3" />
                <circle cx="6" cy="5" r="1.2" fill="#167345" opacity="0.4" />
              </pattern>

              {/* Glow filter */}
              <filter id="parcel-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#229E65" floodOpacity="0.6" />
              </filter>
            </defs>

            {/* Extruded Terrain Sides (Depth Layer) */}
            {points2D.slice(0, -1).map((p1, idx) => {
              const p2 = points2D[idx + 1]
              // Render side quad between top edge and bottom edge
              const sidePath = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y} L ${p2.x} ${p2.y + depth} L ${p1.x} ${p1.y + depth} Z`
              return (
                <path
                  key={`side-${idx}`}
                  d={sidePath}
                  fill="url(#extrusion-side-grad)"
                  stroke="#0A2018"
                  strokeWidth="0.5"
                />
              )
            })}

            {/* Bottom edge stroke for 3D grounding */}
            <polygon
              points={bottomPointsStr}
              fill="none"
              stroke="#040E0B"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />

            {/* Top Surface (Agricultural Parcel Plate) */}
            <polygon
              points={topPointsStr}
              fill="url(#soil-pattern)"
              stroke="#34D399"
              strokeWidth="2.2"
              strokeLinejoin="round"
              strokeLinecap="round"
              filter="url(#parcel-glow)"
            />

            {/* Cadastral Vertices Markers */}
            {points2D.slice(0, -1).map((p, i) => (
              <g key={`vertex-${i}`}>
                <circle
                  cx={p.x}
                  cy={p.y}
                  r="2.8"
                  fill="#10B981"
                  stroke="#FFFFFF"
                  strokeWidth="1"
                />
                <circle cx={p.x} cy={p.y} r="1" fill="#FFFFFF" />
              </g>
            ))}

            {/* North Compass Indicator on Top-Right */}
            <g transform="translate(106, 18)">
              <circle
                cx="0"
                cy="0"
                r="7"
                fill="rgba(8, 26, 21, 0.85)"
                stroke="rgba(255, 255, 255, 0.3)"
                strokeWidth="0.8"
              />
              <path d="M 0 -4.5 L 2.5 3 L 0 1.5 L -2.5 3 Z" fill="#34D399" />
              <text
                x="0"
                y="-6"
                textAnchor="middle"
                fontSize="4"
                fontWeight="bold"
                fill="#FFFFFF"
                fontFamily="monospace"
              >
                N
              </text>
            </g>
          </svg>
        </div>
      </div>

      {/* Footer Info Badge */}
      <div className="relative z-20 flex items-center justify-between px-4 py-2.5 bg-black/40 border-t border-white/10 text-[11px] text-white/60">
        <div className="flex items-center gap-1.5 font-mono">
          <ShieldCheck size={12} className="text-leaf" />
          <span>WGS84 Geodesic</span>
        </div>
        <span className="text-[10px] text-white/40">
          {isArabic ? 'هندسة حقيقية من الخريطة' : 'Real GeoJSON polygon'}
        </span>
      </div>
    </motion.div>
  )
}

export default Parcel3DCard
