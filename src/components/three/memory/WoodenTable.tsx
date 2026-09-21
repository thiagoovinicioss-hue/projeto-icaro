import { useLayoutEffect, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { makeWoodTexture } from './memoryTextures'

/**
 * Mesa redonda da cena da memória. Vista de cima/ângulo semi-superior, com a
 * superfície em tons quentes de madeira e um anel de brilho âmbar na borda.
 * `r` = raio em unidades do mundo; o contorno circular responde ao enquadramento.
 * `fadeRef` (opcional) controla a opacidade geral na entrada da cena — a mesa
 * nasce junto com o calendário, sem pop.
 */

type Props = {
  r: number
  fadeRef?: MutableRefObject<number>
}

const PLANKS_PERIOD = 0.42

function useWoodTexture(): THREE.CanvasTexture {
  return useMemo(() => makeWoodTexture(), [])
}

/** Disco do tampo com UV planar (veios retos, não radiais) — escala em unidades de mundo. */
function useTableTopGeometry(r: number): THREE.BufferGeometry {
  return useMemo(() => {
    const geo = new THREE.CircleGeometry(r, 88)
    const pos = geo.attributes.position as THREE.BufferAttribute
    const count = pos.count
    const uvs = new Float32Array(count * 2)
    for (let i = 0; i < count; i++) {
      uvs[i * 2] = pos.getX(i) / PLANKS_PERIOD
      uvs[i * 2 + 1] = pos.getZ(i) / PLANKS_PERIOD
    }
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
    return geo
  }, [r])
}

/** Gradiente radial para a vinheta de borda (e hotspot central claro/âmbar). */
function useVignetteTexture(edgesDark: boolean): THREE.CanvasTexture {
  return useMemo(() => {
    const size = 256
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.06, size / 2, size / 2, size / 2)
    if (edgesDark) {
      g.addColorStop(0, 'rgba(0, 0, 0, 0)')
      g.addColorStop(0.62, 'rgba(0, 0, 0, 0)')
      g.addColorStop(0.86, 'rgba(0, 0, 0, 0.28)')
      g.addColorStop(1, 'rgba(22, 12, 4, 0.7)')
    } else {
      g.addColorStop(0, 'rgba(255, 184, 92, 0.18)')
      g.addColorStop(0.4, 'rgba(255, 224, 170, 0.05)')
      g.addColorStop(1, 'rgba(255, 180, 90, 0)')
    }
    ctx.fillStyle = g
    ctx.fillRect(0, 0, size, size)
    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    return tex
  }, [edgesDark])
}

export function WoodenTable({ r, fadeRef }: Props) {
  const root = useRef<THREE.Group>(null)
  const wood = useWoodTexture()
  const topGeo = useTableTopGeometry(r)
  const vignette = useVignetteTexture(true)
  const hotspot = useVignetteTexture(false)
  const edgeGeo = useMemo(() => new THREE.CylinderGeometry(r, r, 0.34, 88, 1, true), [r])
  const rimGeo = useMemo(() => new THREE.TorusGeometry(r, 0.05, 24, 120), [r])
  const glowGeo = useMemo(() => new THREE.TorusGeometry(r + 0.015, 0.016, 16, 120), [r])

  useLayoutEffect(() => {
    topGeo.computeVertexNormals()
  }, [topGeo])

  // fade geral da mesa (entra junto com o calendário)
  useFrame(() => {
    const v = fadeRef?.current ?? 1
    root.current?.traverse((o) => {
      if (!(o as THREE.Mesh).isMesh) return
      const m = (o as THREE.Mesh).material as THREE.Material & { transparent: boolean; opacity: number }
      if (!m) return
      m.transparent = true
      m.opacity = v
    })
  })

  return (
    <group ref={root} name="retro-table">
      {/* tampo */}
      <mesh geometry={topGeo} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <meshStandardMaterial
          map={wood}
          roughness={0.58}
          metalness={0.1}
          envMapIntensity={0.3}
          color="#6a4a22"
        />
      </mesh>

      {/* lateral (espessura) */}
      <mesh geometry={edgeGeo} position={[0, -0.17, 0]}>
        <meshStandardMaterial
          map={wood}
          roughness={0.8}
          metalness={0.08}
          color="#1a1106"
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* aro discreto na borda do tampo */}
      <mesh geometry={rimGeo} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.015, 0]}>
        <meshStandardMaterial color="#5a3c16" roughness={0.5} metalness={0.35} />
      </mesh>

      {/* brilho âmbar na borda — a assinatura quente */}
      <mesh geometry={glowGeo} rotation={[Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} renderOrder={4}>
        <meshBasicMaterial color="#ffc164" transparent opacity={0.7} depthWrite={false} />
      </mesh>

      {/* hotspot central (luz de abajur âmbar) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]} renderOrder={2}>
        <circleGeometry args={[r * 0.86, 48]} />
        <meshBasicMaterial
          map={hotspot}
          transparent
          opacity={0.9}
          depthWrite={false}
          color="#ffffff"
        />
      </mesh>

      {/* vinheta escura nas bordas */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.014, 0]} renderOrder={3}>
        <circleGeometry args={[r, 48]} />
        <meshBasicMaterial
          map={vignette}
          transparent
          opacity={0.85}
          depthWrite={false}
          color="#ffffff"
        />
      </mesh>
    </group>
  )
}