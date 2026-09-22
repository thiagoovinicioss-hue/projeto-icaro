import * as THREE from 'three/src/Three.js'

const deskTopY = 0.07
const cam = new THREE.PerspectiveCamera(42, 1280 / 800, 0.1, 40)
cam.position.set(0.02, 0.66, 1.18)
cam.lookAt(new THREE.Vector3(0.08, 0.1, -0.3))
cam.updateMatrixWorld()

const proj = (wx, wy, wz) => {
  const p = new THREE.Vector3(wx, wy, wz).project(cam)
  return [Math.round((p.x + 1) * 0.5 * 1280), Math.round((1 - p.y) * 0.5 * 800)]
}
const row = (label, x, y, z) => console.log(label.padEnd(10), proj(x, y, z).join(','))
row('telaTL', 0.52 - 0.27, deskTopY + 0.3 + 0.2025, -0.4 + 0.246)
row('telaBR', 0.52 + 0.27, deskTopY + 0.3 - 0.2025, -0.4 + 0.246)
row('bezelEsq', 0.52 - 0.22, deskTopY + 0.3, -0.16)
row('bezelTopo', 0.52, deskTopY + 0.3 + 0.21, -0.16)
row('mouseCorpo', 0.05, deskTopY + 0.05, 0.35)
row('btnCopiar', 0.52 + (0.25 - 0.5) * 0.54, deskTopY + 0.3 + (0.714 - 0.5) * 0.405, -0.154)
row('btnCompart', 0.52 + (0.77 - 0.5) * 0.54, deskTopY + 0.3 + (0.714 - 0.5) * 0.405, -0.154)
row('bezelAcima', 0.52, deskTopY + 0.56, -0.16)
row('bezelEsquerda', 0.22, deskTopY + 0.3, -0.16)
