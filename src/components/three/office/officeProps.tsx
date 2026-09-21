import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  CRT_POS,
  DESK_D,
  DESK_THICK,
  DESK_W,
  FLOOR_Y,
  KB_POS,
  LAMP_POS,
  MB_POS,
  PAD_POS,
  PEN_POS,
  FLOPPY_POS,
  POSTER_POS,
  WALL_Z,
  clamp01,
} from './officeGeometry'
import {
  makeBeigeTexture,
  makeContactShadowTexture,
  makeDeskWoodTexture,
  makeKeyboardTexture,
  makeMousePlasticTexture,
  makePadTexture,
  makePosterTexture,
  makeWallTexture,
} from './officeTextures'
import {
  MOUSE_CABLE_ANCHOR,
  MOUSE_HALF_L,
  MOUSE_LEN,
  MOUSE_MAX_W,
  makeMouseBodyGeometry,
  makeMouseButtonGeometry,
} from './mouseGeometry'
import { enterComputerMode, office } from './officeState'

/* ------------------------------------------------------------------ mesa */

export function Desk() {
  const topRef = useRef<THREE.Mesh>(null)
  const topTex = useMemo(() => makeDeskWoodTexture('top'), [])
  const sideTex = useMemo(() => makeDeskWoodTexture('side'), [])
  const legTex = useMemo(() => makeBeigeTexture('dark'), [])

  useLayoutEffect(() => {
    if (topRef.current) {
      const box = new THREE.Box3().setFromObject(topRef.current)
      office.deskTopY = box.max.y
    }
  }, [])
  const topMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: topTex,
        roughness: 0.46,
        metalness: 0,
        clearcoat: 0.18,
        clearcoatRoughness: 0.5,
      }),
    [topTex],
  )
  const sideMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: sideTex, roughness: 0.6, metalness: 0 }),
    [sideTex],
  )
  const legMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: legTex, roughness: 0.6, metalness: 0 }),
    [legTex],
  )

  const legs: [number, number][] = [
    [-DESK_W / 2 + 0.12, -DESK_D / 2 + 0.12],
    [DESK_W / 2 - 0.12, -DESK_D / 2 + 0.12],
    [-DESK_W / 2 + 0.12, DESK_D / 2 - 0.12],
    [DESK_W / 2 - 0.12, DESK_D / 2 - 0.12],
  ]

  return (
    <group>
      {/* tampo — a borda frontal aparece no rodapé da viewport */}
      <mesh ref={topRef} position={[0, DESK_THICK / 2, -0.02]} receiveShadow castShadow material={topMat}>
        <boxGeometry args={[DESK_W, DESK_THICK, DESK_D]} />
      </mesh>
      {/* saia baixa: dá densidade ao conjunto sem obstruir */}
      <mesh position={[0, DESK_THICK / 2 - 0.09, -DESK_D / 2 - 0.04]} castShadow material={sideMat}>
        <boxGeometry args={[DESK_W, 0.18, 0.05]} />
      </mesh>
      {/* pernas */}
      {legs.map(([x, z], i) => (
        <mesh key={i} position={[x, FLOOR_Y / 2 + DESK_THICK / 2, z + 0.05]} castShadow material={legMat}>
          <boxGeometry args={[0.1, -FLOOR_Y, 0.1]} />
        </mesh>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------- parede */

export function Wall() {
  const tex = useMemo(() => makeWallTexture(), [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.95 }), [tex])
  return (
    <mesh position={[0, (FLOOR_Y + 1.7) / 2, WALL_Z]} material={mat}>
      <planeGeometry args={[9, 3.6]} />
    </mesh>
  )
}

export function Floor() {
  const tex = useMemo(() => makeDeskWoodTexture('side'), [])
  const m = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: tex,
        color: '#574129',
        roughness: 0.92,
      }),
    [tex],
  )
  return (
    <mesh position={[0, FLOOR_Y - 0.005, -0.2]} material={m} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[12, 6]} />
    </mesh>
  )
}

/* ------------------------------------------------------------------ luminária */

export function OfficeLamp({ shadows }: { shadows: boolean }) {
  const bulb = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffdfb0',
        emissive: '#ffd29a',
        emissiveIntensity: 3.4,
        toneMapped: false,
      }),
    [],
  )
  return (
    <group position={LAMP_POS}>
      {/* disco de base */}
      <mesh position={[0, 0.018, 0]} receiveShadow castShadow>
        <cylinderGeometry args={[0.2, 0.23, 0.035, 28]} />
        <meshStandardMaterial color="#33291c" roughness={0.42} metalness={0.25} />
      </mesh>
      {/* haste traseira inclinada */}
      <group rotation={[0.22, 0, 0]}>
        <mesh position={[0, 0.36, -0.04]} castShadow>
          <cylinderGeometry args={[0.02, 0.026, 0.74, 12]} />
          <meshStandardMaterial color="#2a2217" roughness={0.4} metalness={0.35} />
        </mesh>
      </group>
      {/* braço que pende para a frente, sobre o centro da mesa */}
      <group
        position={[0.05, 0.64, -0.07]}
        rotation={[-0.58, 0, -0.06]}
      >
        <group position={[0.02, 0.16, 0.02]} rotation={[0.08, 0, 0]}>
          <mesh position={[0, 0.14, 0]} castShadow>
            <cylinderGeometry args={[0.022, 0.022, 0.34, 12]} />
            <meshStandardMaterial color="#2a2217" roughness={0.4} metalness={0.35} />
          </mesh>
        </group>
        {/* cabeça da luminária — cone bege voltado para a mesa */}
        <group position={[0.07, 0.34, 0.02]} rotation={[0.34, 0, -0.14]}>
          <mesh position={[0, -0.07, 0.04]} castShadow>
            <coneGeometry args={[0.16, 0.24, 24, 1, true]} />
            <meshStandardMaterial
              color="#cbbc9e"
              roughness={0.55}
              metalness={0.18}
              side={THREE.DoubleSide}
            />
          </mesh>
          <mesh position={[0, -0.14, 0.035]} material={bulb}>
            <sphereGeometry args={[0.055, 16, 14]} />
          </mesh>
          {/* luz quente — 2700–3000K, key da cena */}
          <pointLight
            position={[0.05, -0.2, 0.06]}
            intensity={shadows ? 30 : 20}
            distance={5.2}
            decay={1.9}
            color="#ffb062"
            castShadow={shadows}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0006}
          />
        </group>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------------- teclado */

export function Keyboard() {
  const face = useMemo(() => makeKeyboardTexture(), [])
  const faceMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: face,
        roughness: 0.55,
        metalness: 0,
        emissive: '#1a160f',
        emissiveIntensity: 0.5,
        emissiveMap: face,
      }),
    [face],
  )
  return (
    <group position={KB_POS} rotation={[0, 0.12, 0]}>
      <mesh
        position={[0, 0.001, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        material={faceMat}
        receiveShadow
        castShadow
      >
        <planeGeometry args={[0.92, 0.27]} />
      </mesh>
      <mesh position={[0, -0.012, 0]} castShadow>
        <boxGeometry args={[0.96, 0.028, 0.3]} />
        <meshStandardMaterial color="#d6cdbb" roughness={0.55} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------- mouse físico (MIB) */

/**
 * Mouse retrô COM CABO — o coração da interação do computador. Fica ao lado
 * direito do teclado (frente da mesa, no pool da luminária), largo e bege,
 * corcunda alta e dois botões: leitura imediata de "rato antigo" (§28/§30).
 *
 * Em modo computador ele se move sobre a mesa acompanhando o cursor virtual;
 * fora dele, o clique abre o modo de controle. O botão local afunda ao
 * pressionar (tanto no clique de entrada quanto no uso do cursor virtual).
 */
const HIT_W = MOUSE_MAX_W * 1.45
const HIT_D = MOUSE_LEN * 1.42

/** Ref compartilhada para a pressão local do mouse (evita setState por clique). */
const pressedLocalRef = { current: 0 }

/** Pressiona no clique físico; levanta aos poucos depois. */
function liftTarget(): number {
  return pressedLocalRef.current > 0 ? 1 : 0
}

/** Cabo em coordenadas de MUNDO, saindo do bico até sumir sob o CRT. */
function buildCableGeometry(anchor: THREE.Vector3): THREE.BufferGeometry {
  const y = office.deskTopY
  const pts = [
    anchor.clone(),
    new THREE.Vector3(anchor.x + 0.028, y + 0.0045, anchor.z - 0.03),
    new THREE.Vector3(0.26, y + 0.0065, 0.09),
    new THREE.Vector3(0.44, y + 0.0075, -0.14),
    new THREE.Vector3(CRT_POS[0] - 0.01, y + 0.011, CRT_POS[2] + 0.02),
    new THREE.Vector3(CRT_POS[0] - 0.04, y + 0.02, CRT_POS[2] - 0.18),
  ]
  const curve = new THREE.CatmullRomCurve3(pts)
  return new THREE.TubeGeometry(curve, 60, 0.0035, 8, false)
}

export function PhysicalMouse() {
  const group = useRef<THREE.Group>(null)
  const btnL = useRef<THREE.Mesh>(null)
  const cable = useRef<THREE.Mesh>(null)
  const lastAnchor = useRef(new THREE.Vector3(1e9, 1e9, 1e9))

  const tex = useMemo(() => makeMousePlasticTexture(), [])
  const bodyGeo = useMemo(() => makeMouseBodyGeometry(90, 58), [])
  const btnGeo = useMemo(() => makeMouseButtonGeometry(-1), [])
  const btnGeoR = useMemo(() => makeMouseButtonGeometry(1), [])

  // ABS creme envelhecido, fosco: pouca curvatura especular, sem metal.
  const plastic = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: tex,
        color: '#ffffff',
        roughness: 0.72,
        metalness: 0,
        clearcoat: 0.08,
        clearcoatRoughness: 0.65,
        vertexColors: true,
      }),
    [tex],
  )
  const btnMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: tex,
        color: '#fbf7e8',
        roughness: 0.66,
        metalness: 0,
        clearcoat: 0.12,
        clearcoatRoughness: 0.6,
        side: THREE.DoubleSide,
      }),
    [tex],
  )
  const wheelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#6f6a5c', roughness: 0.82, metalness: 0 }),
    [],
  )
  const cavityMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3f3a30', roughness: 0.9, metalness: 0 }),
    [],
  )
  const cableMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#b9b3a0', roughness: 0.88, metalness: 0 }),
    [],
  )
  // alvo de clique do mouse: MAIOR que a geometria física
  const hitMat = useMemo(
    () => new THREE.MeshBasicMaterial({ visible: false }),
    [],
  )
  const shadowTex = useMemo(() => makeContactShadowTexture(), [])

  const baseY = office.deskTopY
  const initialCable = useMemo(
    () => buildCableGeometry(new THREE.Vector3(MB_POS[0], baseY, MB_POS[2]).add(MOUSE_CABLE_ANCHOR)),
    [baseY],
  )

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1)
    // alvo: empurra o mouse conforme o cursor virtual, em modo computador
    let tx = 0
    let tz = 0
    if (office.mode === 'computer') {
      tx = (office.cursorUV.x - 0.5) * 0.075
      tz = (0.5 - office.cursorUV.y) * 0.05
      tx = Math.max(-0.038, Math.min(0.038, tx))
      tz = Math.max(-0.032, Math.min(0.032, tz))
    }
    office.mouseOffset.x += (tx - office.mouseOffset.x) * clamp01(dt * 8)
    office.mouseOffset.z += (tz - office.mouseOffset.z) * clamp01(dt * 8)

    const g = group.current
    if (g) {
      g.position.x = MB_POS[0] + office.mouseOffset.x
      g.position.z = MB_POS[2] + office.mouseOffset.z
      // guinada suave (±4°) enquanto desliza sobre a mesa
      const targetYaw = -office.mouseOffset.x * 1.75
      g.rotation.y += (targetYaw - g.rotation.y) * clamp01(dt * 6)

      // cabo vivo: sai do bico em espaço de mundo e acompanha o movimento
      g.updateMatrixWorld(true)
      const anchor = MOUSE_CABLE_ANCHOR.clone()
      g.localToWorld(anchor)
      if (cable.current && lastAnchor.current.distanceToSquared(anchor) > 4e-6) {
        lastAnchor.current.copy(anchor)
        const geo = buildCableGeometry(anchor)
        cable.current.geometry.dispose()
        cable.current.geometry = geo
      }
    }

    // afundamento: pressão global (modo computador) + pressão local (clique físico)
    pressedLocalRef.current += (liftTarget() - pressedLocalRef.current) * clamp01(dt * 10)
    const press = (office.mousePressing ? 0.0008 : 0) + pressedLocalRef.current * 0.0007
    if (btnL.current) btnL.current.position.y = -press
  })

  // registra onde o callout "CLIQUE PARA CONTROLAR" aponta
  useMemo(() => {
    office.calloutTargets.mouse.set(MB_POS[0], baseY + 0.055, MB_POS[2] + 0.005)
  }, [baseY])

  return (
    <>
      <group ref={group} position={[MB_POS[0], baseY, MB_POS[2]]}>
        {/* sombra de contato — gruda na mesa e acompanha o mouse */}
        <mesh position={[0, 0.0012, 0.004]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.105, 0.16]} />
          <meshBasicMaterial map={shadowTex} transparent depthWrite={false} />
        </mesh>

        {/* corpo de loft (bico em -z); casca superior/inferior em cores de vértice */}
        <mesh geometry={bodyGeo} material={plastic} castShadow receiveShadow />

        {/* canaleta escura + rodinha entre os botões */}
        <mesh position={[0, 0.0052, -0.04]} material={cavityMat}>
          <boxGeometry args={[0.014, 0.007, 0.026]} />
        </mesh>
        <mesh position={[0, 0.0058, -0.042]} rotation={[0, 0, Math.PI / 2]} material={wheelMat} castShadow>
          <cylinderGeometry args={[0.005, 0.005, 0.0058, 24]} />
        </mesh>

        {/* botões flutuantes, separados por costura central e entalhe frontal */}
        <mesh ref={btnL} geometry={btnGeo} material={btnMat} castShadow />
        <mesh geometry={btnGeoR} material={btnMat} castShadow />

        {/* alívio de tração: o cabo nasce aqui, no bico */}
        <mesh position={[0, 0.0052, -MOUSE_HALF_L + 0.006]} rotation={[Math.PI / 2, 0, 0]} material={plastic}>
          <cylinderGeometry args={[0.0042, 0.0032, 0.014, 12]} />
        </mesh>

        {/* alvo de clique invisível maior que a geometria */}
        <mesh
          position={[0, 0.02, 0]}
          material={hitMat}
          onClick={(e) => {
            e.stopPropagation()
            enterFromMouse()
          }}
          onPointerDown={(e) => {
            e.stopPropagation()
            pressedLocalRef.current = 1
          }}
          onPointerOver={(e) => {
            if (office.mode === 'ambient') {
              e.stopPropagation()
              setCanvasCursor('pointer')
            }
          }}
          onPointerOut={() => {
            setCanvasCursor('')
            pressedLocalRef.current = 0
          }}
        >
          <boxGeometry args={[HIT_W, 0.06, HIT_D]} />
        </mesh>
        {/* debug: alvo visível */}
        {office.debug ? (
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[HIT_W, 0.06, HIT_D]} />
            <meshBasicMaterial wireframe color="#00ff88" transparent opacity={0.6} />
          </mesh>
        ) : null}
      </group>

      {/* cabo em espaço de mundo (fora do grupo para não herdar o deslocamento) */}
      <mesh ref={cable} geometry={initialCable} material={cableMat} castShadow />
    </>
  )
}

/** Muda o cursor do canvas (R3F define `cursor` no DOM, mas TS não tipa o prop no 8.x). */
function setCanvasCursor(cursor: string) {
  const canvas = document.querySelector('canvas')
  if (canvas) canvas.style.cursor = cursor
}

/** Entra no modo computador pelo mouse físico. */
export function enterFromMouse() {
  if (office.mode !== 'ambient') return
  if (office.printer.state !== 'idle') return
  enterComputerMode()
}

/* ------------------------------------------------------------ pôster na parede */

export function Poster() {
  const tex = useMemo(() => makePosterTexture(), [])
  const mat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: tex,
        roughness: 0.72,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
      }),
    [tex],
  )
  const frameMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1c1410', roughness: 0.5, metalness: 0.2 }),
    [],
  )
  const [px, py, pz] = POSTER_POS
  const w = 0.46
  const h = 0.64
  return (
    <group position={[px, py, pz]} rotation={[0, 0.04, 0]}>
      {/* moldura */}
      <mesh position={[0, 0.015, -0.008]}>
        <boxGeometry args={[w + 0.04, h + 0.04, 0.025]} />
        <meshStandardMaterial color="#3a2c1c" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.015, 0.006]} material={frameMat}>
        <boxGeometry args={[w + 0.015, h + 0.015, 0.01]} />
      </mesh>
      {/* arte */}
      <mesh position={[0, 0.015, 0.012]} material={mat} rotation={[0, 0, 0]}>
        <planeGeometry args={[w, h]} />
      </mesh>
      {/* sombra fina do pôster na parede */}
      <mesh position={[0, -0.02, -0.03]} rotation={[0, 0, 0]}>
        <planeGeometry args={[w - 0.02, h + 0.05]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------ bloco de notas + caneta */

export function PaperPad() {
  const padTex = useMemo(() => makePadTexture(), [])
  const padMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: padTex,
        roughness: 0.78,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [padTex],
  )
  // folhas acumuladas: um pequeno "degrau" de papel ao lado (dá volume ao bloco)
  const stackMat = useMemo(() => new THREE.MeshStandardMaterial({ color: '#e6dec2', roughness: 0.85 }), [])

  return (
    <group position={PAD_POS} rotation={[0, 0.16, 0]}>
      {/* folha de baixo (degrau) */}
      <mesh position={[-0.012, 0.004, 0.012]} rotation={[-Math.PI / 2, 0, 0]} material={stackMat}>
        <planeGeometry args={[0.26, 0.34]} />
      </mesh>
      {/* folha principal com pauta */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={padMat} receiveShadow>
        <planeGeometry args={[0.26, 0.34]} />
      </mesh>
    </group>
  )
}

export function Pen() {
  return (
    <group position={PEN_POS} rotation={[0, 0.1, -0.05]}>
      <group rotation={[Math.PI / 2, 0, 0]}>
        {/* corpo */}
        <mesh castShadow>
          <cylinderGeometry args={[0.007, 0.007, 0.2, 10]} />
          <meshStandardMaterial color="#d9a035" roughness={0.55} />
        </mesh>
        {/* tampa */}
        <mesh position={[0, -0.1, 0]}>
          <cylinderGeometry args={[0.008, 0.008, 0.03, 10]} />
          <meshStandardMaterial color="#7c5a28" roughness={0.5} />
        </mesh>
        {/* ponta */}
        <mesh position={[0, -0.106, -0.012]}>
          <coneGeometry args={[0.006, 0.024, 8]} />
          <meshStandardMaterial color="#e8ddc4" roughness={0.4} />
        </mesh>
      </group>
    </group>
  )
}

/* ------------------------------------------------------------ disquete */

export function FloppyDisk() {
  const labelTex = useMemo(() => makeBeigeTexture('body'), [])
  const labelMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: labelTex,
        roughness: 0.7,
        metalness: 0,
        side: THREE.DoubleSide,
      }),
    [labelTex],
  )
  return (
    <group position={FLOPPY_POS} rotation={[0, -0.9, 0]}>
      {/* carcaça */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[0.09, 0.005, 0.09]} />
        <meshStandardMaterial color="#6d4f2e" roughness={0.55} />
      </mesh>
      {/* etiqueta */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]} material={labelMat}>
        <planeGeometry args={[0.06, 0.02]} />
      </mesh>
      {/* janela de leitura */}
      <mesh position={[0.02, 0, -0.021]} rotation={[0, 0, 0]}>
        <boxGeometry args={[0.016, 0.007, 0.008]} />
        <meshStandardMaterial color="#241a10" roughness={0.4} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------ objeto avulso */

export function DriveProps() {
  const mgTex = useMemo(() => makeBeigeTexture('dark'), [])
  const mgMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: mgTex, roughness: 0.55, metalness: 0 }),
    [mgTex],
  )
  return (
    <group>
      {/* caneca — frente esquerda, perto do bloco de notas (fundo no tampo) */}
      <group position={[-0.76, office.deskTopY - 0.005, 0.42]} rotation={[0, 0.4, 0]}>
        <mesh position={[0, 0.055, 0]} castShadow receiveShadow material={mgMat}>
          <cylinderGeometry args={[0.042, 0.038, 0.1, 20]} />
        </mesh>
        <mesh position={[0.05, 0.055, 0]} rotation={[0, 0, 0]} material={mgMat}>
          <torusGeometry args={[0.026, 0.008, 8, 16, Math.PI]} />
        </mesh>
        {/* fundo interno (café) */}
        <mesh position={[0, 0.1, 0]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.04, 20]} />
          <meshStandardMaterial color="#3a2416" roughness={0.9} />
        </mesh>
      </group>
      {/* lápis — à frente, entre teclado e borda da mesa (rola sobre o tampo) */}
      <group position={[0.2, office.deskTopY + 0.006, 0.5]} rotation={[0, -0.9, 0]}>
        <mesh position={[0, 0, -0.05]} rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.006, 0.006, 0.22, 8]} />
          <meshStandardMaterial color="#c8862b" roughness={0.6} />
        </mesh>
        <mesh position={[0.005, 0, 0.06]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.006, 0.02, 8]} />
          <meshStandardMaterial color="#efe3c6" roughness={0.5} />
        </mesh>
      </group>
    </group>
  )
}