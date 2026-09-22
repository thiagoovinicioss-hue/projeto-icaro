import * as THREE from 'three/src/Three.js'

// current camera
const camCur = new THREE.PerspectiveCamera(42, 1280 / 800, 0.1, 40)
camCur.position.set(0.02, 0.6, 1.14)
camCur.lookAt(new THREE.Vector3(0.08, 0.02, -0.22))
camCur.updateMatrixWorld()

function py(cam, wx, wy, wz, W = 1280, H = 800) {
  const p = new THREE.Vector3(wx, wy, wz).project(cam)
  return ((1 - p.y) * 0.5) * H
}

const caseCams = {
  current: () => {
    const c = new THREE.PerspectiveCamera(42, 1280 / 800, 0.1, 40)
    c.position.set(0.02, 0.6, 1.14)
    c.lookAt(new THREE.Vector3(0.08, 0.02, -0.22))
    c.updateMatrixWorld()
    return c
  },
  A: () => {
    const c = new THREE.PerspectiveCamera(42, 1280 / 800, 0.1, 40)
    c.position.set(0.02, 0.66, 1.18)
    c.lookAt(new THREE.Vector3(0.08, 0.1, -0.3))
    c.updateMatrixWorld()
    return c
  },
  B: () => {
    const c = new THREE.PerspectiveCamera(42, 1280 / 800, 0.1, 40)
    c.position.set(0.02, 0.7, 1.2)
    c.lookAt(new THREE.Vector3(0.08, 0.14, -0.32))
    c.updateMatrixWorld()
    return c
  },
}

const points = {
  'crt front-top (y=0.79 z=-0.14)': [0.5, 0.79, -0.14],
  'crt front-mid (y=0.43 z=-0.14)': [0.5, 0.43, -0.14],
  'crt base (y=0.07 z=-0.14)': [0.5, 0.07, -0.14],
  'crt screen-top (y=0.66 z=-0.14)': [0.5, 0.6625, -0.14],
  'printer top-right (y=0.27 z=-0.32)': [-0.42, 0.27, -0.32],
  'printer base (y=0.07 z=-0.32)': [-0.42, 0.07, -0.32],
  'lamp head (y=0.5 z=-0.5)': [-0.16, 0.5, -0.5],
  'desk far top (y=0.07 z=-0.9)': [0, 0.07, -0.9],
  'desk edge front (y=0.07 z=0.55)': [0, 0.07, 0.55],
  'mouse new (y=0.1 z=0.34)': [0.05, 0.1, 0.34],
  'mouse old (y=0.1 z=0.32)': [0.56, 0.1, 0.32],
}
for (const [name, cname] of Object.entries(caseCams)) {
  const c = cname()
  console.log(`== cam ${name}`)
  for (const [label, pt] of Object.entries(points)) {
    const p = py(c, pt[0], pt[1], pt[2])
    console.log(label.padEnd(30), 'py=' + p.toFixed(0))
  }
}