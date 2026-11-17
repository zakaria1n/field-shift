import React, { Suspense, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, OrbitControls } from '@react-three/drei'
import { AgriculturalTerrain } from './AgriculturalTerrain'
import { buildParcelFootprint } from './parcelGeometry'
import { FitCamera } from './ProceduralField3D'
const shapes: Record<string, number[][]> = {
  rectangle: [[-6.8,33.9],[-6.795,33.9],[-6.795,33.903],[-6.8,33.903],[-6.8,33.9]],
  irregular: [[-6.8,33.9],[-6.798,33.899],[-6.795,33.9],[-6.794,33.902],[-6.797,33.904],[-6.801,33.902],[-6.8,33.9]],
  narrow: [[-6.8,33.9],[-6.787,33.9],[-6.787,33.9007],[-6.8,33.9007],[-6.8,33.9]],
}
function Preview() {
 const [shape,setShape]=useState('rectangle')
 const footprint=useMemo(()=>buildParcelFootprint({type:'Polygon',coordinates:[shapes[shape]]})!,[shape])
 return <><header style={{padding:'12px 20px',display:'flex',gap:12,alignItems:'center'}}><strong>DEV • Illustrative parcel</strong>{Object.keys(shapes).map(s=><button key={s} onClick={()=>setShape(s)} aria-pressed={shape===s}>{s}</button>)}</header><div style={{height:'calc(100vh - 60px)'}}><Canvas dpr={[1,1.5]} shadows camera={{fov:38,near:0.1,far:60}}><FitCamera footprint={footprint}/><ambientLight intensity={0.85}/><directionalLight position={[4.5,7,3.5]} intensity={1.6} color="#fff3dc" castShadow/><directionalLight position={[-5,3.5,-4]} intensity={0.5} color="#dbe7d7"/><Suspense fallback={null}><AgriculturalTerrain footprint={footprint}/></Suspense><ContactShadows position={[0,-0.02,0]} opacity={0.55} scale={11} blur={2.4} far={3.2}/><OrbitControls target={[0,0.16,0]}/></Canvas></div></>
}
createRoot(document.getElementById('root')!).render(<Preview />)
