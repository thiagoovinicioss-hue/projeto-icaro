import * as THREE from 'three'

const W = 1280, H = 800
const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 40)
const [EYEY, TARGETY, EYEZ] = process.argv[2].split(',').map(Number)
const eye = new THREE.Vector3(0.02, EYEY, EYEZ)
const look = new THREE.Vector3(0.08, TARGETY, -0.3)
cam.position.copy(eye)
cam.lookAt(look)
cam.updateMatrixWorld(true)
cam.updateProjectionMatrix()

const deskTopY = 0.07
const v = new THREE.Vector3()
const P = [];

function box(name, cx, cy, cz, w, h, d, rotY = 0) {
  const corners = []
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      for (const sz of [-1, 1]) {
        let x = sx * w / 2, z = sz * d / 2
        if (rotY) {
          const c = Math.cos(rotY), s = Math.sin(rotY)
          const x2 = x * c + z * s
          const z2 = -x * s + z * c
          x = x2; z = z2
        }
        corners.push(pt(cx + x, cy + sy * h / 2, cz + z))
      }
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity
  for (const p of corners) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x)
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y)
  }
  const cuts = []
  if (minX < 0) cuts.push('ESQ'); if (maxX > W) cuts.push('DIR')
  if (minY < 0) cuts.push('TOPO'); if (maxY > H) cuts.push('BASE')
  const flag = cuts.length ? '  <<<' + cuts.join('/') : ''
  console.log(`${name}: x[${minX.toFixed(0)}..${maxX.toFixed(0)}] y[${minY.toFixed(0)}..${maxY.toFixed(0)}]${flag}`)
}

function pt(x, y, z) {
  v.set(x, y, z)
  v.project(cam)
  const p = { x: (v.x * 0.5 + 0.5) * W, y: (1 - (v.y * 0.5 + 0.5)) * H }
  P.push(p)
  return p
}

const CRT = { x: 0.44, z: -0.42 }
const PRT = { x: -0.62, z: -0.46 }
const KB = { x: 0.08, z: 0.28 }
const MB = { x: 0.385, z: 0.325 }
const LMP = { x: -0.26, z: -0.62 }

console.log(`=== v6-limpo (eye=0.02,${EYEY},${EYEZ} targetY=${TARGETY}) ===`)
box('TV SHELL', CRT.x, deskTopY + 0.016 + 0.31, CRT.z, 0.8, 0.62, 0.5)
box('TV PES', CRT.x, deskTopY + 0.008, CRT.z, 0.62, 0.016, 0.45)
box('IMPRESSORA', PRT.x, deskTopY, PRT.z, 0.36, 0.198, 0.25, 0.12)
box('IMPRESSORA+BANDEJA', PRT.x, deskTopY, PRT.z, 0.36, 0.198, 0.58, 0.12)
box('TECLADO', KB.x, deskTopY, KB.z, 0.486, 0.036, 0.166, -0.06)
box('MOUSE', MB.x, deskTopY, MB.z, 0.067, 0.036, 0.115)
box('LUMINARIA BASE', LMP.x, deskTopY, LMP.z, 0.3, 0.046, 0.3)
box('LUMINARIA CABECA', LMP.x + 0.147, deskTopY + 0.2, LMP.z + 0.138, 0.34, 0.18, 0.34, 0.12)
box('PAPEL IMPRESSO', PRT.x + 0.04, deskTopY + 0.005, PRT.z + 0.32, 0.2, 0.005, 0.28, 0.12)
box('CANETA (profunda)', -0.84, deskTopY + 0.006, -0.26, 0.016, 0.016, 0.22, 0.1)
box('POSTER', -0.54, 0.4, -1.03, 0.44, 0.58, 0.05)

console.log('\n--- CABO TECLADO (pontos) ---')
for (const p of [
  [0.27, 0.188], [0.36, 0.1], [0.385, -0.01],
  [0.36, -0.13], [0.3, -0.3], [0.23, -0.52],
]) {
  const s = pt(p[0], deskTopY + 0.04, p[1])
  const cut = s.x < 0 || s.x > W || s.y < 0 || s.y > H ? '  <<CUT' : ''
  console.log(`  kb(${p[0]}, ${p[1]}): x=${s.x.toFixed(0)} y=${s.y.toFixed(0)}${cut}`)
}

console.log('--- CABO MOUSE (pontos) ---')
for (const p of [
  [MB.x, MB.z - 0.0535], [0.36, 0.22], [0.32, 0.14],
  [0.295, 0.05], [0.28, -0.06], [0.25, -0.2], [0.2, -0.34],
]) {
  const s = pt(p[0], deskTopY + 0.012, p[1])
  const cut = s.x < 0 || s.x > W || s.y < 0 || s.y > H ? '  <<CUT' : ''
  console.log(`  mb(${p[0]}, ${p[1]}): x=${s.x.toFixed(0)} y=${s.y.toFixed(0)}${cut}`)
}