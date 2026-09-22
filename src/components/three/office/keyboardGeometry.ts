import * as THREE from 'three'

export const KB_UNIT = 0.0193
export const KB_PITCH = 0.020
export const KB_HALF_W = 0.240
export const KB_HALF_D = 0.082
export const KB_FRONT_H = 0.016
export const KB_BACK_H = 0.036
export const KEY_H = 0.0117
export const KB_CENTER_U = 11.5

const ROW_Z = [-0.060, -0.040, -0.020, 0, 0.020, 0.040, 0.060]
const ROW_U_START = [0, 1, 1, 1, 1, 1, 1]

export function kbBedY(z: number): number {
  const t = Math.min(1, Math.max(0, (z + KB_HALF_D) / (KB_HALF_D * 2)))
  return KB_BACK_H + (KB_FRONT_H - KB_BACK_H) * t
}

export interface KeyPlace {
  x: number
  z: number
  sx: number
  sz: number
  seed: number
}

const colU = (u: number) => (u - KB_CENTER_U) * KB_PITCH
const rowZ = (r: number, sz: number) => (sz > 1 ? (ROW_Z[r] + ROW_Z[r + 1]) / 2 : ROW_Z[r])

export function keyboardKeys(): KeyPlace[] {
  const out: KeyPlace[] = []
  let seed = 0

  const push = (uN: number, r: number, sx = 1, sz = 1) => {
    out.push({ x: colU(uN + sx / 2), z: rowZ(r, sz), sx, sz, seed: seed++ })
    return uN + sx
  }
  const span = (uN: number, r: number, n: number) => {
    for (let i = 0; i < n; i++) uN = push(uN, r, 1)
    return uN
  }

  let u = 0
  u = push(u, 0)
  u += 0.28
  for (let f = 0; f < 4; f++) {
    u = span(u, 0, 3)
    u += 0.22
  }
  u += 0.06
  span(u, 0, 3)
  for (let r = 1; r <= 5; r++) {
    let un = ROW_U_START[r]
    if (r === 0) continue
    if (r === 1) {
      un = span(un, r, 13)
      push(un, r, 2)
    } else if (r === 2) {
      un = push(un, r, 1.5)
      un = span(un, r, 13)
      push(un, r, 1.5)
    } else if (r === 3) {
      un = push(un, r, 1.75)
      un = span(un, r, 11)
      push(un, r, 2.25)
    } else if (r === 4) {
      un = push(un, r, 2.25)
      un = span(un, r, 9)
      push(un, r, 2.75)
    } else {
      un = push(un, r, 1.5)
      un = push(un, r, 1.5)
      un = span(un, r, 7)
      un = push(un, r, 1.5)
      push(un, r, 1.5)
    }
  }
  push(16, 1)
  push(17, 2)
  push(16, 3)
  push(16.5, 5)
  push(15.5, 6)
  push(16.5, 6)
  push(17.5, 6)
  push(19, 1)
  push(20, 1)
  push(21, 1)
  push(22, 1)
  push(19, 2)
  push(20, 2)
  push(21, 2)
  push(22, 2, 1, 2)
  push(19, 3)
  push(20, 3)
  push(21, 3)
  push(19, 4)
  push(20, 4)
  push(21, 4)
  push(22, 4, 1, 2)
  push(19, 5, 2)
  push(21, 5)

  return out
}

function roundedRectPerimeter(hw: number, hd: number, r: number, seg: number): Array<number> {
  const pts: number[] = []
  const corners: Array<[number, number]> = [
    [-hw + r, -hd + r],
    [hw - r, -hd + r],
    [hw - r, hd - r],
    [-hw + r, hd - r],
  ]
  const a0 = [Math.PI, Math.PI * 1.5, 0, Math.PI * 0.5]
  for (let ci = 0; ci < 4; ci++) {
    for (let k = 0; k <= seg; k++) {
      const a = a0[ci] + (k / seg) * (Math.PI / 2)
      pts.push(corners[ci][0] + r * Math.cos(a), corners[ci][1] + r * Math.sin(a))
    }
  }
  return pts
}

function pushFlat(
  index: number[],
  pos: Float32Array,
  a: number,
  b: number,
  c: number,
  refN: THREE.Vector3,
) {
  const ax = pos[a * 3]
  const ay = pos[a * 3 + 1]
  const az = pos[a * 3 + 2]
  const bx = pos[b * 3]
  const by = pos[b * 3 + 1]
  const bz = pos[b * 3 + 2]
  const cx = pos[c * 3]
  const cy = pos[c * 3 + 1]
  const cz = pos[c * 3 + 2]
  const ux = bx - ax
  const uy = by - ay
  const uz = bz - az
  const vx = cx - ax
  const vy = cy - ay
  const vz = cz - az
  const nx = uy * vz - uz * vy
  const ny = uz * vx - ux * vz
  const nz = ux * vy - uy * vx
  if (nx * refN.x + ny * refN.y + nz * refN.z < 0) {
    const t = b
    b = c
    c = t
  }
  index.push(a, b, c)
}

export function makeKeyboardChassisGeometry(): THREE.BufferGeometry {
  const seg = 8
  const perim = roundedRectPerimeter(KB_HALF_W, KB_HALF_D, 0.042, seg)
  const nP = perim.length / 2
  const verts = nP * 2
  const pos = new Float32Array(verts * 3)
  const nor = new Float32Array(verts * 3)
  const col = new Float32Array(verts * 3)

  for (let i = 0; i < nP; i++) {
    const x = perim[i * 2]
    const z = perim[i * 2 + 1]
    const len = Math.hypot(x, z) || 1
    const nx = x / len
    const nz = z / len

    pos[(i * 2) * 3] = x
    pos[(i * 2) * 3 + 1] = 0
    pos[(i * 2) * 3 + 2] = z
    pos[(i * 2 + 1) * 3] = x
    pos[(i * 2 + 1) * 3 + 1] = kbBedY(z)
    pos[(i * 2 + 1) * 3 + 2] = z

    for (const k of [0, 1]) {
      nor[(i * 2 + k) * 3] = nx
      nor[(i * 2 + k) * 3 + 1] = 0
      nor[(i * 2 + k) * 3 + 2] = nz
      const up = k === 1
      col[(i * 2 + k) * 3] = up ? 1 : 0.58
      col[(i * 2 + k) * 3 + 1] = up ? 1 : 0.56
      col[(i * 2 + k) * 3 + 2] = up ? 1 : 0.5
    }
  }

  const index: number[] = []
  for (let i = 0; i < nP; i++) {
    const a = i * 2
    const b = ((i + 1) % nP) * 2
    const c = ((i + 1) % nP) * 2 + 1
    const d = i * 2 + 1
    const mx = (perim[i * 2] + perim[((i + 1) % nP) * 2]) / 2
    const mz = (perim[i * 2 + 1] + perim[((i + 1) % nP) * 2 + 1]) / 2
    const len = Math.hypot(mx, mz) || 1
    pushFlat(index, pos, a, b, d, new THREE.Vector3(mx / len, 0, mz / len))
    pushFlat(index, pos, b, c, d, new THREE.Vector3(mx / len, 0, mz / len))
  }

  const bottomI = 0
  for (let i = 1; i < nP - 1; i++) pushFlat(index, pos, i * 2, (i + 1) * 2, bottomI, new THREE.Vector3(0, -1, 0))
  const topIdx: number[] = []
  for (let i = 0; i < nP; i++) topIdx.push(i * 2 + 1)
  const tri = THREE.ShapeUtils.triangulateShape(
    topIdx.map((vi) => new THREE.Vector2(perim[vi * 2], perim[vi * 2 + 1])),
    [],
  )
  for (const t of tri) {
    pushFlat(index, pos, topIdx[t[0]], topIdx[t[1]], topIdx[t[2]], new THREE.Vector3(0, 1, 0))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setIndex(index)
  return geo
}

export function makeKeybedGeometry(): THREE.BufferGeometry {
  const hw = KB_HALF_W - 0.008
  const hs = KB_HALF_D - 0.006
  const segX = 16
  const segZ = 8
  const verts = (segX + 1) * (segZ + 1)
  const pos = new Float32Array(verts * 3)
  const index: number[] = []
  let vi = 0
  for (let j = 0; j <= segZ; j++) {
    const z = -hs + (hs * 2 * j) / segZ
    for (let i = 0; i <= segX; i++) {
      const x = -hw + (hw * 2 * i) / segX
      pos[vi * 3] = x
      pos[vi * 3 + 1] = kbBedY(z) + 0.0009
      pos[vi * 3 + 2] = z
      vi++
    }
  }
  for (let j = 0; j < segZ; j++) {
    for (let i = 0; i < segX; i++) {
      const a = j * (segX + 1) + i
      const b = a + 1
      const c = a + segX + 1
      const d = c + 1
      index.push(a, b, d, a, d, c)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setIndex(index)
  geo.computeVertexNormals()
  return geo
}

export function makeKeycapGeometry(): THREE.ExtrudeGeometry {
  const c = KB_UNIT / 2 - 0.0009
  const r = 0.0014
  const s = new THREE.Shape()
  s.moveTo(-c + r, -c)
  s.lineTo(c - r, -c)
  s.quadraticCurveTo(c, -c, c, -c + r)
  s.lineTo(c, c - r)
  s.quadraticCurveTo(c, c, c - r, c)
  s.lineTo(-c + r, c)
  s.quadraticCurveTo(-c, c, -c, c - r)
  s.lineTo(-c, -c + r)
  s.quadraticCurveTo(-c, -c, -c + r, -c)

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: KEY_H,
    bevelEnabled: true,
    bevelThickness: 0.0024,
    bevelSize: 0.0015,
    bevelSegments: 2,
    steps: 1,
  })
  geo.rotateX(-Math.PI / 2)
  geo.computeVertexNormals()
  return geo
}

export interface KeyboardCablePoint {
  x: number
  y: number
  z: number
}

export function makeKeyboardCableGeometry(include: KeyboardCablePoint[]): THREE.TubeGeometry {
  const curve = new THREE.CatmullRomCurve3(include.map((p) => new THREE.Vector3(p.x, p.y, p.z)))
  const geo = new THREE.TubeGeometry(curve, 24, 0.0026, 8, false)
  return geo
}