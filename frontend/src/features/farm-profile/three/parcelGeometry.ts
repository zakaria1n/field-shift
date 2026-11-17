import * as THREE from 'three'

export interface ParcelFootprint {
  ring: [number, number][]
  scaled: [number, number][]
  polygons: Array<Array<Array<[number, number]>>>
  sizeMeters: { width: number; height: number }
  centroid: { lat: number; lon: number }
}
const LAT = 110540, LON = 111320
type Ring = [number, number][]
export function firstRing(g: { type?: string; coordinates?: unknown } | null | undefined): Ring {
  const c = g?.coordinates as any
  return (g?.type === 'Polygon' ? c?.[0] : g?.type === 'MultiPolygon' ? c?.[0]?.[0] : []) ?? []
}
export function buildParcelFootprint(g: { type?: string; coordinates?: unknown } | null | undefined): ParcelFootprint | null {
  const coords = g?.coordinates as any
  const polys: Ring[][] = g?.type === 'Polygon' ? [coords] : g?.type === 'MultiPolygon' ? coords : []
  if (!Array.isArray(polys) || !polys.length || !polys.every(p => Array.isArray(p) && p.length && p.every(r => Array.isArray(r) && r.length >= 4 && r.every(v => Array.isArray(v) && v.length >= 2 && Number.isFinite(v[0]) && Number.isFinite(v[1]))))) return null
  const points = polys.flat(2) as [number, number][]
  const centroid = {lon: points.reduce((a,p)=>a+p[0],0)/points.length, lat: points.reduce((a,p)=>a+p[1],0)/points.length}
  const mx = LON * Math.cos(centroid.lat * Math.PI / 180)
  const projected = polys.map(p => p.map(r => r.map(([lon,lat]) => [(lon-centroid.lon)*mx, (lat-centroid.lat)*LAT] as [number,number])))
  const all = projected.flat(2) as [number,number][]
  const xs=all.map(p=>p[0]), ys=all.map(p=>p[1]); const minX=Math.min(...xs), maxX=Math.max(...xs), minY=Math.min(...ys), maxY=Math.max(...ys)
  const width=maxX-minX, height=maxY-minY, max=Math.max(width,height)
  if (!Number.isFinite(max) || max < 0.001) return null
  const scale=3.6/max, cx=(minX+maxX)/2, cy=(minY+maxY)/2
  const polygons=projected.map(p=>p.map(r=>r.map(([x,y])=>[(x-cx)*scale,(y-cy)*scale] as [number,number])))
  return {ring:projected[0][0], scaled:polygons[0][0], polygons, sizeMeters:{width,height}, centroid}
}
export function buildParcelMesh(footprint: ParcelFootprint) {
  const shapes=footprint.polygons.map(poly=>{
    const path=(ring: [number,number][], out: THREE.Path) => ring.forEach(([x,y],i)=>i ? out.lineTo(x,y) : out.moveTo(x,y))
    const shape=new THREE.Shape(); path(poly[0],shape)
    for (const hole of poly.slice(1)) {const p=new THREE.Path();path(hole,p);shape.holes.push(p)}
    return shape
  })
  const geometry=new THREE.ExtrudeGeometry(shapes,{depth:0.32,bevelEnabled:false,curveSegments:1})
  geometry.rotateX(-Math.PI/2); geometry.computeVertexNormals()
  return {geometry, fitRadius:2.5, sizeUnits:{width:footprint.sizeMeters.width,height:footprint.sizeMeters.height}}
}
export function seededRandom(seed:number) {let s=seed>>>0||1;return()=>{s^=s<<13;s^=s>>>17;s^=s<<5;return (s>>>0)/4294967296}}
export function parcelSeed(geometry:unknown){const text=JSON.stringify(geometry??'');let h=7;for(let i=0;i<text.length;i++)h=(h*31+text.charCodeAt(i))>>>0;return h}
/** Deterministic surface sample points across polygon outers, EXCLUDING
 * interior holes — used to scatter ground cover strictly on the top surface. */
export function sampleSurfacePoints(polygons: Ring[][], count: number, seed: number): Array<{ x: number; z: number }> {
  const valid = polygons.filter(p => p && p.length && p[0].length >= 3)
  if (!valid.length) return []
  const random = seededRandom(seed)
  const inRing = (ring: [number, number][], px: number, pz: number) => {
    let inside = false
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, zi] = ring[i], [xj, zj] = ring[j]
      if (zi > pz !== zj > pz && px < ((xj - xi) * (pz - zi)) / (zj - zi) + xi) inside = !inside
    }
    return inside
  }
  const accepted = (px: number, pz: number) =>
    valid.some(poly => inRing(poly[0], px, pz) && !poly.slice(1).some(hole => inRing(hole, px, pz)))
  const all: [number, number][] = valid.reduce<[number, number][]>((acc, poly) => { acc.push(...poly[0]); return acc }, [])
  const minX = Math.min(...all.map(p => p[0])), maxX = Math.max(...all.map(p => p[0]))
  const minZ = Math.min(...all.map(p => p[1])), maxZ = Math.max(...all.map(p => p[1]))
  const points: Array<{ x: number; z: number }> = []
  let guard = 0
  while (points.length < count && guard < count * 30) {
    guard++
    const x = minX + random() * (maxX - minX)
    const z = minZ + random() * (maxZ - minZ)
    if (!accepted(x, z)) continue
    points.push({ x, z })
  }
  return points
}
