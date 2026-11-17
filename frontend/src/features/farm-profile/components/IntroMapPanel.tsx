import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

/** Real satellite projection and outline share the same Leaflet transform. */
export default function IntroMapPanel({ geometry }: { geometry: { type?: string; coordinates?: unknown } | null }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!ref.current || !geometry || !['Polygon','MultiPolygon'].includes(geometry.type ?? '')) return
    const map = L.map(ref.current, { zoomControl:false, dragging:false, scrollWheelZoom:false, doubleClickZoom:false, boxZoom:false, keyboard:false, attributionControl:true })
    L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { attribution:'Tiles © Esri', maxZoom:19 }).addTo(map)
    try {
      const boundary = L.geoJSON(geometry as GeoJSON.GeoJsonObject, { style:{ color:'#c4fb4a', weight:4, opacity:1, fillColor:'#b6ef43', fillOpacity:0.12 } }).addTo(map)
      const bounds=boundary.getBounds()
      if (bounds.isValid()) map.fitBounds(bounds, {padding:[45,45],maxZoom:17})
    } catch { map.setView([0,0],2) }
    const timer=window.setTimeout(()=>map.invalidateSize(),100)
    return ()=>{window.clearTimeout(timer);map.remove()}
  },[geometry])
  return <div className="fp-intro-map" aria-label="Selected field satellite map"><div ref={ref} className="fp-map-canvas" /></div>
}
