import { useEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

import { parcelSeed, seededRandom, sampleSurfacePoints, type ParcelFootprint } from './parcelGeometry'

/** Instanced agricultural ground cover — the Zephyr/GrassSystemThreeJS
 * technique (tapered blade geometry + per-instance transform + wind bend in
 * the vertex shader), simplified for React Three Fiber. Grass is illustrative
 * ground cover only: it never implies detected crops or field condition.
 *
 * Blades are scattered strictly on the top surface polygon (holes excluded)
 * with deterministic placement, so the cover never leaks outside the farmer's
 * real boundary. */

const BLADE_HEIGHT = 0.3

function buildBladeGeometry(): THREE.BufferGeometry {
  const geometry = new THREE.PlaneGeometry(0.05, BLADE_HEIGHT, 1, 4)
  geometry.translate(0, BLADE_HEIGHT / 2, 0)
  const position = geometry.attributes.position as THREE.BufferAttribute
  for (let i = 0; i < position.count; i++) {
    const x = position.getX(i)
    const y = position.getY(i)
    const heightFactor = y / BLADE_HEIGHT
    // taper toward the tip and curve slightly forward
    position.setX(i, x * (1 - heightFactor * heightFactor * 0.82))
    position.setZ(i, Math.pow(heightFactor, 2) * 0.05)
  }
  geometry.computeVertexNormals()
  return geometry
}

const GREEN_VARIANTS = ['#4F7E38', '#5F9244', '#6EA350', '#456E33', '#7B9E58', '#5C8A4A', '#8AA860'].map(
  (color) => new THREE.Color(color),
)
const DRY_VARIANT = new THREE.Color('#9AA55C')

export function GrassField({ footprint }: { footprint: ParcelFootprint }) {
  const seed = useMemo(() => parcelSeed(footprint.scaled), [footprint])
  // scale density with the polygon area so small parcels stay readable
  const bladeCount = useMemo(() => {
    const areaUnits = Math.abs(
      footprint.polygons[0][0].reduce((acc, point, index, ring) => {
        const prev = ring[(index + ring.length - 1) % ring.length]
        return acc + (prev[0] * point[1] - point[0] * prev[1]) / 2
      }, 0),
    )
    return Math.round(Math.min(4200, Math.max(1400, areaUnits * 900)))
  }, [footprint])

  const points = useMemo(
    () => sampleSurfacePoints(footprint.polygons, bladeCount, seed),
    [footprint, bladeCount, seed],
  )

  const blades = useMemo(() => new THREE.InstancedMesh(buildBladeGeometry(), grassMaterial(), Math.max(1, points.length)), [points.length])
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  const material = useMemo(() => {
    const mat = blades.material as THREE.MeshStandardMaterial
    mat.side = THREE.DoubleSide
    mat.roughness = 1
    mat.metalness = 0
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = uniforms.uTime
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nuniform float uTime;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
#ifdef USE_INSTANCING
  float bladePhase = instanceMatrix[3].x * 3.7 + instanceMatrix[3].z * 2.9;
  float bladeBend = pow(clamp(position.y / ${BLADE_HEIGHT.toFixed(2)}, 0.0, 1.0), 1.6);
  transformed.x += sin(uTime * 1.9 + bladePhase) * 0.055 * bladeBend;
  transformed.z += cos(uTime * 1.4 + bladePhase * 1.31) * 0.038 * bladeBend;
#endif`)
    }
    mat.customProgramCacheKey = () => 'grass-sway'
    return mat
  }, [blades, uniforms])

  useEffect(() => {
    const random = seededRandom(seed ^ 0x7a11)
    const dummy = new THREE.Object3D()
    points.forEach((point, index) => {
      const heightScale = 0.85 + random() * 0.75
      dummy.position.set(point.x, 0.315, point.z)
      dummy.rotation.y = random() * Math.PI * 2
      dummy.scale.set(0.8 + random() * 0.5, heightScale, 1)
      dummy.updateMatrix()
      blades.setMatrixAt(index, dummy.matrix)
      const roll = random()
      blades.setColorAt(index, roll < 0.12 ? DRY_VARIANT : GREEN_VARIANTS[Math.floor(random() * GREEN_VARIANTS.length)])
    })
    blades.instanceMatrix.needsUpdate = true
    if (blades.instanceColor) blades.instanceColor.needsUpdate = true
  }, [points, seed, blades])

  useEffect(() => () => {
    blades.geometry.dispose()
    material.dispose()
  }, [blades, material])

  useFrame((state) => {
    uniforms.uTime.value = state.clock.elapsedTime
  })

  if (points.length === 0) return null
  return <primitive object={blades} frustumCulled={false} />
}

function grassMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color: '#FFFFFF', roughness: 1, metalness: 0 })
}
