import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { Rocket } from '../rocket/Rocket'
import { transitionConfig as config } from '../../../story/transition/config'
import { transitionState as state, ease } from '../../../story/transition/stageState'
import { createTrajectory, poseRocket } from '../../../story/transition/trajectory'
import { CoreStream } from './CoreStream'
import { buildEmissionHistory, type EmitterHistory } from '../../../story/transition/emissionHistory'
import { WaterSpray } from './WaterSpray'
import { LiquidTransitionPass } from './LiquidTransitionPass'

function Flight({ debug }: { debug: boolean }) {
  const rig = useRef<THREE.Group>(null)
  const origin = useRef<THREE.Group>(null)
  const { size, camera, gl, scene, invalidate } = useThree()
  const mobile = size.width < 768
  const curve = useMemo(() => createTrajectory(size.width / size.height, mobile), [size.width, size.height, mobile])
  const projected = useMemo(() => new THREE.Vector3(), [])
  const history = useMemo<EmitterHistory>(() => ({ samples: [] }), [])
  useEffect(() => {
    if (!rig.current || !origin.current) return
    history.samples = buildEmissionHistory(rig.current, origin.current, curve, mobile)
    invalidate()
    return () => { history.samples = [] }
  }, [curve, mobile, history, invalidate])
  useEffect(() => {
    state.invalidate = invalidate
    invalidate()
    return () => { state.invalidate = null }
  }, [invalidate])
  useEffect(() => {
    const room = new RoomEnvironment()
    const pmrem = new THREE.PMREMGenerator(gl)
    const target = pmrem.fromScene(room, 0.04)
    scene.environment = target.texture
    scene.environmentIntensity = 0.9
    return () => { scene.environment = null; target.dispose(); room.dispose(); pmrem.dispose() }
  }, [gl, scene])
  useFrame(() => {
    if (!rig.current || !origin.current) return
    const p = state.visual.p
    const cam = camera as THREE.PerspectiveCamera
    cam.fov = config.camera.fov + config.camera.reactionFov * ease(0.32, 0.40, p) * (1 - ease(0.43, 0.55, p))
    cam.updateProjectionMatrix()
    poseRocket(rig.current, curve, p, mobile)
    rig.current.visible = state.visual.rocketVisible
    projected.copy(curve.getPointAt(state.visual.rocketT)).project(camera)
    state.rocketScreen = { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2 }
    origin.current.getWorldPosition(projected).project(camera)
    state.waterOriginScreen = { x: (projected.x + 1) / 2, y: (1 - projected.y) / 2 }
  }, -2)
  return <>
    <ambientLight intensity={0.65} />
    <directionalLight position={[1, 5, 8]} intensity={2} color="#f2f7ff" />
    <directionalLight position={[-5, 0, 4]} intensity={1} color="#a9c5df" />
    <Rocket transitionRig={rig} waterOrigin={origin} />
    <CoreStream history={history} />
    <WaterSpray history={history} />
    <WaterSpray history={history} mist />
    <LiquidTransitionPass history={history} />
    {debug && <group>
      <Line points={curve.getPoints(160)} color="#e6b651" lineWidth={1} transparent opacity={0.6} />
      {curve.points.map((point, i) => <mesh key={i} position={point}><sphereGeometry args={[0.055, 12, 8]} /><meshBasicMaterial color="#e6b651" /></mesh>)}
    </group>}
  </>
}
export function TransitionScene({ debug }: { debug: boolean }) {
  return <Canvas frameloop="demand" className="intro-transition__canvas" dpr={[1, 1.5]} gl={{ alpha: true, antialias: true, toneMapping: THREE.ACESFilmicToneMapping }} camera={{ position: [0, 0, config.camera.z], fov: config.camera.fov, near: 0.1, far: 80 }}>
    <Flight debug={debug} />
  </Canvas>
}
