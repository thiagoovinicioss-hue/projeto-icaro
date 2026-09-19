import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { sim } from '../../utils/sim'
import { channelAt, colorAt, TRACKS } from '../../story/cinema'

const STAR_COUNT = 320

/** Disco de solo com foco suave (opaco no centro → some na borda). */
function makeGroundAlphaMap(): THREE.CanvasTexture {
  const size = 128
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.55, 'rgba(255,255,255,0.45)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

/**
 * Palco silencioso: céu escuro com gradiente suave, estrelas discretas e o solo
 * que ancora a composição. Nada gira, nada compete — quem conta a história é o
 * foguete e o texto.
 */
export function Backdrop() {
  const skyMatRef = useRef<THREE.MeshBasicMaterial>(null)
  const starsRef = useRef<THREE.Points>(null)
  const starsMatRef = useRef<THREE.PointsMaterial>(null)
  const groundMatRef = useRef<THREE.MeshStandardMaterial>(null)
  const groundAlpha = useMemo(() => makeGroundAlphaMap(), [])

  const starsGeo = useMemo(() => {
    const pos = new Float32Array(STAR_COUNT * 3)
    const col = new Float32Array(STAR_COUNT * 3)
    const base = new THREE.Color('#b8c6dd')
    for (let i = 0; i < STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi = Math.acos(Math.random() * 0.88) // cúpula, sem estrelas no solo
      const r = 74 + Math.random() * 22
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      pos[i * 3 + 1] = r * Math.cos(phi) - 8
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
      const tone = 0.55 + Math.random() * 0.45
      col[i * 3] = base.r * tone
      col[i * 3 + 1] = base.g * tone
      col[i * 3 + 2] = base.b * tone
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
    return geo
  }, [])

  const fogColor = useMemo(() => new THREE.Color(), [])

  useFrame(() => {
    const t = sim.smooth
    colorAt(TRACKS.bg, t, fogColor)
    if (skyMatRef.current) skyMatRef.current.color.copy(fogColor)
    if (starsMatRef.current) starsMatRef.current.opacity = channelAt(TRACKS.stars, t)
    if (starsRef.current) starsRef.current.rotation.y = t * 0.1
    if (groundMatRef.current) groundMatRef.current.opacity = channelAt(TRACKS.ground, t) * 0.35
  })

  return (
    <group name="icaro-backdrop">
      <mesh>
        <sphereGeometry args={[120, 24, 16]} />
        <meshBasicMaterial ref={skyMatRef} side={THREE.BackSide} color="#050a14" fog={false} />
      </mesh>
      <points ref={starsRef} geometry={starsGeo}>
        <pointsMaterial
          ref={starsMatRef}
          color="#c8d5ea"
          vertexColors
          size={0.14}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
          fog={false}
        />
      </points>
      <mesh position={[0, -0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[13, 48]} />
        <meshStandardMaterial
          ref={groundMatRef}
          color="#060b13"
          roughness={1}
          metalness={0}
          transparent
          opacity={0}
          envMapIntensity={0}
          alphaMap={groundAlpha}
          depthWrite={false}
        />
      </mesh>
    </group>
  )
}