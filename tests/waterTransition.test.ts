import { describe, it, expect } from 'vitest'
import * as THREE from 'three'
import { stageVisual, seededRandom } from '../src/story/transition/stageState'
import { createTrajectory, poseRocket } from '../src/story/transition/trajectory'
import { transitionConfig as config } from '../src/story/transition/config'

describe('intro stage ownership and optical handoff', () => {
  it('never makes both headlines legible, even during reverse scroll', () => {
    for (let i = 0; i <= 1000; i++) {
      const v = stageVisual(i / 1000)
      expect(v.hero > .01 && v.next > .01).toBe(false)
      if (v.next > 0 && v.next < 1) expect(v.coverage).toBe(1)
    }
  })
  it('holds an entirely opaque bridge and releases every effect', () => {
    for (const p of [.735, .75, .77, .79]) expect(stageVisual(p).coverage).toBe(1)
    const final = stageVisual(1)
    expect(final).toMatchObject({ coverage: 0, water: 0, droplets: 0, blur: 0, hero: 0, next: 1, rocketVisible: false })
    expect(stageVisual(0)).toMatchObject({ coverage: 0, water: 0, droplets: 0, hero: 1, next: 0 })
  })
  it('holds focus before a nonlinear optical settle', () => {
    expect(stageVisual(.78).blur).toBe(16)
    expect(stageVisual(.84).blur).toBe(15)
    expect(stageVisual(.92).blur).toBe(6)
    expect(stageVisual(.96).blur).toBe(2)
    expect(stageVisual(1).blur).toBe(0)
  })
  it('is deterministic across arbitrary seek order', () => {
    const first = [.2,.4,.55,.75,.9].map(p => stageVisual(p))
    ;[1,0,.9,.1,.8].forEach(p => stageVisual(p))
    expect([.2,.4,.55,.75,.9].map(p => stageVisual(p))).toEqual(first)
    const a = seededRandom(7319), b = seededRandom(7319)
    expect(Array.from({ length: 50 }, a)).toEqual(Array.from({ length: 50 }, b))
  })
})

describe.each([[1440,900],[390,844],[1024,768],[430,932]])('viewport trajectory %ix%i', (w, h) => {
  const mobile = w < 768
  const curve = createTrajectory(w / h, mobile)
  const camera = new THREE.PerspectiveCamera(config.camera.fov, w / h, .1, 80)
  camera.position.z = config.camera.z
  camera.updateMatrixWorld(true)
  it('enters offscreen top-right and leaves offscreen bottom-left', () => {
    const start = curve.getPointAt(0).project(camera), end = curve.getPointAt(1).project(camera)
    expect(start.x).toBeGreaterThan(1); expect(start.y).toBeGreaterThan(1)
    expect(end.x).toBeLessThan(-1); expect(end.y).toBeLessThan(-1)
    const pass = curve.getPointAt(.5).project(camera)
    expect(Math.abs(pass.x)).toBeLessThan(.55); expect(Math.abs(pass.y)).toBeLessThan(.55)
  })
  it('keeps the nozzle transform attached and the nose aligned to the tangent', () => {
    const rig = new THREE.Group(), origin = new THREE.Object3D()
    origin.position.set(0, -.26, 0); rig.add(origin)
    for (const p of [.15,.25,.35,.45,.55]) {
      poseRocket(rig, curve, p, mobile)
      const axis = new THREE.Vector3(0, 1, 0).applyQuaternion(rig.quaternion)
      expect(axis.dot(curve.getTangentAt(stageVisual(p).rocketT))).toBeGreaterThan(.999)
      const nozzle = origin.getWorldPosition(new THREE.Vector3())
      expect(nozzle.distanceTo(rig.position)).toBeCloseTo(.26 * rig.scale.x, 6)
      expect(nozzle.clone().sub(rig.position).normalize().dot(axis)).toBeCloseTo(-1, 6)
    }
  })
})
