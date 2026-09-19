import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sim } from '../../utils/sim'
import { channelAt, TRACKS } from '../../story/cinema'
import { makeSoftRadialTexture } from './rocket/materials'

/**
 * A aurora do lançamento: um arco dourado (marca) e um halo quente atrás do
 * foguete que sobe. Só nasce no clímax — o dourado é luz/cenário, nunca chama.
 */
export function ClimaxGlow() {
  const arcMatRef = useRef<THREE.MeshBasicMaterial>(null)

  const glowTexture = useMemo(
    () => makeSoftRadialTexture('rgba(255,225,160,0.9)', 'rgba(246,183,60,0)'),
    [],
  )

  const haloMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: glowTexture,
        color: '#ffd975',
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    [glowTexture],
  )

  useFrame(() => {
    const t = sim.smooth
    const arc = channelAt(TRACKS.arc, t)
    const halo = channelAt(TRACKS.halo, t)
    if (arcMatRef.current) arcMatRef.current.opacity = arc
    haloMat.opacity = halo
  })

  return (
    <group name="icaro-climax">
      <mesh position={[0, 26, -13]} rotation={[0, 0, Math.PI / 4]}>
        <torusGeometry args={[6.2, 0.035, 10, 120, Math.PI * 1.4]} />
        <meshBasicMaterial ref={arcMatRef} color="#f6b73c" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} side={THREE.DoubleSide} fog={false} />
      </mesh>
      <sprite material={haloMat} position={[0, 16, -8]} scale={[34, 34, 1]} />
    </group>
  )
}