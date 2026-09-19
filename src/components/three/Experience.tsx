import { useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import * as THREE from 'three'
import { quality } from '../../utils/sim'
import { Conductor } from './Conductor'
import { Backdrop } from './Backdrop'
import { LaunchStand } from './LaunchStand'
import { ClimaxGlow } from './ClimaxGlow'
import { Rocket } from './rocket/Rocket'
import { Post } from './Post'
import { DebugHud } from './DebugHud'
import { StaticScene } from './StaticScene'

type Frameloop = 'always' | 'demand' | 'never'

function isDebugMode(): boolean {
  if (typeof window === 'undefined') return false
  const p = new URLSearchParams(window.location.search)
  return p.has('debug3d') || p.has('stage3d')
}

/**
 * A nova experiência: 5 composições fortes, scroll como fonte de verdade,
 * água como propulsão. Ortografia visual quieta — o 3D serve ao texto.
 */
export function Experience() {
  const [frameloop, setFrameloop] = useState<Frameloop>('always')
  const [debug] = useState(isDebugMode)

  useEffect(() => {
    const update = () => setFrameloop(document.hidden ? 'demand' : 'always')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])

  return (
    <>
      <Canvas
        frameloop={frameloop}
        dpr={[1, quality.dprCap]}
        shadows={quality.shadows}
        gl={{
          antialias: true,
          powerPreference: 'high-performance',
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 0.9,
        }}
        camera={{ position: [0.1, 1.55, 6.7], fov: 45, near: 0.1, far: 260 }}
        className="three-canvas"
        fallback={<StaticScene />}
        style={{ pointerEvents: 'none' }}
      >
        <color attach="background" args={['#050a14']} />
        <fog attach="fog" args={['#050a14', 3, 20]} />

        <Conductor />
        <Backdrop />
        <LaunchStand />
        <ClimaxGlow />
        <Rocket />
        <Post />
      </Canvas>
      {debug && <DebugHud />}
    </>
  )
}