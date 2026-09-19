import * as THREE from 'three'
import { ROCKET_DIMENSIONS } from './dimensions'

/**
 * Aleta trapezoidal de papelão, já orientada num ângulo em Y.
 * Cada ponto do perfil é (altura, afastamento radial): a borda interna
 * encosta na carcaça PET, a placa é extrudada ± meia espessura.
 */
const R = ROCKET_DIMENSIONS.bottleProfile
const MIN_Y = R[0][1]

/** Raio do corpo na altura y (eixo NORMALIZADO do foguete). */
function profileRadiusAt(y: number): number {
  const ay = y + MIN_Y
  for (let i = 0; i < R.length - 1; i++) {
    const [r0, y0] = R[i]
    const [r1, y1] = R[i + 1]
    if (ay <= y1) {
      if (ay <= y0) return r0
      return r0 + (r1 - r0) * ((ay - y0) / (y1 - y0))
    }
  }
  return R[R.length - 1][0]
}

// [altura, afastamento radial] — a borda interna morde 6mm na carcaça do PET
// (parece "colada"; nada de anel de montagem). Aletas NA BASE do foguete,
// sobre a saia azul — antes ficavam no terço superior.
const BOTTOM_Y = 0.95
const TOP_Y = 0.25
const OV = ROCKET_DIMENSIONS.fin.innerOverlap
const innerBottom = Math.max(0.26, profileRadiusAt(BOTTOM_Y) - OV)
const innerTop = Math.max(0.26, profileRadiusAt(TOP_Y) - OV)
const FIN_PROFILE: Array<[number, number]> = [
  [BOTTOM_Y, innerBottom], // bottom-inner
  [TOP_Y, innerTop], // top-inner
  [TOP_Y - 0.05, 0.58], // top-outer
  [BOTTOM_Y - 0.05, 0.64], // bottom-outer
]

export function makeFinGeometry(angleRad: number): THREE.BufferGeometry {
  const th = ROCKET_DIMENSIONS.fin.halfThickness

  const u = { x: Math.sin(angleRad), z: Math.cos(angleRad) }
  const v = { x: -Math.cos(angleRad), z: Math.sin(angleRad) }
  const at = (p: [number, number], t: number): [number, number, number] => [
    p[1] * u.x + t * v.x,
    p[0],
    p[1] * u.z + t * v.z,
  ]

  const F = FIN_PROFILE.map((p) => at(p, th))
  const B = FIN_PROFILE.map((p) => at(p, -th))

  const verts: number[] = []
  const push = (tris: Array<Array<[number, number, number]>>) => {
    for (const tri of tris) for (const vtx of tri) verts.push(vtx[0], vtx[1], vtx[2])
  }

  push([
    [F[0], F[1], F[2]],
    [F[0], F[2], F[3]], // front (+t)
    [B[0], B[3], B[2]],
    [B[0], B[2], B[1]], // back (−t)
    [F[0], F[3], B[3]],
    [F[0], B[3], B[0]], // bottom strip
    [F[3], F[2], B[2]],
    [F[3], B[2], B[3]], // outer strip
    [F[2], F[1], B[1]],
    [F[2], B[1], B[2]], // top strip
    [F[1], F[0], B[0]],
    [F[1], B[0], B[1]], // inner strip
  ])

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(verts), 3))
  geo.computeVertexNormals()
  return geo
}