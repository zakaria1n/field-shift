import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { ContactShadows, Float, Html, Line, useTexture } from '@react-three/drei'
import { Beef, CloudRain, Droplets, HelpCircle, ShieldAlert, Sprout, Store, Utensils, TrendingUp, Leaf } from 'lucide-react'
import type { Priorities } from '../../../state/wizard'

import { buildParcelFootprint, type ParcelFootprint } from './parcelGeometry'
import { AgriculturalTerrain } from './AgriculturalTerrain'
import rainCloudUrl from '../../../assets/farm-profile-cinematic/weather/rain-cloud.png'

export type ProfileStep = 'irrigation' | 'history' | 'purpose' | 'constraints' | 'priorities'

export interface HistoryBadge {
  label: string
  image: string | null
}

export interface FieldSceneProps {
  geometry: { type?: string; coordinates?: unknown } | null | undefined
  step: ProfileStep
  irrigationType: 'rainfed' | 'irrigated' | 'mixed' | 'unknown'
  historyBadges: HistoryBadge[]
  purposes: string[]
  excludedCount: number
  priorities: Priorities
  fieldName?: string
  areaHa?: number | null
  /** Rendering variant: full canvas (right rail) vs flat preview (transition). */
  variant?: 'panel' | 'transition'
}

/** Framing is derived from projected real polygon bounds, without stretching. */
export function FitCamera({ footprint }: { footprint: ParcelFootprint }) {
  const { camera, size } = useThree()
  useEffect(() => {
    const aspect = size.width / Math.max(1, size.height)
    const points = footprint.polygons.flat(2)
    const cameraDirection = new THREE.Vector3(1, 1.35, 1).normalize()
    camera.position.copy(cameraDirection.clone().multiplyScalar(10)); camera.lookAt(0, 0.16, 0); camera.updateMatrixWorld()
    const right = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0)
    const up = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1)
    let w = 0, h = 0
    for (const [x, north] of points) for (const y of [0, 0.32]) {
      const v = new THREE.Vector3(x, y - 0.16, -north)
      w = Math.max(w, Math.abs(v.dot(right))); h = Math.max(h, Math.abs(v.dot(up)))
    }
    const fov = (camera as THREE.PerspectiveCamera).fov * Math.PI / 180
    const distance = Math.max(h / Math.tan(fov/2), w / (Math.tan(fov/2) * Math.max(aspect, 0.1))) * 1.06 + 0.6
    camera.position.copy(cameraDirection.multiplyScalar(distance)); camera.lookAt(0, 0.16, 0); camera.updateProjectionMatrix()
  }, [camera, footprint, size.width, size.height])
  return null
}

/** Rain band above the parcel for rainfed / irrigated / mixed steps. */
function RainEffect({ mode }: { mode: 'rain' | 'sprinkler' }) {
  const groupRef = useRef<THREE.Group>(null)
  const drops = useMemo(
    () =>
      Array.from({ length: mode === 'rain' ? 34 : 22 }, (_, i) => ({
        x: (Math.random() - 0.5) * 2.4,
        z: -0.4 + (Math.random() - 0.5) * 1.2,
        speed: 1.6 + Math.random() * 1.4,
        offset: Math.random() * 2.4,
        key: i,
      })),
    [mode],
  )
  useFrame((state) => {
    const group = groupRef.current
    if (!group) return
    const t = state.clock.elapsedTime
    group.children.forEach((child, index) => {
      const drop = drops[index]
      if (!drop) return
      const y = 1.9 - ((t * drop.speed + drop.offset) % 1.35)
      child.position.y = y
      child.scale.y = mode === 'rain' ? 1 : 0.7
    })
  })
  return (
    <group ref={groupRef}>
      {drops.map((drop) => (
        <mesh key={drop.key} position={[drop.x, 1.9, drop.z]} rotation={[0.16, 0, -0.1]}>
          <cylinderGeometry args={[mode === 'rain' ? 0.004 : 0.006, mode === 'rain' ? 0.004 : 0.006, 0.15, 5]} />
          <meshBasicMaterial color={mode === 'rain' ? '#9DC8E8' : '#7FD4FF'} transparent opacity={0.4} />
        </mesh>
      ))}
    </group>
  )
}

/** Soft cloud layers above the parcel, using the generated transparent
 * sprites; two layers drift slowly for depth. Image layers, not volumetric
 * 3D clouds. */
function CloudLayer({ textureUrl, position, scale, opacity, drift }: {
  textureUrl: string
  position: [number, number, number]
  scale: number
  opacity: number
  drift: number
}) {
  const texture = useTexture(textureUrl)
  const meshRef = useRef<THREE.Mesh>(null)
  useEffect(() => {
    texture.colorSpace = THREE.SRGBColorSpace
  }, [texture])
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.position.x = position[0] + Math.sin(state.clock.elapsedTime * 0.12 + drift) * 0.08
    }
  })
  return (
    <mesh ref={meshRef} position={position} renderOrder={5}>
      <planeGeometry args={[6 * scale, 3 * scale]} />
      <meshBasicMaterial map={texture} transparent depthWrite={false} opacity={opacity} />
    </mesh>
  )
}

function WeatherLayer({ mode }: { mode: 'rain' | 'sprinkler' }) {
  return <group>{mode === 'rain' && <CloudLayer textureUrl={rainCloudUrl} position={[0, 2.15, -0.7]} scale={0.37} opacity={0.76} drift={0} />}<RainEffect mode={mode}/></group>
}

const PURPOSE_ICONS: Record<string, { icon: typeof Store; label: string }> = {
  sell: { icon: Store, label: 'Market' },
  livestock_feed: { icon: Beef, label: 'Feed' },
  household_food: { icon: Utensils, label: 'Family' },
  soil_restoration: { icon: Sprout, label: 'Soil' },
}

/** Purpose orbit badges — only the farmer's actual selections appear. */
function PurposeOrbit({ purposes }: { purposes: string[] }) {
  const ringRef = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = state.clock.elapsedTime * 0.24
    }
  })
  const active = purposes.filter((p) => PURPOSE_ICONS[p])
  if (active.length === 0) return null
  return (
    <group ref={ringRef} position={[0, 0.9, 0]}>
      {active.map((purpose, index) => {
        const angle = (index / active.length) * Math.PI * 2
        const x = Math.cos(angle) * 2.9
        const z = Math.sin(angle) * 2.9
        const meta = PURPOSE_ICONS[purpose]
        const Icon = meta.icon
        return (
          <Html key={purpose} position={[x, 0, z]} center distanceFactor={9} zIndexRange={[20, 0]}>
            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#8FE627]/60 bg-[#0B1410]/85 text-[#A3E635] shadow-lg backdrop-blur-sm">
              <Icon size={19} />
            </div>
          </Html>
        )
      })}
    </group>
  )
}

/** Exclusion marker: a stylized crossed patch, never a claimed field zone. */
function ExclusionMarker() {
  return (
    <group position={[0.4, 0.5, 0.2]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.1, 0.85]} />
        <meshBasicMaterial color="#E25C4A" transparent opacity={0.3} />
      </mesh>
      <Html center distanceFactor={9} position={[0, 0.9, 0]}>
        <div className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#FF8B78] bg-[#2A0F0C]/90 text-[#FF9C8B] shadow-lg">
          <ShieldAlert size={17} />
        </div>
      </Html>
    </group>
  )
}

const PRIORITY_META: Record<string, { icon: typeof Droplets; color: string }> = {
  water: { icon: Droplets, color: '#7FB8D8' },
  soil: { icon: Leaf, color: '#8FE627' },
  yield: { icon: TrendingUp, color: '#EFC65A' },
  risk: { icon: HelpCircle, color: '#CFE3D8' },
}

/** Four live weight badges around the terrain reflecting the actual values. */
function PriorityRings({ priorities }: { priorities: Priorities }) {
  const ringRef = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (ringRef.current) {
      ringRef.current.rotation.y = -state.clock.elapsedTime * 0.16
    }
  })
  const keys = ['water', 'soil', 'yield', 'risk'] as const
  return (
    <group ref={ringRef} position={[0, 0.55, 0]}>
      {keys.map((key, index) => {
        const angle = (index / keys.length) * Math.PI * 2 + Math.PI / 4
        const meta = PRIORITY_META[key]
        const Icon = meta.icon
        return (
          <Html
            key={key}
            position={[Math.cos(angle) * 3.15, Math.sin(angle * 2) * 0.42 + 0.35, Math.sin(angle) * 3.15]}
            center
            distanceFactor={10}
            zIndexRange={[20, 0]}
          >
            <div className="flex flex-col items-center gap-1">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-full border bg-[#0B1410]/85 backdrop-blur-sm"
                style={{ borderColor: `${meta.color}88`, color: meta.color }}
              >
                <Icon size={17} />
              </span>
              <span className="rounded-full bg-[#0B1410]/85 px-2 py-0.5 text-[11px] font-extrabold text-white border" style={{ borderColor: `${meta.color}55` }}>
                {priorities[key]}%
              </span>
            </div>
          </Html>
        )
      })}
    </group>
  )
}

/** Floating year cards over the parcel reflecting the ACTUAL crop history —
 * arranged with perspective, connected to the terrain by curved dotted lines
 * (canonical 02_Crop_History.png composition, unboxed). */
function HistoryCards({ badges }: { badges: HistoryBadge[] }) {
  const count = Math.max(1, badges.length)
  return (
    <group>
      {badges.map((badge, index) => {
        const x = (index - (count - 1) / 2) * 1.75
        const y = 2.35 + (index % 2) * 0.22
        const tilt = index < count / 2 ? -10 : 10
        const curvePoints = useMemo(() => {
          const start = new THREE.Vector3(x, y - 0.55, 0)
          const mid = new THREE.Vector3(x * 0.72, (y - 0.55) / 2 + 0.25, 0.25)
          const end = new THREE.Vector3(x * 0.45, 0.32, 0.4)
          return new THREE.CatmullRomCurve3([start, mid, end]).getPoints(24)
        }, [x, y])
        return (
          <group key={`${badge.label}-${index}`}>
            <Line
              points={curvePoints}
              color="#D9F99D"
              lineWidth={1.1}
              dashed
              dashSize={0.09}
              gapSize={0.07}
              transparent
              opacity={0.75}
            />
            <mesh position={[curvePoints[24].x, curvePoints[24].y, curvePoints[24].z]}>
              <sphereGeometry args={[0.035, 8, 8]} />
              <meshBasicMaterial color="#D9F99D" />
            </mesh>
            <Html position={[x, y, 0]} center distanceFactor={10} zIndexRange={[20, 0]}>
              <div
                className="w-[7.5rem] overflow-hidden rounded-xl border border-white/30 shadow-[0_14px_34px_rgba(0,0,0,0.45)]"
                style={{ transform: `perspective(700px) rotateY(${tilt}deg) rotateX(${index % 2 ? 3 : -2}deg)` }}
              >
                {badge.image ? (
                  <img src={badge.image} alt="" className="h-16 w-full object-cover" />
                ) : (
                  <div className="flex h-16 items-center justify-center bg-[#12281E] text-lg text-white/40">
                    {badge.label.includes('/') ? '⏸' : '?'}
                  </div>
                )}
                <p className="truncate bg-white/95 px-2 py-1 text-[11px] font-extrabold text-[#17352D]">
                  <bdi>{badge.label}</bdi>
                </p>
              </div>
            </Html>
          </group>
        )
      })}
    </group>
  )
}

export default function ProceduralField3D({
  geometry,
  step,
  irrigationType,
  historyBadges,
  purposes,
  excludedCount,
  priorities,
  variant = 'panel',
}: FieldSceneProps) {
  const footprint = useMemo(() => buildParcelFootprint(geometry), [geometry])
  if (!footprint) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-white/50">
        No parcel geometry
      </div>
    )
  }

  const rainMode: 'rain' | 'sprinkler' | null =
    step === 'irrigation' && variant !== 'transition'
      ? irrigationType === 'irrigated'
        ? 'sprinkler'
        : irrigationType === 'unknown'
          ? null
          : 'rain'
      : null

  return (
    <Canvas
      dpr={[1, 1.75]}
      shadows
      camera={{ fov: 38, near: 0.1, far: 60 }}
      gl={{ antialias: true, alpha: true }}
      style={{ background: 'transparent' }}
    >
      <FitCamera footprint={footprint} />
      <ambientLight intensity={0.85} />
      <directionalLight
        position={[4.5, 7, 3.5]}
        intensity={1.6}
        color="#FFF3DC"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 3.5, -4]} intensity={0.5} color="#DBE7D7" />
      <directionalLight position={[0, 2.5, -6]} intensity={0.35} color="#E2E6D4" />

      <Float speed={1.3} rotationIntensity={variant === 'transition' ? 0.35 : 0.12} floatIntensity={variant === 'transition' ? 0.9 : 0.45}>
        <group position={[0, 0.32, 0]}>
          <Suspense fallback={null}><AgriculturalTerrain footprint={footprint} /></Suspense>
        </group>
      </Float>

      <ContactShadows position={[0, -0.02, 0]} opacity={0.55} scale={11} blur={2.4} far={3.2} />

      {rainMode && step === 'irrigation' && <WeatherLayer mode={rainMode} />}
      {step === 'history' && historyBadges.length > 0 && <HistoryCards badges={historyBadges} />}
      {step === 'purpose' && <PurposeOrbit purposes={purposes} />}
      {step === 'constraints' && excludedCount > 0 && <ExclusionMarker />}
      {step === 'priorities' && <PriorityRings priorities={priorities} />}
    </Canvas>
  )
}

