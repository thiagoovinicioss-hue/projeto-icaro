import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sim, quality } from '../../../utils/sim'
import { rocketAt, fillAt, channelAt, TRACKS } from '../../../story/cinema'
import { ROCKET_DIMENSIONS } from './dimensions'
import { makeFinGeometry } from './finGeometry'
import {
  makeBottleGeometry,
  makeBottleBottom,
  makeBlueSleeveGeometry,
  bottleRadiusAt,
} from './bottleGeometry'
import { useRocketMaterials } from './materials'
import { WaterJet } from './WaterJet'

const FIN_ANGLES = [45, 135, 225, 315].map((deg) => (deg * Math.PI) / 180)
const WATER_BOTTOM = ROCKET_DIMENSIONS.water.bottomY
const WATER_H = ROCKET_DIMENSIONS.water.height
const _emissive = new THREE.Color('#1558b8')
const _warmEmissive = new THREE.Color('#e2913a')

/**
 * O Ícaro como UMA peça coerente:
 * - corpo = UMA superfície de revolução (2L PET), região azul inferior pintada
 *   na própria pele (sem cilindro/luve extra);
 * - cone preto artesanal assentado no fundo plano (mesmo eixo, sem costura);
 * - 4 aletas de papelão com a borda interna mergulhada no corpo, presas por
 *   cintas de fita azul (nada de argolas soltas);
 * - bico plástico simples no pescoço; propulsão = água.
 * Geometrias sempre no mesmo espaço normalizado (y=0 na boca).
 */
export function Rocket() {
  const mats = useRocketMaterials()
  const groupRef = useRef<THREE.Group>(null)
  const waterRef = useRef<THREE.Mesh>(null)
  const meniscusRef = useRef<THREE.Mesh>(null)
  const rocketSample = useRef({ position: new THREE.Vector3(), quaternion: new THREE.Quaternion() })

  const bottleGeo = useMemo(makeBottleGeometry, [])
  const sleeveGeo = useMemo(makeBlueSleeveGeometry, [])
  const bottomGeo = useMemo(makeBottleBottom, [])
  const fins = useMemo(() => FIN_ANGLES.map(makeFinGeometry), [])

  const seamRing = useMemo(() => {
    const y = ROCKET_DIMENSIONS.tapeEdge.at[0]
    return { y, radius: bottleRadiusAt(y) + ROCKET_DIMENSIONS.tapeEdge.offset }
  }, [])

  useFrame((state) => {
    const t = sim.smooth
    const pose = rocketAt(t, quality.reducedMotion, state.clock.elapsedTime, rocketSample.current)
    if (groupRef.current) {
      groupRef.current.position.copy(pose.position)
      groupRef.current.quaternion.copy(pose.quaternion)
    }

    const f = Math.max(0.01, fillAt(t))
    if (waterRef.current) {
      waterRef.current.scale.y = f
      waterRef.current.position.y = WATER_BOTTOM + (WATER_H * f) / 2
    }
    if (meniscusRef.current) {
      meniscusRef.current.position.y = WATER_BOTTOM + WATER_H * f
    }

    // Luz de capítulo na água: fria nas passagens neutras, dourada na
    // classificação, reservada no progresso, incandescente na preparação.
    const warm = channelAt(TRACKS.warm, t)
    _emissive.set('#1558b8').lerp(_warmEmissive, warm)
    mats.water.emissive.copy(_emissive)
    mats.water.emissiveIntensity = 0.24 + warm * 0.55
  })

  return (
    <group ref={groupRef} name="icaro-water-rocket">
      {/* Corpo: UMA superfície PET; saia azul=luvinha fina; fita na costura */}
      <mesh geometry={sleeveGeo} material={mats.blue} renderOrder={1} />
      <mesh geometry={bottleGeo} material={mats.pet} renderOrder={2} />
      {/* Fita única na costura azul→claro */}
      <mesh position={[0, seamRing.y, 0]} material={mats.tape}>
        <torusGeometry args={[seamRing.radius, ROCKET_DIMENSIONS.tapeEdge.tube, 10, 40]} />
      </mesh>

      {/* Água interna (drena no lançamento) */}
      <mesh
        ref={waterRef}
        position={[0, WATER_BOTTOM + (WATER_H * 0.5) / 2, 0]}
        material={mats.water}
        renderOrder={1}
      >
        <cylinderGeometry args={[ROCKET_DIMENSIONS.water.radius, ROCKET_DIMENSIONS.water.radius, WATER_H, 32]} />
      </mesh>
      <mesh ref={meniscusRef} position={[0, WATER_BOTTOM + WATER_H * 0.5, 0]} material={mats.waterSkin} renderOrder={1}>
        <cylinderGeometry args={[ROCKET_DIMENSIONS.water.radius, ROCKET_DIMENSIONS.water.radius, 0.05, 32]} />
      </mesh>

      {/* Disco selando o fundo (invisível sob o cone) */}
      <mesh geometry={bottomGeo} position={[0, ROCKET_DIMENSIONS.bodyTopY - 0.01, 0]} material={mats.cone} />

      {/* Cone preto com ponta AFIADA (cones de pet/folha, sem capuz redondo) */}
      <mesh position={[0, ROCKET_DIMENSIONS.cone.baseY + ROCKET_DIMENSIONS.cone.height / 2, 0]} material={mats.cone}>
        <coneGeometry args={[ROCKET_DIMENSIONS.cone.baseRadius, ROCKET_DIMENSIONS.cone.height, 48]} />
      </mesh>

      {/* Aletas de papelão, borda interna mordendo a carcaça */}
      {fins.map((geo, i) => (
        <mesh key={i} geometry={geo} material={mats.fin} />
      ))}

      {/* Bico plástico (pescoço da garrafa) — sem argolas */}
      <mesh position={[0, -ROCKET_DIMENSIONS.nozzle.height / 2, 0]} material={mats.nozzle}>
        <cylinderGeometry
          args={[
            ROCKET_DIMENSIONS.nozzle.baseRadius,
            ROCKET_DIMENSIONS.nozzle.lipRadius,
            ROCKET_DIMENSIONS.nozzle.height,
            24,
          ]}
        />
      </mesh>
      <mesh position={[0, -ROCKET_DIMENSIONS.nozzle.height - 0.03, 0]} material={mats.nozzle}>
        <cylinderGeometry args={[ROCKET_DIMENSIONS.nozzle.tipRadius, ROCKET_DIMENSIONS.nozzle.tipRadius, 0.06, 24]} />
      </mesh>

      {/* Jato de água / spray abaixo do bico */}
      <group position={[0, -0.32, 0]}>
        <WaterJet mats={mats} />
      </group>
    </group>
  )
}