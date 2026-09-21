import * as THREE from 'three'

/**
 * Geometria compartilhada da "folha de calendário".
 *
 * A folha é um plano (proporção 0.8, igual à textura 1024×1280) com a aresta
 * DIANTEIRA na origem do mesh — pivô natural da virada de calendário. Dois
 * conjuntos de vértices são pré-computados:
 *
 *  - flat:  repouso, levemente arqueado (o papel "respira", não é plástico);
 *  - sphere: a mesma folha colapsada em BOLA AMASSADA (vértice→esfera com
 *            rugas determinísticas por hash) — de onde a folha volta quando o
 *            papel se desamassa.
 *
 * O motor só interpola entre esses dois alvos a cada frame (JS puro, sem
 * shader), então o "desamassar" parece físico sem física nenhuma.
 */

export const PAGE_W = 1.62
export const PAGE_H = 2.02
export const PAGE_RADIUS_BALL = 0.32

function fract(x: number): number {
  return x - Math.floor(x)
}
function hash(a: number, b: number): number {
  return fract(Math.sin(a * 12.9898 + b * 78.233) * 43758.5453)
}

export type PageGeometry = {
  /** geometria da face impressa (frente) */
  front: THREE.BufferGeometry
  /** gemelha exata — usada no verso com rotação no rig (compartilham deformação) */
  mate: THREE.BufferGeometry
  flat: Float32Array
  sphere: Float32Array
  count: number
}

let instance: PageGeometry | null = null

export function getPageGeometry(): PageGeometry {
  if (instance) return instance

  const segW = 42
  const segH = 52
  const geo = new THREE.PlaneGeometry(PAGE_W, PAGE_H, segW, segH)
  // origem na aresta dianteira: centraliza em Y, depois deita no XZ
  geo.translate(0, PAGE_H / 2, 0)
  geo.rotateX(-Math.PI / 2)

  const pos = geo.attributes.position as THREE.BufferAttribute
  const count = pos.count
  const flat = new Float32Array(pos.array as Float32Array)
  const sphere = new Float32Array(count * 3)

  for (let i = 0; i < count; i++) {
    const x = flat[i * 3]
    const z = flat[i * 3 + 2]
    const zAbs = -z // 0 (dianteira) → PAGE_H (fundo)
    const vf = Math.max(0, Math.min(1, zAbs / PAGE_H))
    const ux = x / PAGE_W

    // arco sutil de repouso — o papel respira e projeta micro-sombra nas bordas
    flat[i * 3 + 1] += 0.018 * Math.sin(Math.PI * vf) + (hash(x + 7.1, zAbs * 3.7) - 0.5) * 0.008

    // ---- colapso em bola amassada ----
    const lat = vf * Math.PI * 0.97
    const lon = Math.PI * 0.5 + ux * Math.PI * 0.92
    const sLat = Math.sin(lat)
    const dy = -Math.cos(lat)
    const sLon = Math.sin(lon)
    const cLon = Math.cos(lon)

    const wr1 = hash(x * 2.3 + zAbs * 0.9, i + 31)
    const wr2 = hash(x * 0.7 - zAbs * 1.3, i + 77)
    const eqBoost = Math.pow(Math.sin(lat * 0.62), 2.4)
    const radial = 1 + (wr1 - 0.5) * 0.34 * (0.35 + eqBoost) + (wr2 - 0.5) * 0.16

    sphere[i * 3] = sLat * cLon * PAGE_RADIUS_BALL * radial
    sphere[i * 3 + 1] = dy * PAGE_RADIUS_BALL * radial * 0.92
    sphere[i * 3 + 2] = sLat * sLon * PAGE_RADIUS_BALL * radial
  }

  geo.setAttribute('position', new THREE.BufferAttribute(flat.slice(), 3))
  geo.computeVertexNormals()

  // gêmea exata (mesma deformação), virada no rig para virar verso
  const mate = geo.clone()

  instance = { front: geo, mate, flat, sphere, count }
  return instance
}

export type DeformState = {
  /** 0 = plano (repouso) · 1 = bola amassada */
  crumple: number
  /** curvatura de virada (soma em +Y, "papel envergando") */
  curl: number
}

/** Escreve a pose deformada em uma geometria. Barato: ~poucos milhares de vértices. */
export function writeDeform(geometry: THREE.BufferGeometry, state: DeformState): void {
  const pos = geometry.attributes.position as THREE.BufferAttribute
  const { flat, sphere, count } = getPageGeometry()
  const arr = pos.array as Float32Array
  const t = state.crumple
  const inv = 1 - t
  const curl = state.curl
  for (let i = 0; i < count; i++) {
    const j = i * 3
    arr[j] = flat[j] * inv + sphere[j] * t
    arr[j + 1] = flat[j + 1] * inv + sphere[j + 1] * t
    arr[j + 2] = flat[j + 2] * inv + sphere[j + 2] * t
    if (curl !== 0) {
      const zAbs = -arr[j + 2]
      const vf = Math.max(0, Math.min(1, zAbs / PAGE_H))
      arr[j + 1] += Math.sin(Math.PI * Math.pow(vf, 0.72)) * curl
    }
  }
  pos.needsUpdate = true
  geometry.computeVertexNormals()
}

/* ------------------------------ easing ------------------------------ */

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function easeInCubic(t: number): number {
  return t * t * t
}

export function easeInQuint(t: number): number {
  return t * t * t * t * t
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3)
}

export function easeQuintOut(t: number): number {
  return 1 - Math.pow(1 - t, 5)
}

export function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t
}

/** easeOutBack — leve overshoot ao "estalar" no fim (papel assentando). */
export function easeOutBack(t: number): number {
  const c1 = 1.70158
  const c3 = c1 + 1
  const u = t - 1
  return 1 + c3 * u * u * u + c1 * u * u
}