import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sim } from '../../utils/sim'
import { channelAt, TRACKS } from '../../story/cinema'

const STAND_X = 1.15

/** Disco de solo com foco suave (opaco no centro → some na borda). */
function makeAlphaMap(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.42)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Base de lançamento artesanal do Projeto Ícaro — SÓ aparência, fiel à base
 * real da fotografia:
 *
 * - armação tubular BAIXA, quase no chão: dois tubos cruzados (PVC claro) +
 *   braço lateral; nada de tripé alto nem torre;
 * - peça central: junção/T de PVC com soquete, cinta azul e o "lift-off" do
 *   foguete (a boca da garrafa apoia no plugue);
 * - tubo vertical ESTREITO marrom/bege subindo do centro (simples, artesanal);
 * - acentos AZUIS (mesmo azul do foguete) discretos;
 * - pequena peça VERMELHA fosca rente ao chão;
 * - terreno local escuro (contato/vegetação estilizada) + sombra de contato;
 * - variações sutis de tom/tilt — nada de aparência de fábrica.
 *
 * Aparece via TRACKS.stand (montagem/preparação) e segue o move com o foguete.
 */
export function LaunchStand() {
  const groupRef = useRef<THREE.Group>(null)
  const fade = useRef(0)
  const alphaMap = useMemo(() => makeAlphaMap(), [])

  const mats = useMemo(() => {
    const mk = (
      color: string,
      roughness: number,
      extra: Partial<THREE.MeshStandardMaterialParameters> = {},
    ) =>
      new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0,
        roughness,
        metalness: 0,
        envMapIntensity: 0.5,
        ...extra,
      })
    const p = (m: THREE.MeshStandardMaterial, opacity: number) => {
      m.userData.baseOpacity = opacity
      return m
    }

    const pvcA = p(mk('#d9d2c3', 0.92), 1)
    const pvcB = p(mk('#ccc4b4', 0.88), 1)
    const gray = p(mk('#babec0', 0.9), 1)
    const blue = p(mk('#3a7fce', 0.62), 1)
    const red = p(mk('#bf5330', 0.95), 1)
    const brown = p(mk('#9d835f', 0.9), 1)
    const terrain = p(
      new THREE.MeshStandardMaterial({
        color: '#1b2534',
        transparent: true,
        opacity: 0,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0,
        alphaMap,
        depthWrite: false,
      }),
      0,
    )
    const shadow = p(
      new THREE.MeshStandardMaterial({
        color: '#010307',
        transparent: true,
        opacity: 0,
        roughness: 1,
        metalness: 0,
        envMapIntensity: 0,
        alphaMap,
        depthWrite: false,
      }),
      0,
    )
    return { pvcA, pvcB, gray, blue, red, brown, terrain, shadow, list: [pvcA, pvcB, gray, blue, red, brown] }
  }, [alphaMap])

  /**
   * Cada pedaço é pvc claro/neutro com pequenas variações de tom e tilt —
   * montado à mão, nunca simétrico perfeito. Geometria enxuta: cilindros de
   * segmentos baixos (rendimento WebGL).
   */
  const parts = useMemo(() => {
    const tube = (
      len: number,
      r: number,
      seg: number,
      pos: [number, number, number],
      rot: [number, number, number],
      mat: THREE.Material,
    ) => (
      <mesh position={pos} rotation={rot} material={mat}>
        <cylinderGeometry args={[r, r, len, seg]} />
      </mesh>
    )

    return (
      <>
        {/* Terreno local (grama estilizada) + sombra de contato */}
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.terrain}>
          <circleGeometry args={[2.0, 36]} />
        </mesh>
        <mesh position={[0, 0.018, 0]} rotation={[-Math.PI / 2, 0, 0]} material={mats.shadow}>
          <circleGeometry args={[1.15, 32]} />
        </mesh>

        {/* Armação horizontal baixa: X de tubos + braço lateral */}
        {tube(1.28, 0.036, 12, [0, 0.065, 0], [Math.PI / 2, 0, 0.0], mats.pvcA)}
        {tube(0.92, 0.032, 10, [0.04, 0.05, 0], [0, 0, Math.PI / 2], mats.pvcB)}
        {tube(0.5, 0.029, 10, [0.52, 0.045, 0.3], [0.1, 0.12, 0.16], mats.pvcA)}
        {tube(0.55, 0.027, 8, [-0.34, 0.16, 0.1], [0.18, 0.02, -0.5], mats.gray)}

        {/* Conexões/Ts aparentes nas pontas e no centro */}
        {tube(0.06, 0.05, 12, [0.64, 0.065, 0], [0, 0, 0], mats.pvcB)}
        {tube(0.06, 0.05, 12, [-0.64, 0.065, 0], [0, 0, 0], mats.gray)}
        {tube(0.06, 0.046, 10, [0.04, 0.05, 0.46], [0, 0, 0], mats.pvcA)}
        {tube(0.06, 0.046, 10, [0.04, 0.05, -0.44], [0, 0, 0], mats.gray)}
        {tube(0.16, 0.055, 12, [0.48, 0.045, 0.3], [0, 0, 0.1], mats.pvcB)}

        {/* Peça vermelha: tampa fosca rente ao chão */}
        {tube(0.05, 0.05, 12, [-0.7, 0.045, 0.0], [0.2, 0, 0], mats.red)}

        {/* Junção central: soquete + riser marrom + plugue + fitas azuis */}
        {tube(0.16, 0.058, 12, [0, 0.085, 0], [Math.PI / 2, 0, 0], mats.pvcB)}
        {tube(0.14, 0.048, 12, [0, 0.15, 0], [0, 0, 0.015], mats.pvcA)}
        {tube(0.26, 0.034, 10, [0, 0.28, 0], [0, 0, 0.02], mats.brown)}
        {tube(0.09, 0.052, 14, [0, 0.375, 0], [0, 0, 0.02], mats.pvcB)}
        {tube(0.05, 0.06, 12, [0, 0.21, 0], [0, 0, 0.02], mats.blue)}
        {tube(0.05, 0.06, 12, [0, 0.3, 0], [0, 0, 0.02], mats.blue)}
        {tube(0.045, 0.052, 12, [0.32, 0.07, 0.06], [0, 0, Math.PI / 2], mats.blue)}
      </>
    )
  }, [mats])

  useFrame(() => {
    const o = channelAt(TRACKS.stand, sim.smooth)
    fade.current = o
    if (groupRef.current) groupRef.current.visible = o > 0.01
    for (const m of mats.list) m.opacity = Math.max(0, o * (m.userData.baseOpacity ?? 1))
    mats.terrain.opacity = o * 0.72
    mats.shadow.opacity = o * 0.42
  })

  return (
    <group ref={groupRef} name="icaro-launch-stand" position={[STAND_X, 0, 0]}>
      <group>{parts}</group>
    </group>
  )
}