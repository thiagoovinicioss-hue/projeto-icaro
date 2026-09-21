import * as THREE from 'three'

/**
 * Geometria paramétrica do mouse retrô com cabo (§28/§30) — substitui o
 * conjunto "chassis + esfera" que lia como uma bola branca. É uma superfície
 * de loft fechada: o bico aponta para -Z (em direção ao monitor), a traseira
 * bojuda para +Z (à mão), o fundo é plano em y=0 (assenta no tampo).
 *
 * A seção transversal é um "D" (domo em cima, sola reta embaixo) com perfis de
 * largura/altura suaves ao longo do comprimento. Uma ranhura de partição das
 * cascas superior/inferior é esculpida como uma reentrância a altura constante
 * (sombra de geometria, não linha preta) e uma canaleta central escavada à
 * frente aloja a rodinha. Os botões são cascas flutuantes separadas do corpo.
 */

export const MOUSE_LEN = 0.115
export const MOUSE_MAX_W = 0.067
export const MOUSE_MAX_H = 0.036
export const MOUSE_HALF_L = MOUSE_LEN / 2
export const MOUSE_HALF_W = MOUSE_MAX_W / 2

/** altura da costura das cascas (perto do fundo, como num mouse real). */
export const MOUSE_SEAM_H = 0.0064

const SEAM_W = 0.0030
const SEAM_INSET = 0.08

const DIP_DEPTH = 0.0058
const DIP_P = 0.14
const DIP_SIGMA_P = 0.10
const DIP_SIGMA_T = 0.17

/* faixa dos botões (param. do comprimento). */
export const BTN_P0 = 0.03
export const BTN_P1 = 0.5
const BTN_LIFT = 0.0011

type Pt = readonly [number, number]

/* 0 = bico, 1 = traseira. */
const W_PROFILE: readonly Pt[] = [
  [0, 0.58],
  [0.1, 0.76],
  [0.26, 0.92],
  [0.46, 1.0],
  [0.66, 1.0],
  [0.84, 0.94],
  [0.94, 0.82],
  [1, 0.6],
]
const H_PROFILE: readonly Pt[] = [
  [0, 0.12],
  [0.08, 0.26],
  [0.2, 0.46],
  [0.38, 0.7],
  [0.58, 0.92],
  [0.68, 1.0],
  [0.82, 0.95],
  [0.92, 0.8],
  [1, 0.5],
]

function smoothstep(t: number): number {
  return t * t * (3 - 2 * t)
}

function sampleProfile(pts: readonly Pt[], p: number): number {
  if (p <= pts[0][0]) return pts[0][1]
  const last = pts[pts.length - 1]
  if (p >= last[0]) return last[1]
  for (let i = 0; i < pts.length - 1; i++) {
    const [p0, v0] = pts[i]
    const [p1, v1] = pts[i + 1]
    if (p >= p0 && p <= p1) {
      const t = smoothstep((p - p0) / (p1 - p0))
      return v0 + (v1 - v0) * t
    }
  }
  return last[1]
}

export function mouseWidth(p: number): number {
  return MOUSE_HALF_W * sampleProfile(W_PROFILE, p)
}

export function mouseHeight(p: number): number {
  return MOUSE_MAX_H * sampleProfile(H_PROFILE, p)
}

/** metade do vão central entre os botões: abre no bico (canaleta da rodinha). */
export function buttonGapHalf(p: number): number {
  const d = p - DIP_P
  return 0.05 + 0.15 * Math.exp(-(d * d) / (0.11 * 0.11))
}

function troughFactor(p: number, theta: number): number {
  const dp = p - DIP_P
  const dt = theta - Math.PI / 2
  return (
    Math.exp(-(dp * dp) / (DIP_SIGMA_P * DIP_SIGMA_P)) *
    Math.exp(-(dt * dt) / (DIP_SIGMA_T * DIP_SIGMA_T))
  )
}

export function mouseTrough(p: number, theta: number): number {
  return DIP_DEPTH * troughFactor(p, theta)
}

/** Ponto na casca. y=0 no fundo, -z no bico, +z na traseira. */
export function mouseShellPoint(
  p: number,
  theta: number,
  withDip: boolean,
  out: THREE.Vector3,
): THREE.Vector3 {
  const w = mouseWidth(p)
  const h = mouseHeight(p)
  const c = Math.cos(theta)
  const s = Math.sin(theta)
  let x = w * c
  let y = s > 0 ? h * Math.pow(s, 0.9) : 0
  const g = Math.exp(-Math.pow((y - MOUSE_SEAM_H) / SEAM_W, 2))
  x *= 1 - SEAM_INSET * g
  y -= 0.00045 * g
  if (withDip) y -= mouseTrough(p, theta)
  out.set(x, y, -MOUSE_HALF_L + p * MOUSE_LEN)
  return out
}

const _pa = new THREE.Vector3()
const _pb = new THREE.Vector3()
const _pt = new THREE.Vector3()

/** Normal voltada para fora (diferencial finito). */
export function mouseShellNormal(
  p: number,
  theta: number,
  withDip: boolean,
  out: THREE.Vector3,
): THREE.Vector3 {
  const ep = 0.004
  const et = 0.02
  mouseShellPoint(Math.min(1, p + ep), theta, withDip, _pa)
  mouseShellPoint(Math.max(0, p - ep), theta, withDip, _pb)
  _pa.sub(_pb) // tangente ao longo de p
  mouseShellPoint(p, theta + et, withDip, _pt)
  mouseShellPoint(p, theta - et, withDip, _pb)
  _pt.sub(_pb) // tangente ao longo de theta
  out.crossVectors(_pt, _pa).normalize()
  return out
}

const UPPER: readonly [number, number, number] = [1, 1, 1]
const LOWER: readonly [number, number, number] = [0.8, 0.78, 0.7]
const CAVITY: readonly [number, number, number] = [0.3, 0.28, 0.24]

function shellColor(p: number, theta: number, y: number, out: [number, number, number]): void {
  const base = y > MOUSE_SEAM_H ? UPPER : LOWER
  const dip = mouseTrough(p, theta)
  let t = 0
  if (dip > 0.0007) t = Math.min(1, (dip - 0.0007) / 0.0038)
  out[0] = base[0] + (CAVITY[0] - base[0]) * t
  out[1] = base[1] + (CAVITY[1] - base[1]) * t
  out[2] = base[2] + (CAVITY[2] - base[2]) * t
}

/**
 * Corpo fechado do mouse (loft + tampas no bico e na traseira). Inclui cores de
 * vértice para dividir casca superior/inferior e escurecer a canaleta.
 */
export function makeMouseBodyGeometry(segP = 84, segTheta = 56): THREE.BufferGeometry {
  const rows = segP + 1
  const cols = segTheta + 1
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const colors: number[] = []
  const v = new THREE.Vector3()
  const n = new THREE.Vector3()
  const col: [number, number, number] = [1, 1, 1]

  for (let i = 0; i < rows; i++) {
    const p = i / segP
    for (let j = 0; j < cols; j++) {
      const theta = (j / segTheta) * Math.PI * 2
      mouseShellPoint(p, theta, true, v)
      mouseShellNormal(p, theta, true, n)
      positions.push(v.x, v.y, v.z)
      normals.push(n.x, n.y, n.z)
      uvs.push(p, j / segTheta)
      shellColor(p, theta, v.y, col)
      colors.push(col[0], col[1], col[2])
    }
  }

  const index: number[] = []
  for (let i = 0; i < segP; i++) {
    for (let j = 0; j < segTheta; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = (i + 1) * cols + j
      const d = c + 1
      index.push(a, b, c)
      index.push(b, d, c)
    }
  }

  // tampas em leque (bico em -z, traseira em +z)
  const cap = (i: number, sign: number) => {
    const p = i / segP
    let cx = 0
    let cy = 0
    let cz = 0
    for (let j = 0; j < segTheta; j++) {
      const k = (i * cols + j) * 3
      cx += positions[k]
      cy += positions[k + 1]
      cz += positions[k + 2]
    }
    cx /= segTheta
    cy /= segTheta
    cz /= segTheta
    const center = positions.length / 3
    positions.push(cx, cy, cz)
    normals.push(0, 0, sign)
    uvs.push(p, 0.5)
    shellColor(p, Math.PI / 2, cy, col)
    colors.push(col[0], col[1], col[2])
    for (let j = 0; j < segTheta; j++) {
      const rj = i * cols + j
      const rk = i * cols + ((j + 1) % segTheta)
      if (sign < 0) index.push(center, rk, rj)
      else index.push(center, rj, rk)
    }
  }
  cap(0, -1)
  cap(segP, 1)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
  geo.setIndex(index)
  geo.computeBoundingSphere()
  return geo
}

/**
 * Casca de botão flutuante: a mesma superfície do corpo, deslocada para fora
 * pela normal. `side = -1` esquerda (afunda no clique), `+1` direita.
 */
export function makeMouseButtonGeometry(side: -1 | 1, segP = 34, segT = 22): THREE.BufferGeometry {
  const positions: number[] = []
  const normals: number[] = []
  const uvs: number[] = []
  const base = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let i = 0; i <= segP; i++) {
    const p = BTN_P0 + (BTN_P1 - BTN_P0) * (i / segP)
    const gap = buttonGapHalf(p)
    const tLo = side === 1 ? 0.3 : Math.PI / 2 + gap
    const tHi = side === 1 ? Math.PI / 2 - gap : Math.PI - 0.3
    for (let j = 0; j <= segT; j++) {
      const theta = tLo + (tHi - tLo) * (j / segT)
      mouseShellPoint(p, theta, false, base)
      mouseShellNormal(p, theta, false, n)
      positions.push(base.x + n.x * BTN_LIFT, base.y + n.y * BTN_LIFT, base.z + n.z * BTN_LIFT)
      normals.push(n.x, n.y, n.z)
      uvs.push(p, j / segT)
    }
  }

  const cols = segT + 1
  const index: number[] = []
  for (let i = 0; i < segP; i++) {
    for (let j = 0; j < segT; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = (i + 1) * cols + j
      const d = c + 1
      index.push(a, b, c)
      index.push(b, d, c)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3))
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(index)
  geo.computeBoundingSphere()
  return geo
}

/** Ponto de saída do cabo, no bico (local, y=0 no fundo). */
export const MOUSE_CABLE_ANCHOR = new THREE.Vector3(0, 0.0052, -MOUSE_HALF_L + 0.004)
