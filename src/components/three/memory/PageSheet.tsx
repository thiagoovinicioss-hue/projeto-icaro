import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import {
  clamp01,
  easeInOutCubic,
  easeOutCubic,
  getPageGeometry,
  PAGE_H,
  PAGE_W,
  writeDeform,
} from './memoryGeometry'

/**
 * O calendário em si — frente impressa + verso branco, um único plano.
 * Comportamentos imperativos:
 *
 *  - fadeIn(): nasce com fade de opacidade (entrada da cena).
 *  - swapOut(): VIRADA de página real e visível — a folha levanta da aresta
 *    dianteira, gira para TRÁS sobre a dobradiça (a linha das argolas, no
 *    topo) e assenta atrás, revelando a folha de baixo (pré-carregada).
 *    ~0.8s, com o papel envergando ao meio durante a virada.
 *
 * Encadernação real em 3D: trilho de metal + aros no topo da folha. As argolas
 * ficam FIXAS na dobradiça (a folha passa pela dobra, como bloco de notas) —
 * só o papel gira. Nada aqui é estado React — anima-se via useFrame + refs.
 */

export type PageSheetApi = {
  fadeIn: (onDone?: () => void) => void
  swapOut: (onDone?: () => void, dir?: 'next' | 'prev') => void
  snapshot: () => { mode: string; printOpacity: number; flipX: number }
}

type Props = {
  faceTexture: THREE.Texture
  versoTexture: THREE.Texture
  entrance: 'fade' | 'flat'
  reduced: boolean
}

const BASE_Y = 0.062 // folha sobre a pilha
const BASE_Z = PAGE_H / 2

type Mode = 'fadein' | 'idle' | 'swap'

/* ------------------------------------------------ encadernação 3D (argolas) */

const BIND_RINGS = 9

/**
 * Bloco de notas: trilho fino + argolas de arame reais (metal) na borda de
 * trás da folha. Cada argola é um toro vertical que ENVOLVE a aresta do topo
 * (meia-volta acima do papel, meia escondida por baixo) — como espiral de
 * papelaria. Arame metálico: MeshStandard com metalness alta, que apanha as
 * luzes quentes da cena (sem envmap, aço não vira preto — o brilho vem dos
 * highlights). Opacidade segue a da folha no fade da troca.
 */
function BinderRings({ fadeRef }: { fadeRef?: MutableRefObject<number> }) {
  const rings = useMemo(() => {
    const from = -PAGE_W / 2 + 0.26
    const to = PAGE_W / 2 - 0.26
    return Array.from({ length: BIND_RINGS }, (_, i) => {
      const x = from + ((to - from) * (i + 0.5)) / BIND_RINGS
      const s1 = Math.sin(i * 12.9898 + 1.77)
      const s2 = Math.sin(i * 6.2831 + 3.11)
      return {
        x,
        y: 0.026 + s1 * 0.002,
        tilt: s2 * 0.045,
        lean: s1 * 0.03,
      }
    })
  }, [])

  const railMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#a9b4c9',
        metalness: 0.74,
        roughness: 0.34,
        transparent: true,
      }),
    [],
  )
  const ringMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#d0d9ea',
        metalness: 0.86,
        roughness: 0.2,
        transparent: true,
      }),
    [],
  )

  useFrame(() => {
    const f = fadeRef?.current ?? 1
    railMat.opacity = f
    ringMat.opacity = f
  })

  return (
    <group position={[0, -0.02, -PAGE_H + 0.02]}>
      {/* trilho metálico colado na aresta de trás do papel */}
      <mesh position={[0, 0.03, 0]} material={railMat} renderOrder={8}>
        <boxGeometry args={[PAGE_W - 0.48, 0.012, 0.028]} />
      </mesh>
      {/* argolas verticais envolvendo a borda do topo */}
      {rings.map((r, i) => (
        <mesh
          key={i}
          position={[r.x, r.y, 0]}
          rotation={[0, Math.PI / 2, r.tilt]}
          material={ringMat}
          renderOrder={9}
        >
          <torusGeometry args={[0.034, 0.0085, 16, 42]} />
        </mesh>
      ))}
    </group>
  )
}

export const PageSheet = forwardRef<PageSheetApi, Props>(function PageSheet(
  { faceTexture, versoTexture, entrance, reduced },
  ref,
) {
  const group = useRef<THREE.Group>(null)
  const pivot = useRef<THREE.Group>(null)
  const frontRef = useRef<THREE.Mesh>(null)
  const backRef = useRef<THREE.Mesh>(null)

  const geo = useMemo(() => {
    const g = getPageGeometry()
    return { front: g.front, mate: g.mate }
  }, [])

  // face impressa SEMILUMINOSA (unlit): o desenho do papel (incl. o vermelho do
  // manuscrito) aparece sempre exatamente como foi pintado, sem ser lavado pela
  // luz âmbar nem pelo tone mapping (ACES) — toneMapped:false garante o vermelho
  const frontMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: faceTexture,
        transparent: true,
        opacity: 1,
        toneMapped: false,
      }),
    [faceTexture],
  )
  const versoMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: versoTexture,
        roughness: 0.9,
        metalness: 0,
        transparent: true,
        opacity: 1,
        side: THREE.FrontSide,
      }),
    [versoTexture],
  )

  // estado do motor (mutable)
  const st = useRef({
    mode: 'fadein' as Mode,
    t: 0,
    dur: 1,
    printOpacity: 1,
    lastCurl: 0,
    swapDir: 'next' as 'next' | 'prev',
    doneCb: null as (() => void) | null,
  })

  const ringsFade = useRef(1)

  // curva o papel (envergamento) na geometria — frente e verso juntas
  const applyCurl = (curl: number) => {
    const f = frontRef.current
    const b = backRef.current
    if (f) writeDeform(f.geometry, { crumple: 0, curl })
    if (b && b.geometry !== f?.geometry) writeDeform(b.geometry, { crumple: 0, curl })
  }

  // entrega/assinatura de entrada é decidida UMA vez (no mount da folha)
  const entranceRef = useRef(entrance)
  useEffect(() => {
    const e = entranceRef.current
    st.current.mode = 'idle'
    st.current.printOpacity = e === 'fade' ? 0 : 1
    st.current.lastCurl = 0
    if (group.current) {
      group.current.position.set(0, BASE_Y, BASE_Z)
      group.current.rotation.set(0, 0, 0)
    }
    if (pivot.current) pivot.current.rotation.set(0, 0, 0)
    if (backRef.current) backRef.current.visible = false
    applyCurl(0)
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      fadeIn(done) {
        st.current.mode = 'fadein'
        st.current.t = 0
        st.current.dur = 1.1
        st.current.doneCb = done ?? null
      },
      swapOut(onDone?: () => void, dir: 'next' | 'prev' = 'next') {
        if (reduced) {
          st.current.mode = 'idle'
          st.current.printOpacity = 0
          queueMicrotask(() => onDone?.())
          return
        }
        st.current.mode = 'swap'
        st.current.t = 0
        st.current.dur = 1.1
        st.current.swapDir = dir
        st.current.doneCb = onDone ?? null
      },
      snapshot: () => ({
        mode: st.current.mode,
        printOpacity: st.current.printOpacity,
        flipX: pivot.current?.rotation.x ?? 0,
      }),
    }),
    [reduced],
  )

  useFrame((_, delta) => {
    const s = st.current
    const g = group.current
    const pv = pivot.current
    if (!g || !pv) return
    const dt = Math.min(delta, 0.1)
    // as argolas ficam FIXAS na dobradiça; apenas o papel fadeia na entrada
    ringsFade.current = s.mode === 'fadein' ? s.printOpacity : 1

    if (s.mode === 'fadein') {
      s.t += dt
      const p = clamp01(s.t / s.dur)
      s.printOpacity = easeOutCubic(p)
      if (p >= 1) {
        s.printOpacity = 1
        s.mode = 'idle'
        const cb = s.doneCb
        s.doneCb = null
        cb?.()
      }
    } else if (s.mode === 'swap') {
      // VIRADA real em ambos os sentidos:
      //  - 'next': a folha gira para TRÁS sobre a dobradiça do topo (linha das
      //    argolas), 0 → 180°; na 1ª metade vê-se a frente impressa levantando,
      //    ao passar do topo ela esmorece e o VERSO branco continua até assentar.
      //  - 'prev': espelhado, gira na direção oposta (para a FRENTE), como ao
      //    voltar a página anterior de um bloco de notas.
      s.t += dt
      const p = clamp01(s.t / s.dur)
      const e = easeInOutCubic(p)
      const th = Math.PI * e
      pv.rotation.x = th * (s.swapDir === 'prev' ? 1 : -1)
      // papel envergando ao meio (como vira de bloco de notas)
      const curl = Math.sin(e * Math.PI) * 0.05
      if (Math.abs(s.lastCurl - curl) > 1e-4) {
        applyCurl(curl)
        s.lastCurl = curl
      }
      // crossfade frente → verso no meio da virada
      const fade = clamp01((e - 0.5) / 0.3)
      // verso aparece e depois SOME suavemente enquanto a folha assenta atrás
      const settle = clamp01((e - 0.68) / 0.24)
      if (backRef.current) backRef.current.visible = fade > 0
      s.printOpacity = 1 - fade
      versoMat.opacity = fade * (1 - settle)
      if (p >= 1) {
        s.printOpacity = 0
        versoMat.opacity = 0
        s.mode = 'idle'
        pv.rotation.x = 0
        applyCurl(0)
        s.lastCurl = 0
        const cb = s.doneCb
        s.doneCb = null
        cb?.()
      }
    } else {
      // idle
      if (g.position.y !== BASE_Y) {
        g.position.set(0, BASE_Y, BASE_Z)
      }
      if (pv.rotation.x !== 0) pv.rotation.x = 0
      if (s.lastCurl !== 0) {
        applyCurl(0)
        s.lastCurl = 0
      }
      if (backRef.current) backRef.current.visible = false
    }

    if (frontRef.current) {
      frontMat.side = THREE.FrontSide
    }
    frontMat.opacity = s.printOpacity
  })

  return (
    <group ref={group}>
      {/* dobradiça: o pivô fica na ARESTA DE TRÁS (linha das argolas) */}
      <group ref={pivot} position={[0, 0, -PAGE_H]}>
        <group position={[0, 0, PAGE_H]}>
          <mesh ref={frontRef} geometry={geo.front} material={frontMat} />
          <mesh
            ref={backRef}
            geometry={geo.mate}
            material={versoMat}
            rotation={[Math.PI, 0, 0]}
            position={[0, -0.0012, -PAGE_H]}
          />
        </group>
      </group>
      {/* argolas FIXAS na dobradiça — a folha gira por baixo delas */}
      <BinderRings fadeRef={ringsFade} />
    </group>
  )
})