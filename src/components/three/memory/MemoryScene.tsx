import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { memoryStages } from '../../../data/memoryCalendar'
import { quality } from '../../../utils/sim'
import { PageSheet, type PageSheetApi } from './PageSheet'
import { clamp01, easeQuintOut, PAGE_H, PAGE_W } from './memoryGeometry'
import { getFaceTexture, getVersoTexture } from './memoryTextures'

const STAGES = memoryStages

/* ------------------------------------------------------------------ layout */

function useSceneScale(): number {
  const viewport = useThree((s) => s.viewport)
  return useMemo(() => {
    const m = Math.min(viewport.width, viewport.height)
    return 0.55 + clamp01(m / 2.4) * 0.73
  }, [viewport.width, viewport.height])
}

/* ---------------------------------------------- câmera de cima, de perto */

function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const setScale = useSceneScale()
  const lastScale = useRef(0)
  useFrame(() => {
    if (Math.abs(lastScale.current - setScale) < 0.001) return
    lastScale.current = setScale
    const gx = 0.3
    const gz = 0
    camera.position.set(gx, 4.7, gz + 0.72)
    camera.fov = 33
    camera.near = 0.1
    camera.far = 40
    camera.lookAt(gx, 0.08, gz)
    camera.updateProjectionMatrix()
  })
  return null
}

/* ---------------------------------------- pilha + folha seguinte por baixo */

function Underlay({ face, opacityRef }: { face: THREE.Texture; opacityRef: MutableRefObject<number> }) {
  const mat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: face,
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    [face],
  )
  useFrame(() => {
    mat.opacity = opacityRef.current
  })
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.053, 0]} material={mat}>
      <planeGeometry args={[PAGE_W, PAGE_H]} />
    </mesh>
  )
}

/* ------------------------------------------------------- cena (dentro do Canvas) */

type InnerProps = {
  faceTex: THREE.Texture
  underTex: THREE.Texture
  stageIndex: number
  entrance: 'fade' | 'flat'
  reduced: boolean
  sheetRef: MutableRefObject<PageSheetApi | null>
  phaseRef: MutableRefObject<'intro' | 'idle' | 'swap'>
  reveal: MutableRefObject<number>
  revealT: MutableRefObject<number>
}

function MemoryInner({
  faceTex,
  underTex,
  stageIndex,
  entrance,
  reduced,
  sheetRef,
  phaseRef,
  reveal,
  revealT,
}: InnerProps) {
  const setScale = useSceneScale()
  const verso = useMemo(() => getVersoTexture(), [])

  // revela pilha/folha-por-baixo no fade de entrada
  useFrame((state, delta) => {
    if (phaseRef.current === 'intro') {
      revealT.current += Math.min(delta, 0.1)
      reveal.current = easeQuintOut(clamp01(revealT.current / 0.9))
    } else {
      reveal.current = 1
    }
    const qa = (window as unknown as { __memoryQA?: Record<string, unknown> }).__memoryQA
    if (qa) {
      qa.reveal = reveal.current
      qa.phase = phaseRef.current
      qa.page = sheetRef.current?.snapshot() ?? null
      qa.setScale = setScale
      qa.cam = {
        pos: state.camera.position.toArray(),
        fov: (state.camera as THREE.PerspectiveCamera).fov,
      }
    }
  })

  return (
    <group name="memory-world">
      {/* iluminação quente de abajur — nada de luz roxa */}
      <ambientLight intensity={0.75} color="#fff3d8" />
      <hemisphereLight args={['#ffd9a0', '#3a2410', 0.7]} />

      {/* luz quente principal da esquerda */}
      <directionalLight position={[-3.4, 5.2, 2.4]} intensity={2.0} color="#ffce8a" />
      {/* rebatimento quente pela direita */}
      <directionalLight position={[3.2, 3.4, -3]} intensity={0.6} color="#ffd9a8" />
      {/* topo em âmbar (luminária) */}
      <pointLight position={[0, 6.2, 1.4]} intensity={34} distance={12} decay={2} color="#ffb870" />

      <group position={[0.3, 0, 0]} scale={setScale}>
        <Underlay face={underTex} opacityRef={reveal} />
        <PageSheet
          key={stageIndex}
          ref={sheetRef}
          faceTexture={faceTex}
          versoTexture={verso}
          entrance={entrance}
          reduced={reduced}
        />
      </group>
    </group>
  )
}

/* ------------------------------------------------------- composição da cena */

export type MemorySceneApi = {
  next: () => void
  prev: () => void
}

type Props = {
  index: number
  onBusy: (b: boolean) => void
  onStageChange: (i: number) => void
  reduced: boolean
  api?: MutableRefObject<MemorySceneApi | null>
}

export function MemoryScene({ index, onBusy, onStageChange, reduced, api }: Props) {
  const sheetRef = useRef<PageSheetApi | null>(null)
  const phase = useRef<'intro' | 'idle' | 'swap'>('intro')
  const introNotPlayed = useRef(true)
  const revealT = useRef(0)
  const reveal = useRef(0)
  const [dir, setDir] = useState<'next' | 'prev'>('next')
  const onBusyRef = useRef(onBusy)
  onBusyRef.current = onBusy

  const faceTex = useMemo(() => getFaceTexture(index, STAGES[index]), [index])
  const nextIndex = (index + 1) % STAGES.length
  const prevIndex = (index - 1 + STAGES.length) % STAGES.length
  const target = dir === 'prev' ? prevIndex : nextIndex
  const underTex = useMemo(() => getFaceTexture(target, STAGES[target]), [target])

  // pré-desenha TODAS as faces no primeiro mount: nenhuma troca espera por carga
  useEffect(() => {
    for (let i = 0; i < STAGES.length; i++) getFaceTexture(i, STAGES[i])
  }, [])

  const entrance: 'fade' | 'flat' =
    index === 0 && introNotPlayed.current && !reduced ? 'fade' : 'flat'

  // introdução: cenário + calendário com fade, sem página em branco
  useEffect(() => {
    if (entrance !== 'fade') {
      phase.current = 'idle'
      reveal.current = 1
      onBusyRef.current(false)
      return
    }
    phase.current = 'intro'
    revealT.current = 0
    onBusyRef.current(true)
    const finish = () => {
      introNotPlayed.current = false
      phase.current = 'idle'
      onBusyRef.current(false)
    }
    const t = window.setTimeout(() => {
      if (sheetRef.current) sheetRef.current.fadeIn(finish)
      else finish()
    }, 80)
    return () => window.clearTimeout(t)
  }, [entrance])

  const handleNext = useCallback(() => {
    if (phase.current !== 'idle') return
    setDir('next')
    phase.current = 'swap'
    onBusyRef.current(true)
    // a folha debaixo (pré-carregada) já está lá; a de cima só some rápido
    sheetRef.current?.swapOut(
      () => {
        const next = (index + 1) % STAGES.length
        onStageChange(next)
        requestAnimationFrame(() => {
          phase.current = 'idle'
          onBusyRef.current(false)
        })
      },
      'next',
    )
  }, [index, onStageChange])

  const handlePrev = useCallback(() => {
    if (phase.current !== 'idle') return
    setDir('prev')
    phase.current = 'swap'
    onBusyRef.current(true)
    sheetRef.current?.swapOut(
      () => {
        const prev = (index - 1 + STAGES.length) % STAGES.length
        onStageChange(prev)
        requestAnimationFrame(() => {
          phase.current = 'idle'
          onBusyRef.current(false)
        })
      },
      'prev',
    )
  }, [index, onStageChange])

  // expõe a navegação para o DOM (setas do calendário)
  useEffect(() => {
    if (!api) return
    api.current = { next: handleNext, prev: handlePrev }
    return () => {
      if (api) api.current = null
    }
  }, [api, handleNext, handlePrev])

  return (
    <Canvas
      shadows={false}
      dpr={[1, Math.min(quality.dprCap, 2)]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.15,
      }}
      camera={{ position: [0.3, 4.9, 1], fov: 33, near: 0.1, far: 40 }}
      style={{ pointerEvents: 'none' }}
      aria-hidden
    >
      <CameraRig />
      <MemoryInner
        faceTex={faceTex}
        underTex={underTex}
        stageIndex={index}
        entrance={entrance}
        reduced={reduced}
        sheetRef={sheetRef}
        phaseRef={phase}
        reveal={reveal}
        revealT={revealT}
      />
    </Canvas>
  )
}