import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  DESK_D,
  DESK_THICK,
  DESK_W,
  FLOOR_Y,
  KB_POS,
  KB_SCALE,
  KB_YAW,
  LAMP_POS,
  LAMP_YAW,
  MB_POS,
  PEN_POS,
  POSTER_POS,
  POSTER_H,
  POSTER_W,
  WALL_Z,
  clamp01,
} from './officeGeometry'
import {
  makeBeigeTexture,
  makeContactShadowTexture,
  makeDeskWoodTexture,
  makeMousePlasticTexture,
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
import {
  kbBedY,
  keyboardKeys,
  makeKeybedGeometry,
  makeKeycapGeometry,
  makeKeyboardCableGeometry,
  makeKeyboardChassisGeometry,
} from './keyboardGeometry'
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
        roughness: 0.42,
        metalness: 0,
        clearcoat: 0.24,
        clearcoatRoughness: 0.38,
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

/**
 * Luminária de mesa retrô/moderna desenhada como OBJETO DE PRODUTO: base
 * torneada e maciça (chamfrada, com anel metálico), coluna afunilada com
 * colares de usinagem, junta esférica, braço articulado limpo com dupla
 * articulação e cabeça de cúpula tipo sino. A cúpula é estampada: chapa com
 * parede espessa, borda enrolada (roll) e interior claro que rebate a luz do
 * bulbo — nunca um cone primitivo. O esmalte creme conversa com o plástico do
 * CRT; a luz quente do bulbo é a key da cena (pool na bancada + "respiração"
 * do filamento).
 */

/* pivô da cabeça em espaço da base: o ponto do pescoço onde o braço encaixa
   (o grupo da cúpula gira em torno daqui — sem gap braço/abajur). Erguesa em
   relação ao ombro (0.005, −0.012) para o braço descer suave até o pescoço e
   a boca da cúpula não "roçar" no tampo. */
const SHADE_PIVOT: [number, number, number] = [0.145, 0.285, 0.185]

export function OfficeLamp({ shadows }: { shadows: boolean }) {
  /* alvo do pool de luz, no mundo: o centro da bancada (teclado/mouse) */
  const poolTarget = useMemo(() => {
    const o = new THREE.Object3D()
    o.position.set(0.05, office.deskTopY, 0.2)
    return o
  }, [])
  const bulbMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#ffdfb0',
        emissive: '#ffd29a',
        emissiveIntensity: 3.4,
        toneMapped: false,
      }),
    [],
  )

  /* --- cúpula: perfil de sino gerado por curva (nada de cone reto) ---------
     Topo é um pescoço cilíndrico (onde o braço encaixa); a saia alarga com
     aceleração (curva de sino), termina numa borda enrolada de chapa (roll)
     e volta para cima pela face interna com ~9mm de espessura. */
  const shadeGeo = useMemo(() => {
    const neckR = 0.034
    const neckY = 0.018
    const lipR = 0.128
    const lipY = -0.164
    const pts: THREE.Vector2[] = []
    // pescoço → ombro
    pts.push(new THREE.Vector2(neckR, neckY))
    pts.push(new THREE.Vector2(0.035, 0.01))
    pts.push(new THREE.Vector2(0.036, 0))
    // saia em curva de sino (flange acelera em direção à boca)
    const N = 18
    for (let i = 1; i <= N; i++) {
      const t = i / N
      const f = Math.pow(t, 1.32)
      pts.push(new THREE.Vector2(neckR + 0.002 + (lipR - neckR - 0.002) * f, 0 + lipY * t))
    }
    // borda enrolada (chapa dobrada): virada para fora e para dentro
    pts.push(new THREE.Vector2(0.1305, -0.1725))
    pts.push(new THREE.Vector2(0.1245, -0.1785))
    pts.push(new THREE.Vector2(0.117, -0.1765))
    // face interna, subindo até o pescoço (fecha o volume com parede)
    const inner: [number, number][] = [
      [0.109, -0.156],
      [0.098, -0.13],
      [0.087, -0.105],
      [0.076, -0.081],
      [0.066, -0.06],
      [0.057, -0.041],
      [0.049, -0.024],
      [0.043, -0.009],
      [0.039, 0.006],
      [0.036, 0.014],
      [0.034, neckY],
    ]
    for (const [r, y] of inner) pts.push(new THREE.Vector2(r, y))
    return new THREE.LatheGeometry(pts, 48)
  }, [])

  /* garganta interna: tronco de cone claro que rebate a luz do bulbo (a
     cavidade "existe": funil da boca ao alojamento da lâmpada) */
  const shadeInner = useMemo(
    () => new THREE.CylinderGeometry(0.042, 0.1, 0.13, 40, 1, true),
    [],
  )
  /* aro metálico na boca — define a borda com aresta nítida de chapa dobrada */
  const rim = useMemo(() => new THREE.TorusGeometry(0.116, 0.0055, 12, 48), [])

  /* --- base maciça: disco torneado com chamffre e anel metálico ------------ */
  const baseGeo = useMemo(
    () =>
      new THREE.LatheGeometry(
        [
          new THREE.Vector2(0.118, 0),
          new THREE.Vector2(0.121, 0.001),
          new THREE.Vector2(0.124, 0.003),
          new THREE.Vector2(0.125, 0.005),
          new THREE.Vector2(0.124, 0.008),
          new THREE.Vector2(0.12, 0.011),
          new THREE.Vector2(0.114, 0.014),
          new THREE.Vector2(0.106, 0.017),
          new THREE.Vector2(0.096, 0.02),
          new THREE.Vector2(0.084, 0.023),
          new THREE.Vector2(0.078, 0.024),
          new THREE.Vector2(0, 0.024),
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.118, 0),
        ],
        48,
      ),
    [],
  )
  /* anel metálico torneado embutido na base (detalhe de máquina, não primitiva) */
  const baseRing = useMemo(() => new THREE.TorusGeometry(0.117, 0.0035, 10, 48), [])

  const enamelMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#e7dabe',
        roughness: 0.42,
        metalness: 0.06,
        clearcoat: 0.5,
        clearcoatRoughness: 0.3,
        side: THREE.DoubleSide,
      }),
    [],
  )
  /* interior claro e térreo — rebate a luz quente do bulbo (revela cavidade) */
  const innerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#f6e8c2',
        roughness: 0.82,
        metalness: 0.03,
        side: THREE.BackSide,
        emissive: '#6d5126',
        emissiveIntensity: 0.22,
      }),
    [],
  )
  const metalMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#251b12',
        roughness: 0.5,
        metalness: 0.6,
        clearcoat: 0.25,
        clearcoatRoughness: 0.45,
      }),
    [],
  )
  const metalLightMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#52402c',
        roughness: 0.42,
        metalness: 0.55,
        clearcoat: 0.35,
        clearcoatRoughness: 0.3,
      }),
    [],
  )
  const baseMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#2a1f15',
        roughness: 0.5,
        metalness: 0.55,
        clearcoat: 0.3,
        clearcoatRoughness: 0.4,
      }),
    [],
  )
  const brassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#6b5230',
        roughness: 0.35,
        metalness: 0.75,
        clearcoat: 0.4,
        clearcoatRoughness: 0.3,
      }),
    [],
  )
  const shadeShadow = useMemo(() => makeContactShadowTexture(), [])
  const bulbLight = useRef<THREE.PointLight>(null)

  /* --- cinemática da cabeça -----------------------------------------------
     PIVÔ da cabeça fica NO pescoço da cúpula (junta articulada do braço):
     o grupo gira em torno do ponto onde o braço encaixa — sem "gap" entre o
     braço e o corpo do abajur. Posição do pescoço em espaço da base. */

  /* geometria do braço: junta esférica do topo da haste → pivô da cabeça */
  const armGeo = useMemo(() => {
    const basePt = new THREE.Vector3(0, 0.3, -0.012)
    const tip = new THREE.Vector3(...SHADE_PIVOT)
    const dir = tip.clone().sub(basePt)
    const len = dir.length()
    const mid = basePt.clone().add(dir.clone().multiplyScalar(0.5))
    return {
      mid: [mid.x, mid.y, mid.z] as [number, number, number],
      len,
      quat: new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        tip.sub(basePt).normalize(),
      ),
    }
  }, [])

  /* micro-vida: a lâmpada "respira" 1–2% (emissão + luz), como filamento
     de 3000K com leve surto de tensão — imperceptível se estática. */
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const breath = 0.5 + 0.5 * Math.sin(t * 0.7)
    const noise = Math.sin(t * 2.13) * 0.3 + Math.sin(t * 5.7) * 0.15
    const k = 1 + (breath * noise) * 0.02
    bulbMat.emissiveIntensity = 3.4 * k
    if (bulbLight.current) bulbLight.current.intensity = (shadows ? 30 : 20) * k
    // acompanha o tampo medido (o Desk mede deskTopY no mount)
    if (poolTarget.position.y !== office.deskTopY) {
      poolTarget.position.set(poolTarget.position.x, office.deskTopY, poolTarget.position.z)
      poolTarget.updateMatrixWorld(true)
    }
  })

  return (
    <>
      <group position={LAMP_POS} rotation={[0, LAMP_YAW, 0]}>
        {/* sombra de contato no tampo — ancora a base na madeira */}
        <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[0.5, 0.5]} />
          <meshBasicMaterial map={shadeShadow} transparent depthWrite={false} />
        </mesh>

        {/* base maciça apoiada no tampo (fundo em y = 0) */}
        <mesh geometry={baseGeo} material={baseMat} castShadow receiveShadow />
        {/* anel metálico embutido na curvatura da base */}
        <mesh geometry={baseRing} position={[0, 0.006, 0]} rotation={[Math.PI / 2, 0, 0]} material={brassMat} />

        {/* pé da coluna: bocall esculpido + colarinho de usinagem */}
        <mesh position={[0, 0.032, 0]} material={metalMat} castShadow>
          <cylinderGeometry args={[0.046, 0.05, 0.014, 24]} />
        </mesh>
        <mesh position={[0, 0.042, 0]} material={metalLightMat} castShadow>
          <cylinderGeometry args={[0.034, 0.038, 0.014, 24]} />
        </mesh>
        {/* toro de reforço no pé da coluna */}
        <mesh position={[0, 0.048, 0]} rotation={[Math.PI / 2, 0, 0]} material={brassMat}>
          <torusGeometry args={[0.032, 0.004, 8, 32]} />
        </mesh>

        {/* coluna afunilada, levemente inclinada para a frente */}
        <mesh position={[0, 0.164, -0.006]} rotation={[-0.045, 0, 0]} material={metalMat} castShadow>
          <cylinderGeometry args={[0.014, 0.02, 0.24, 14]} />
        </mesh>
        {/* colarinho no topo da coluna + junta esférica */}
        <mesh position={[0, 0.28, -0.009]} rotation={[Math.PI / 2, 0, 0]} material={metalLightMat} castShadow>
          <torusGeometry args={[0.02, 0.005, 8, 24]} />
        </mesh>
        <mesh position={[0, 0.3, -0.012]} material={metalLightMat} castShadow>
          <sphereGeometry args={[0.026, 16, 14]} />
        </mesh>

        {/* braço articulado: junta → pivô do pescoço da cúpula */}
        <mesh position={armGeo.mid} quaternion={armGeo.quat} material={metalMat} castShadow>
          <cylinderGeometry args={[0.011, 0.014, armGeo.len, 12]} />
        </mesh>

        {/* cabeça girando no pescoço (pivô do braço): boca para a bancada —
            inclinação moderada (~15°) e não agressiva: o abajur mira a área
            de trabalho sem "cavar" na madeira */}
        <group position={SHADE_PIVOT} rotation={[-0.26, 0.08, 0.03]}>
          {/* união do braço: colarinho + junta esférica no pescoço */}
          <mesh position={[0, 0.018, 0]} material={metalLightMat} castShadow>
            <cylinderGeometry args={[0.034, 0.03, 0.03, 24]} />
          </mesh>
          <mesh position={[0, 0.03, 0]} rotation={[Math.PI / 2, 0, 0]} material={brassMat}>
            <torusGeometry args={[0.02, 0.006, 8, 24]} />
          </mesh>
          {/* cúpula estampada (sino com parede) */}
          <mesh geometry={shadeGeo} material={enamelMat} castShadow receiveShadow />
          {/* garganta clara difusa — cavidade real que rebate a luz */}
          <mesh geometry={shadeInner} position={[0, -0.121, 0]} material={innerMat} />
          {/* aro metálico definindo a boca (borda de chapa dobrada) */}
          <mesh geometry={rim} position={[0, -0.18, 0]} rotation={[Math.PI / 2, 0, 0]} material={brassMat} />
          {/* alojamento do bulbo (casquilho + bulbo aceso dentro da cavidade) */}
          <mesh position={[0, -0.075, 0]} material={metalLightMat}>
            <cylinderGeometry args={[0.013, 0.014, 0.05, 16]} />
          </mesh>
          <mesh position={[0, -0.118, 0]} material={bulbMat}>
            <sphereGeometry args={[0.03, 18, 16]} />
          </mesh>

          {/* luz quente — 2700–3000K, key da cena */}
          <pointLight
            ref={bulbLight}
            position={[0, -0.19, 0.01]}
            intensity={shadows ? 38 : 24}
            distance={5.2}
            decay={1.5}
            color="#ffb062"
            castShadow={shadows}
            shadow-mapSize-width={1024}
            shadow-mapSize-height={1024}
            shadow-bias={-0.0006}
          />
          {/* pool da lâmpada: spotlight largo e macio deixando uma mancha de
              luz na bancada (sem mapa de sombra — só modelagem fotométrica).
              Com a cabeça mais erguida, o facho chega por um ângulo mais
              suave → hotspot mais esparramado e natural no centro da mesa */}
          <spotLight
            position={[0, -0.2, 0.02]}
            target={poolTarget}
            angle={0.9}
            penumbra={0.55}
            intensity={shadows ? 25 : 16}
            distance={3.2}
            decay={1.4}
            color="#ffb062"
          />
        </group>
      </group>
      {/* alvo do pool entra no grafo p/ ter matrixWorld atualizada pelo renderer */}
      <primitive object={poolTarget} />
    </>
  )
}

/* ------------------------------------------------------------------- teclado */

/**
 * Teclado retrô de tamanho completo (46cm × 16cm, frente 16mm / fundo 36mm).
 * Carcaça plastificada em bege envelhecido (mesmo plástico do mouse), teclas
 * cônicas com bisel evidenciadas por uma "caixa" (keybed) escura rebaixada que
 * abre os vãos entre elas. Agrupamento clássico: fileira de função com Esc e
 * F1-F12, bloco alfanumérico (Enter/Shift/Backspace/Caps), cluster de navegação
 * (Insert/Delete/Home/End/PgUp/PgDn), setas em T invertido e teclado numérico
 * de 19 teclas à direita. InstancedMesh para as ~115 teclas.
 */
export function Keyboard() {
  const places = useMemo(() => keyboardKeys(), [])
  const capGeo = useMemo(() => makeKeycapGeometry(), [])
  const chassisGeo = useMemo(() => makeKeyboardChassisGeometry(), [])
  const bedGeo = useMemo(() => makeKeybedGeometry(), [])
  const plastic = useMemo(() => makeMousePlasticTexture(), [])
  const shadow = useMemo(() => makeContactShadowTexture(), [])
  const caps = useRef<THREE.InstancedMesh>(null)

  const chassisMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: plastic,
        color: '#ffffff',
        vertexColors: true,
        roughness: 0.6,
        metalness: 0,
        clearcoat: 0.16,
        clearcoatRoughness: 0.5,
      }),
    [plastic],
  )
  const bedMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: plastic,
        color: '#a5957a',
        roughness: 0.92,
        metalness: 0,
      }),
    [plastic],
  )
  const capMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        map: plastic,
        color: '#fffaf0',
        roughness: 0.48,
        metalness: 0,
        clearcoat: 0.22,
        clearcoatRoughness: 0.42,
      }),
    [plastic],
  )
  const cableMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c9c2ae', roughness: 0.9, metalness: 0 }),
    [],
  )

  /* cabo do teclado: sai da traseira-direita da carcaça e desce em curva suave
     para trás, juntando-se à rota do cabo do mouse e sumindo SOB o plinto da TV
     (z<-0.23, escondido pela carcaça) — rota curta, discreta e plausível. */
  const cableGeo = useMemo(
    () =>
      makeKeyboardCableGeometry([
        { x: 0.27, y: office.deskTopY + 0.033, z: 0.188 },
        { x: 0.36, y: office.deskTopY + 0.027, z: 0.1 },
        { x: 0.385, y: office.deskTopY + 0.024, z: -0.01 },
        { x: 0.36, y: office.deskTopY + 0.023, z: -0.13 },
        { x: 0.3, y: office.deskTopY + 0.027, z: -0.3 },
        { x: 0.23, y: office.deskTopY + 0.034, z: -0.52 },
      ]),
    [],
  )

  useLayoutEffect(() => {
    const mesh = caps.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    const p = new THREE.Vector3()
    const q = new THREE.Quaternion()
    const s = new THREE.Vector3()
    const c = new THREE.Color()
    for (let i = 0; i < places.length; i++) {
      const k = places[i]
      p.set(k.x, kbBedY(k.z) - 0.0016, k.z)
      s.set(k.sx, 1, k.sz)
      q.identity()
      m.compose(p, q, s)
      mesh.setMatrixAt(i, m)
      const wave = Math.sin(k.seed * 12.9898) * 43758.5453
      const frac = wave - Math.floor(wave)
      const tint = (frac - 0.5) * 0.045
      c.setRGB(0.99 + tint, 0.98 + tint, 0.94 + tint)
      mesh.setColorAt(i, c)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [places])

  return (
    <>
      <group position={KB_POS} rotation={[0, KB_YAW, 0]} scale={[KB_SCALE, KB_SCALE, KB_SCALE]}>
        <mesh geometry={chassisGeo} material={chassisMat} castShadow receiveShadow />
        <mesh geometry={bedGeo} material={bedMat} receiveShadow />
        <instancedMesh
          ref={caps}
          args={[capGeo, capMat, places.length]}
          castShadow
          receiveShadow
        />
        {/* sombra de contato no tampo — alarga um pouco além da carcaça p/ ancorar */}
        <mesh position={[0, 0.0013, 0.004]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.53, 0.21]} />
          <meshBasicMaterial map={shadow} transparent depthWrite={false} />
        </mesh>
      </group>
      <mesh geometry={cableGeo} material={cableMat} castShadow />
    </>
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

/** Cabo em coordenadas de MUNDO: sai do bico do mouse e, em curva suave,
 *  desce pelo corredor entre o teclado e o mouse, somando-se à rota do cabo
 *  do teclado e sumindo sob o plinto da TV (z<-0.23) — par, discreto. */
function buildCableGeometry(anchor: THREE.Vector3): THREE.BufferGeometry {
  const y = office.deskTopY
  const pts = [
    anchor.clone(),
    new THREE.Vector3(0.36, y + 0.006, 0.22),
    new THREE.Vector3(0.32, y + 0.008, 0.14),
    new THREE.Vector3(0.295, y + 0.009, 0.05),
    new THREE.Vector3(0.28, y + 0.011, -0.06),
    new THREE.Vector3(0.25, y + 0.014, -0.2),
    new THREE.Vector3(0.2, y + 0.018, -0.34),
  ]
  const curve = new THREE.CatmullRomCurve3(pts)
  return new THREE.TubeGeometry(curve, 60, 0.0032, 8, false)
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
          <planeGeometry args={[0.13, 0.19]} />
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
  const w = POSTER_W
  const h = POSTER_H
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
      {/* sombra fina do pôster na parede, puxada para baixo (luz vinda de cima/esq) */}
      <mesh position={[0.004, -0.024, -0.03]}>
        <planeGeometry args={[w - 0.02, h + 0.05]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.42} />
      </mesh>
    </group>
  )
}

/* ------------------------------------------------------------ caneta */

export function Pen() {
  const shadow = useMemo(() => makeContactShadowTexture(), [])
  return (
    <group position={PEN_POS} rotation={[0, 0.1, -0.05]}>
      {/* sombra de contato — a caneta "gruda" na madeira */}
      <mesh position={[0, 0.0012, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.05, 0.03]} />
        <meshBasicMaterial map={shadow} transparent depthWrite={false} />
      </mesh>
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