import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { sim, quality, probe, stagePin } from '../../utils/sim'
import { cameraAt, rocketAt, channelAt, colorAt, jetAt, fillAt, nearestStage, TRACKS } from '../../story/cinema'
import { clampT } from '../../story/cinema'

const CAMERA_DAMPING = 3.4
const MAX_FRAME_STEP = 1 / 24
const GOVERNOR_SLOW_EMA_MS = 42
const GOVERNOR_SLOW_WINDOW_S = 3
const GOVERNOR_DPR_FLOOR = 1.25
const ROCKET_NOSE_OFFSET = 3.6
const ZOOM_HIDE = ['icaro-backdrop', 'icaro-launch-stand', 'icaro-climax']

const _cam = cloneCameraSample()
const _tgt = new THREE.Vector3()
const _fogC = new THREE.Color()
const _rp = new THREE.Vector3()
const _rn = new THREE.Vector3()
const _qs = new THREE.Quaternion()
const _up = new THREE.Vector3(0, 1, 0)
const _rocketSample = { position: _rp, quaternion: _qs }
const _probeBase = new THREE.Vector3()
const _probeNose = new THREE.Vector3()
let _budgetScanned = false

function scanSceneBudget(scene: THREE.Scene) {
  let objects = 0
  let triangles = 0
  scene.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (mesh.isMesh && mesh.geometry) {
      objects++
      const g = mesh.geometry
      const index = g.index
      if (index) triangles += index.count / 3
      else if (g.attributes.position) triangles += g.attributes.position.count / 3
    }
  })
  probe.objectCount = objects
  probe.sceneTriangles = triangles
}

function cloneCameraSample() {
  return { pos: new THREE.Vector3(), target: new THREE.Vector3(), fov: 45 }
}

/**
 * Regência do cinema: scroll é a fonte de verdade (exactProgress), este frame
 * converge o smoothProgress e risco todos os tracks autorais — câmera, luzes,
 * névoa, fundo. Governador de performance e sonda de medição vêm junto.
 * Reduced-motion troca só entre as 5 composições (nearestStage).
 */
export function Conductor() {
  const { camera, gl, scene } = useThree()
  const keyRef = useRef<THREE.DirectionalLight>(null)
  const rimRef = useRef<THREE.DirectionalLight>(null)
  const hemiRef = useRef<THREE.HemisphereLight>(null)
  const slowTimer = useRef(0)
  const ema = useRef(16)
  const lastFrame = useRef(performance.now())

  useEffect(() => {
    ;(globalThis as unknown as { __icaroCam?: unknown }).__icaroCam = {
      camera,
      gl,
    }
  }, [camera, gl])

  useEffect(() => {
    const env = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(gl)
    const tex = pmrem.fromScene(env, 0.04).texture
    scene.environment = tex
    scene.environmentIntensity = 0.45
    return () => {
      tex.dispose()
      pmrem.dispose()
      scene.environment = null
      scene.environmentIntensity = 1
    }
  }, [gl, scene])

  useFrame((state, delta) => {
    const frag = Math.min(delta, MAX_FRAME_STEP)
    const t0 = performance.now()

    if (!_budgetScanned) {
      scanSceneBudget(scene)
      _budgetScanned = true
    }

    // Governador de velocidade: frames lentos sustentados -> degrada DPR uma vez.
    ema.current = ema.current * 0.9 + (t0 - lastFrame.current) * 0.1
    lastFrame.current = t0
    if (ema.current > GOVERNOR_SLOW_EMA_MS) slowTimer.current += frag
    else slowTimer.current = 0
    if (slowTimer.current > GOVERNOR_SLOW_WINDOW_S && quality.dprCap > GOVERNOR_DPR_FLOOR) {
      quality.dprCap = GOVERNOR_DPR_FLOOR
      gl.setPixelRatio(GOVERNOR_DPR_FLOOR)
      slowTimer.current = 0
    }

    // Clock: exact (scroll) -> smooth (cinema).
    if (stagePin !== null) {
      sim.target = clampT(stagePin)
      sim.smooth = sim.target
    } else if (quality.reducedMotion) {
      sim.smooth = sim.target
    } else {
      sim.smooth = clampT(sim.smooth + (sim.target - sim.smooth) * (1 - Math.exp(-CAMERA_DAMPING * frag)))
    }
    const t = sim.smooth
    const reduced = quality.reducedMotion

    const cam = cameraAt(t, quality.deviceTier, reduced, _cam)
    _tgt.copy(cam.target)
    camera.position.copy(cam.pos)
    camera.lookAt(_tgt)
    const pcam = camera as THREE.PerspectiveCamera
    if (Math.abs(pcam.fov - cam.fov) > 0.001) {
      pcam.fov = cam.fov
      pcam.updateProjectionMatrix()
    }

    // Só para auditoria visual: aproxima o foguete e esconde o palco.
    const icaroGlob = globalThis as unknown as { __icaro?: { zoomRocket?: boolean; inspectStand?: boolean } }
    if (icaroGlob.__icaro?.inspectStand) {
      const bg = scene.getObjectByName('icaro-backdrop')
      if (bg) bg.visible = false
      camera.position.set(0.2, 1.0, 2.6)
      _tgt.set(1.15, 1.1, 0)
      camera.lookAt(_tgt)
    }
    if (icaroGlob.__icaro?.zoomRocket) {
      for (const groupName of ZOOM_HIDE) {
        const g = scene.getObjectByName(groupName)
        if (g) g.visible = false
      }
      camera.position.set(1.15, 2.3, 5.6)
      _tgt.set(1.15, 1.95, 0)
      camera.lookAt(_tgt)
    }

    gl.toneMappingExposure = channelAt(TRACKS.exposure, t, reduced)

    if (keyRef.current) keyRef.current.intensity = channelAt(TRACKS.key, t, reduced)
    if (rimRef.current) rimRef.current.intensity = channelAt(TRACKS.rim, t, reduced)
    if (hemiRef.current) hemiRef.current.intensity = channelAt(TRACKS.hemi, t, reduced)

    if (scene.fog instanceof THREE.Fog) {
      colorAt(TRACKS.bg, t, _fogC, reduced)
      scene.fog.color.copy(_fogC)
      scene.fog.near = channelAt(TRACKS.fogNear, t, reduced)
      scene.fog.far = channelAt(TRACKS.fogFar, t, reduced)
    }

    // Sonda de medição (DebugHud / auditoria). Projeção exige as matrizes da
    // pose que acabamos de dar à câmera (senão lê a matriz do frame anterior).
    camera.updateMatrixWorld(true)
    camera.matrixWorldInverse.copy(camera.matrixWorld).invert()
    rocketAt(t, reduced, state.clock.elapsedTime, _rocketSample)
    _rn.copy(_rp).addScaledVector(_up, ROCKET_NOSE_OFFSET)

    _probeBase.copy(_rp).project(camera)
    _probeNose.copy(_rn).project(camera)
    probe.t = t
    probe.stageId = nearestStage(t).id
    probe.camera.x = camera.position.x
    probe.camera.y = camera.position.y
    probe.camera.z = camera.position.z
    probe.camera.tx = cam.target.x
    probe.camera.ty = cam.target.y
    probe.camera.tz = cam.target.z
    probe.camera.fov = pcam.fov
    probe.rocket.x = _rp.x
    probe.rocket.y = _rp.y
    probe.rocket.z = _rp.z
    probe.rocketScreen.x = _probeBase.x
    probe.rocketScreen.y = _probeBase.y
    probe.rocketScreen.topY = Math.max(_probeBase.y, _probeNose.y)
    probe.rocketScreen.bottomY = Math.min(_probeBase.y, _probeNose.y)
    probe.rocketScreen.visible = 1
    probe.fps = ema.current > 0 ? 1000 / ema.current : 60
    probe.drawCalls = gl.info.render.calls
    probe.triangles = gl.info.render.triangles
    probe.jet = jetAt(t, reduced)
    probe.fill = fillAt(t, reduced)
  })

  return (
    <>
      <hemisphereLight ref={hemiRef} args={['#1d3a5f', '#04070c', 0.16]} />
      <directionalLight
        ref={keyRef}
        position={[7, 9, 5]}
        intensity={1}
        color="#ffd9a0"
        castShadow={quality.shadows}
      >
        {quality.shadows && <orthographicCamera attach="shadow-camera" args={[-6, 6, 5, -7, 0.1, 40]} />}
      </directionalLight>
      <directionalLight ref={rimRef} position={[-6, 3, -7]} intensity={0.4} color="#5f93d0" />
    </>
  )
}