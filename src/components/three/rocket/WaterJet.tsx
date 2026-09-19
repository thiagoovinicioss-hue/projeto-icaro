import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sim, quality } from '../../../utils/sim'
import { jetAt } from '../../../story/cinema'
import { dropletCount } from './materials'
import type { RocketMaterials } from './materials'

const COUNT = dropletCount()
const LEN = 7
const MAX_SPREAD = 0.85

/**
 * Propulsão por AR + ÁGUA: um cone de gotículas, uma coluna de água e névoa —
 * nada de fogo. As gotas são um campo procedural (sem estado por partícula):
 * cada direção unitária vive na geometria; o emissor avança com `time*jet`,
 * então ao zerar o jato tudo fica transparente e imóvel.
 */
export function WaterJet({ mats }: { mats: RocketMaterials }) {
  const pointsRef = useRef<THREE.Points>(null)
  const coneRef = useRef<THREE.Mesh>(null)
  const mistRef = useRef<THREE.Sprite>(null)
  const lightRef = useRef<THREE.PointLight>(null)

  const dropletsGeo = useMemo(() => {
    const pos = new Float32Array(COUNT * 3)
    for (let i = 0; i < COUNT; i++) {
      const seed = Math.random()
      const spread = 0.04 + seed * MAX_SPREAD
      const a = Math.random() * Math.PI * 2
      pos[i * 3] = Math.sin(spread) * Math.cos(a)
      pos[i * 3 + 1] = -Math.cos(spread)
      pos[i * 3 + 2] = Math.sin(spread) * Math.sin(a)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    return geo
  }, [])

  useFrame((state) => {
    const jet = jetAt(sim.smooth)
    const o = Math.min(1, jet * 1.15)
    const time = quality.reducedMotion ? 0 : state.clock.elapsedTime
    const rate = jet * 0.55

    if (pointsRef.current) {
      const attr = dropletsGeo.attributes.position as THREE.BufferAttribute
      const arr = attr.array as Float32Array
      for (let i = 0; i < COUNT; i++) {
        const ph = (time * rate + i * 0.37) % 1
        const dist = ph * LEN
        arr[i * 3] = attr.getX(i) * dist
        arr[i * 3 + 1] = attr.getY(i) * dist * 0.35 + (1 - ph) * -1.6
        arr[i * 3 + 2] = attr.getZ(i) * dist
      }
      attr.needsUpdate = true
      ;(pointsRef.current.material as THREE.PointsMaterial).opacity = o
    }

    if (coneRef.current) {
      const mat = coneRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = Math.min(0.75, jet * (0.5 + jet * 0.5))
      coneRef.current.scale.set(1, Math.max(0.02, jet * (1 + jet * 0.8)), 1)
    }
    if (mistRef.current) {
      ;(mistRef.current.material as THREE.SpriteMaterial).opacity = jet * 0.4
      const ms = 0.4 + jet * 2.6
      mistRef.current.scale.set(ms, ms, 1)
    }
    if (lightRef.current) lightRef.current.intensity = jet * 9
  })

  return (
    <>
      <points ref={pointsRef} geometry={dropletsGeo} material={mats.droplets} />
      <mesh ref={coneRef} rotation={[Math.PI, 0, 0]} material={mats.jet}>
        <coneGeometry args={[0.14, 2.4, 16, 1, true]} />
      </mesh>
      <sprite ref={mistRef} material={mats.mist} scale={[1, 1, 1]} />
      <pointLight ref={lightRef} color="#bfe3ff" intensity={0} distance={7} decay={2} />
    </>
  )
}