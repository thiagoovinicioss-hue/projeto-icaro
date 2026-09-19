import * as THREE from 'three'
import { transitionConfig as config } from './config'
import { clamp } from './stageState'
import { poseRocket } from './trajectory'

export interface Emission { position: THREE.Vector3; direction: THREE.Vector3; progress: number }
export interface EmitterHistory { samples: Emission[] }

/** An emission-time cache, rather than an accumulated wall-clock simulation.
 * Sampling a sliding window gives identical trails on scroll, seek and reverse.
 * The nozzle remains a real child of the rocket for every sampled transform.
 */
export function buildEmissionHistory(rig: THREE.Group, origin: THREE.Group, curve: THREE.CatmullRomCurve3, mobile: boolean) {
  const position = rig.position.clone(), quaternion = rig.quaternion.clone(), scale = rig.scale.clone()
  const samples = Array.from({ length: config.historySamples }, (_, i) => {
    const progress = config.emissionRange[0] + i / (config.historySamples - 1) * (config.emissionRange[1] - config.emissionRange[0])
    poseRocket(rig, curve, progress, mobile)
    return { progress, position: origin.getWorldPosition(new THREE.Vector3()), direction: new THREE.Vector3(0, -1, 0).transformDirection(origin.matrixWorld) }
  })
  rig.position.copy(position); rig.quaternion.copy(quaternion); rig.scale.copy(scale); rig.updateMatrixWorld(true)
  return samples
}
export function sampleEmission(history: EmitterHistory, p: number, position: THREE.Vector3, direction: THREE.Vector3) {
  const samples = history.samples
  if (samples.length < 2) return
  const t = clamp((p - config.emissionRange[0]) / (config.emissionRange[1] - config.emissionRange[0])) * (samples.length - 1)
  const i = Math.min(samples.length - 2, Math.floor(t))
  position.copy(samples[i].position).lerp(samples[i + 1].position, t - i)
  direction.copy(samples[i].direction).lerp(samples[i + 1].direction, t - i).normalize()
}
