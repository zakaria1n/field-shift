import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useTexture } from '@react-three/drei'
import topColor from '../../../assets/farm-profile-cinematic/terrain-materials/ground103/Ground103_1K-JPG_Color.jpg'
import topNormal from '../../../assets/farm-profile-cinematic/terrain-materials/ground103/Ground103_1K-JPG_NormalGL.jpg'
import topRoughness from '../../../assets/farm-profile-cinematic/terrain-materials/ground103/Ground103_1K-JPG_Roughness.jpg'
import sideColor from '../../../assets/farm-profile-cinematic/terrain-materials/ground102/Ground102_1K-JPG_Color.jpg'
import sideNormal from '../../../assets/farm-profile-cinematic/terrain-materials/ground102/Ground102_1K-JPG_NormalGL.jpg'
import sideRoughness from '../../../assets/farm-profile-cinematic/terrain-materials/ground102/Ground102_1K-JPG_Roughness.jpg'
import { buildParcelMesh, parcelSeed, seededRandom, type ParcelFootprint } from './parcelGeometry'
import { GrassField } from './GrassField'

/** Illustrative agricultural row shading: no crop species or field condition implied. */
function rows(shader: THREE.WebGLProgramParametersWithUniforms) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
    float rows = sin(vMapUv.y * 110.0 + sin(vMapUv.x * 4.0) * 0.35);
    diffuseColor.rgb *= 0.93 + rows * 0.07;`)
}

function imageToCanvas(image: HTMLImageElement, size = 512): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (ctx) ctx.drawImage(image, 0, 0, size, size)
  return canvas
}

/** Deterministic plot patchwork composited softly over the ground photo so
 * the surface reads as neighbouring farm plots. Purely illustrative: the
 * pattern follows the parcel seed, never observed crops or fertility. */
function patchworkOverlay(seed: number, size = 512): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const random = seededRandom(seed)

  const greens = ['#568C46', '#67A054', '#74AF60', '#4E7E3C', '#84A663', '#5E9050']
  const tans = ['#C6A468', '#B69250', '#D2B276', '#A6864C']
  let y = 0
  while (y < size) {
    const rowH = Math.floor(size / (5 + Math.floor(random() * 3)))
    let x = 0
    while (x < size) {
      const w = Math.floor(size / (4 + Math.floor(random() * 3)))
      const color = random() < 0.6
        ? greens[Math.floor(random() * greens.length)]
        : tans[Math.floor(random() * tans.length)]
      ctx.globalAlpha = 0.3 + random() * 0.22
      ctx.fillStyle = color
      ctx.fillRect(x + 2, y + 2, Math.max(6, w - 4), Math.max(6, rowH - 4))
      if (random() < 0.7) {
        ctx.globalAlpha = 0.12
        ctx.strokeStyle = '#2E4A24'
        ctx.lineWidth = 1
        for (let ly = y + 5; ly < y + rowH - 3; ly += 5) {
          ctx.beginPath()
          ctx.moveTo(x + 3, ly)
          ctx.lineTo(x + w - 3, ly)
          ctx.stroke()
        }
      }
      x += w
    }
    y += rowH
  }
  ctx.globalAlpha = 1
  return canvas
}

/** Layered soil-cutaway bands for the extruded sides composited over the side
 * ground photo. Illustrative depth — not a geological survey. */
function strataOverlay(seed: number, width = 256, height = 128): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  const random = seededRandom((seed ^ 0x9e3779b9) >>> 0)

  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  gradient.addColorStop(0, '#B08A5C')
  gradient.addColorStop(0.28, '#8A6540')
  gradient.addColorStop(0.62, '#6E4E32')
  gradient.addColorStop(1, '#4A3524')
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)

  let y = height * 0.16
  while (y < height - 6) {
    const bandH = 4 + random() * 9
    ctx.globalAlpha = 0.16 + random() * 0.14
    ctx.fillStyle = random() < 0.5 ? '#3D2B1C' : '#9A7850'
    ctx.fillRect(0, y, width, bandH)
    y += bandH + 5 + random() * 12
  }

  ctx.globalAlpha = 0.85
  ctx.fillStyle = '#5E8C46'
  ctx.fillRect(0, 0, width, height * 0.06)
  ctx.globalAlpha = 1
  return canvas
}

/** Textures are illustrative, never a measurement of the selected field. */
export function AgriculturalTerrain({ footprint }: { footprint: ParcelFootprint }) {
  const seed = useMemo(() => parcelSeed(footprint.scaled), [footprint])
  const original = useTexture([topColor, topNormal, topRoughness, sideColor, sideNormal, sideRoughness])

  const maps = useMemo(() => original.map((src, i) => {
    const t = src.clone()
    t.colorSpace = i === 0 || i === 3 ? THREE.SRGBColorSpace : THREE.NoColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(i < 3 ? 1.5 : 2, i < 3 ? 1.5 : 1)
    t.anisotropy = 4
    t.needsUpdate = true
    return t
  }), [original])

  // Composite the deterministic plot patchwork over the top photo so the
  // surface reads as neighbouring plots instead of a bare slab.
  const topMap = useMemo(() => {
    const image = original[0]?.image
    if (!(image instanceof HTMLImageElement) || !image.complete) return maps[0]
    const canvas = imageToCanvas(image)
    const ctx = canvas.getContext('2d')
    if (!ctx) return maps[0]
    ctx.globalAlpha = 0.85
    ctx.drawImage(patchworkOverlay(seed), 0, 0)
    ctx.globalAlpha = 1
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.repeat.set(1.5, 1.5)
    texture.anisotropy = 4
    return texture
  }, [original, maps, seed])

  // Soil-cutaway strata for the extruded sides.
  const sideMap = useMemo(() => {
    const image = original[3]?.image
    if (!(image instanceof HTMLImageElement) || !image.complete) return maps[3]
    const canvas = document.createElement('canvas')
    canvas.width = 256
    canvas.height = 128
    const ctx = canvas.getContext('2d')
    if (!ctx) return maps[3]
    ctx.drawImage(imageToCanvas(image, 256), 0, 0)
    ctx.globalAlpha = 0.8
    ctx.drawImage(strataOverlay(seed), 0, 0, 256, 128)
    ctx.globalAlpha = 1
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    texture.repeat.set(4, 1)
    texture.anisotropy = 4
    return texture
  }, [original, maps, seed])

  const mesh = useMemo(() => buildParcelMesh(footprint), [footprint])
  useEffect(() => () => {
    mesh.geometry.dispose()
    maps.forEach((t) => t.dispose())
    topMap.dispose()
    sideMap.dispose()
  }, [mesh, maps, topMap, sideMap])

  return (
    <group>
      <mesh geometry={mesh.geometry} castShadow receiveShadow>
        <meshStandardMaterial attach="material-0" onBeforeCompile={rows} map={topMap} normalMap={maps[1]} normalScale={new THREE.Vector2(0.55, 0.55)} roughnessMap={maps[2]} roughness={0.95} metalness={0} />
        <meshStandardMaterial attach="material-1" map={sideMap} normalMap={maps[4]} normalScale={new THREE.Vector2(0.7, 0.7)} roughnessMap={maps[5]} roughness={1} metalness={0} />
      </mesh>
      {/* ground cover scattered strictly on the real top-surface polygon */}
      <GrassField footprint={footprint} />
    </group>
  )
}
