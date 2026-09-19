import * as THREE from 'three'
import { transitionConfig as config } from './config'
import { rocketT, ease } from './stageState'

const up = new THREE.Vector3(0, 1, 0)
export function createTrajectory(aspect: number, mobile: boolean) {
  const h = 2 * config.camera.z * Math.tan(THREE.MathUtils.degToRad(config.camera.fov / 2))
  const anchors = mobile ? config.rocketCurveMobile : config.rocketCurveDesktop
  return new THREE.CatmullRomCurve3(anchors.map(([x, y, z]) => {
    const depth = (config.camera.z - z) / config.camera.z
    return new THREE.Vector3((x - 0.5) * h * aspect * depth, (y - 0.5) * h * depth, z)
  }), false, 'centripetal')
}
export function poseRocket(rig: THREE.Object3D, curve: THREE.CatmullRomCurve3, p: number, mobile: boolean) {
  const t = rocketT(p)
  const tangent = curve.getTangentAt(t)
  rig.quaternion.setFromUnitVectors(up, tangent)
  // Constant three-quarter view; a tiny bank is tied to the pass, never time.
  rig.rotateY(0.28 + 0.07 * Math.sin(t * Math.PI))
  const scale = config.rocketScale[mobile ? 'mobile' : 'desktop'] * (1 + 0.16 * ease(0.24, 0.39, p) * (1 - ease(0.43, 0.59, p)))
  rig.scale.setScalar(scale)
  rig.position.copy(curve.getPointAt(t)).addScaledVector(tangent, -1.32 * scale)
  rig.updateMatrixWorld(true)
}
