import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox, useCursor } from '@react-three/drei'
import * as THREE from 'three'
import { clamp01, easeOutCubic } from '../memory/memoryGeometry'
import {
  DESK_TOP_Y,
  PAPER_EXIT_ORIGIN,
  PAPER_EXIT_TILT,
  PAPER_PARK_Y,
  PAPER_PARK_Z,
  PRINT_D,
  PRINT_POS,
  PRINT_ROT_Y,
  PRINT_W,
} from './officeGeometry'
import { openQrPreview, office, setOfficeMode, exitComputerMode } from './officeState'
import {
  makeContactShadowTexture,
  makeGraphiteTexture,
  makePaperTexture,
  makePrinterPlasticTexture,
  makePrintPaperTexture,
} from './officeTextures'

/**
 * Impressora laser compacta de escritório (início dos anos 2000), no lado
 * esquerdo da mesa — plástico off-white levemente envelhecido, topo rebaixado
 * com abertura mecânica, painel frontal com saída escura e bandeja aberta com
 * folha dentro.
 *
 * Escala: ~36 cm de largura, ~20 cm de altura, ~25 cm de profundidade (menor
 * que o CRT). Base apoiada sobre o tampo (office.deskTopY). Leve rotação em Y
 * para a perspectiva natural (§24/§25).
 *
 * A única fonte de verdade é `office.mode` + `office.printer` (§48). Um único
 * useFrame avança os relógios e escreve as poses do papel:
 *
 *   idle        → (imprimir) → starting (0.25s: LED pisca + vibra)
 *   starting    → printing    (1.25s: folha sai da BOCA FRONTAL + pausa 0.2s)
 *   printing    → paper-fall  (0.62s: perde apoio + 0.30s: assenta)
 *   paper-fall  → idle + papel parado em cima do tampo + preview em 450ms
 *
 * A folha NASCE DENTRO da fenda frontal (origem no slot, não no topo), desliza
 * para fora no eixo de saída com a borda traseira ainda presa (clip plane revela
 * a parte que já passou pela boca). Ao sair por completo, há uma micro-pausa,
 * o pivô é liberado para a cena (preservando o world transform) e ela cai
 * poucos centímetros com gravidade até deitar plana sobre o tampo — nunca
 * atravessa a carcaça, a bandeja ou a mesa (§26–§29).
 */

/** dimensões locais da máquina (metros; proporção W:H:D ≈ 1:0.55:0.70) */
const P_HALF_W = PRINT_W / 2
const P_HALF_D = PRINT_D / 2

/** largura da folha impressa (retrato ~A5 reduzido para a cena) */
const SHEET_W = 0.2
const SHEET_H = 0.28
/** subdivisão da malha: permite curvatura longitudinal suave (não é placa rígida) */
const SHEET_SEG_W = 16
const SHEET_SEG_H = 24

/**
 * Cinemática da saída (tudo no espaço local do slot):
 *  - PAPER_VISIBLE0: quanto da folha já fica visível no repouso inicial (≈3%);
 *  - PAPER_SLOT_CLEAR: quanto a borda traseira precisa avançar além da boca
 *    para "soltar" de fato da máquina (boca externa em z≈0.127);
 *  - PAPER_REAR_START/END: posição (z do anchor) da borda traseira no início/fim.
 */
const PAPER_VISIBLE0 = 0.008
const PAPER_SLOT_CLEAR = 0.04
const PAPER_REAR_START = -(SHEET_H - PAPER_VISIBLE0)
const PAPER_REAR_END = PAPER_SLOT_CLEAR
const PAPER_CENTER_Z_START = PAPER_REAR_START + SHEET_H / 2
/** curvatura máxima de "peso" da ponta que sai (metros, bem sutil) */
const DROOP_MAX = 0.012

/* durações (s) */
const PRINT_EXIT_T = 1.25
const PRINT_PAUSE_T = 0.2
const PAPER_FALL_T = 0.62
const PAPER_SETTLE_T = 0.3

type PrinterProps = {
  shadows?: boolean
}

export function Printer(_props: PrinterProps) {
  const group = useRef<THREE.Group>(null)
  const anchorRef = useRef<THREE.Group>(null)
  const paperRef = useRef<THREE.Group>(null)
  const ledRef = useRef<THREE.MeshStandardMaterial>(null)
  const waitId = useRef<number | null>(null)
  const releaseRef = useRef<PaperRelease | null>(null)
  const [hover, setHover] = useState(false)
  useCursor(hover)

  const scene = useThree((s) => s.scene)

  /* --------- deformação da folha (curvatura) + plano de corte da boca --------- */
  const paperUniforms = useMemo(
    () => ({ uSag: { value: 0 }, uBow: { value: 0 }, uSheetHalf: { value: SHEET_H / 2 } }),
    [],
  )
  const clipPlane = useMemo(() => {
    const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 1000)
    return plane
  }, [])

  /* ------------------------------- materiais ------------------------------- */

  const bodyTex = useMemo(() => makePrinterPlasticTexture('base'), [])
  const bodyDarkTex = useMemo(() => makePrinterPlasticTexture('dark'), [])
  const panelTex = useMemo(() => makePrinterPlasticTexture('light'), [])
  const graphiteTex = useMemo(() => makeGraphiteTexture(), [])
  const trayPaperTex = useMemo(() => makePaperTexture('light'), [])
  const shadowTex = useMemo(() => makeContactShadowTexture(), [])
  const printPaperTex = useMemo(() => makePrintPaperTexture(), [])

  const bodyMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: bodyTex, roughness: 0.68, metalness: 0 }),
    [bodyTex],
  )
  const bodyDarkMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: bodyDarkTex, roughness: 0.75, metalness: 0 }),
    [bodyDarkTex],
  )
  const panelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: panelTex, roughness: 0.58, metalness: 0 }),
    [panelTex],
  )
  const graphiteMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: graphiteTex, roughness: 0.85, metalness: 0 }),
    [graphiteTex],
  )
  const rollerMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#262420', roughness: 0.92, metalness: 0 }),
    [],
  )
  const trayPaperMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: trayPaperTex,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0,
      }),
    [trayPaperTex],
  )
  const paperMat = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      map: printPaperTex,
      side: THREE.DoubleSide,
      roughness: 0.9,
      metalness: 0,
    })
    // revelação progressiva: um único plano de corte fixo na boca frontal oculta
    // a parte da folha que ainda está dentro da máquina (e as sombras dela).
    mat.clippingPlanes = [clipPlane]
    mat.clipShadows = true
    // curvatura longitudinal suave (a folha não é uma placa rígida): desloca os
    // vértices no espaço local da malha, com a ponta (yN<0) pendendo para baixo.
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uSag = paperUniforms.uSag
      shader.uniforms.uBow = paperUniforms.uBow
      shader.uniforms.uSheetHalf = paperUniforms.uSheetHalf
      shader.vertexShader =
        'uniform float uSag;\nuniform float uBow;\nuniform float uSheetHalf;\n' + shader.vertexShader
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float yN = transformed.y / uSheetHalf;
         float front = clamp(0.5 - 0.5 * yN, 0.0, 1.0);
         transformed.z -= uSag * front * front;
         transformed.z += uBow * (1.0 - yN * yN);`,
      )
    }
    mat.customProgramCacheKey = () => 'printPaperDeform'
    return mat
  }, [printPaperTex, paperUniforms, clipPlane])
  const shadowMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: shadowTex,
        transparent: true,
        depthWrite: false,
        opacity: 0.9,
      }),
    [shadowTex],
  )

  // registra onde o callout "VER QR CODE" aponta (o botão físico frontal)
  useMemo(() => {
    office.calloutTargets.printer.set(
      PRINT_POS[0] - 0.118,
      DESK_TOP_Y + 0.17,
      PRINT_POS[2] + 0.113,
    )
  }, [])

  /* ------------------------- máquina de estados -------------------------------------------------- */

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1)
    const p = office.printer
    // debugPaper: a tecla P congela o relógio para inspeção frame-a-frame
    const step = office.paperPaused ? 0 : dt

    // não mexer no papel quando o preview DOM cobre a cena
    if (office.mode === 'qr-preview') return

    // revelação por plano de corte: ativo enquanto a folha ainda não caiu
    updateClip(anchorRef.current, clipPlane, !p.paperOnDesk && p.state !== 'paper-fall')

    if (p.state === 'starting') {
      p.t += step
      const t = clamp01(p.t / 0.25)
      p.light = 0.5 + 0.5 * Math.sin(p.t * 26)
      if (ledRef.current) ledRef.current.emissiveIntensity = 2.4 * p.light
      applyShake(group.current, t)
      office.paperPhase = 'starting'
      office.paperProgress = 0
      if (p.t >= 0.25) {
        p.state = 'printing'
        p.t = 0
        setOfficeMode('printing')
      }
    } else if (p.state === 'printing') {
      p.t += step
      const total = PRINT_EXIT_T + PRINT_PAUSE_T
      const u = clamp01(p.t / PRINT_EXIT_T)
      p.light = 1
      if (ledRef.current) ledRef.current.emissiveIntensity = 2.6
      applyShake(group.current, 1)
      posePaperExit(paperRef.current, paperUniforms, u)
      office.paperPhase = p.t <= PRINT_EXIT_T ? 'exit' : 'pause'
      office.paperProgress = clamp01(p.t / total)
      if (p.t >= total) {
        p.state = 'paper-fall'
        p.t = 0
        setOfficeMode('paper-fall')
        releasePaper(
          anchorRef.current,
          paperRef.current,
          group.current,
          scene,
          releaseRef,
          paperUniforms,
          clipPlane,
        )
      }
    } else if (p.state === 'paper-fall') {
      p.t += step
      const total = PAPER_FALL_T + PAPER_SETTLE_T
      p.light = 0.14
      if (ledRef.current) ledRef.current.emissiveIntensity = 0.55
      animatePaperFall(paperRef.current, releaseRef.current, p.t)
      office.paperPhase = p.t <= PAPER_FALL_T ? 'fall' : 'settle'
      office.paperProgress = clamp01(p.t / total)
      // a curvatura de peso some conforme a folha deita
      paperUniforms.uSag.value = DROOP_MAX * 0.35 * (1 - clamp01(p.t / PAPER_FALL_T))
      if (p.t >= total) {
        // assenta: papel parado e estável em cima do tampo; modo volta ao ambiente
        p.paperOnDesk = true
        office.printedPaper = true
        p.state = 'idle'
        setOfficeMode('ambient')
        office.printer.t = 1
        office.paperProgress = 1
        office.paperPhase = 'settled'
        paperUniforms.uSag.value = 0
        paperUniforms.uBow.value = 0
        parkPaper(paperRef.current, releaseRef.current)
        tracePaper(paperRef.current)
        if (waitId.current) window.clearTimeout(waitId.current)
        waitId.current = window.setTimeout(() => openQrPreview(), 450)
      }
    }

    // telemetria de debug (posição/AABB mundo da folha), todo frame
    tracePaper(paperRef.current)
  })

  useEffect(() => {
    return () => {
      if (waitId.current) window.clearTimeout(waitId.current)
    }
  }, [])

  // debugPaper: P alterna pausa/continuação do relógio do papel
  useEffect(() => {
    if (!office.paperDebug) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') office.paperPaused = !office.paperPaused
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  /* ------------------------------- cena ----------------------------------------------------------- */

  return (
    <group ref={group} position={[PRINT_POS[0], office.deskTopY, PRINT_POS[2]]} rotation={[0, PRINT_ROT_Y, 0]}>
      {/* sombra de contato (AO fake) sobre o tampo */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat} renderOrder={2}>
        <planeGeometry args={[0.46, 0.36]} />
      </mesh>

      {/* pés discretos */}
      {[-1, 1].map((sx) =>
        [-1, 1].map((sz) => (
          <RoundedBox
            key={`${sx}-${sz}`}
            args={[0.03, 0.01, 0.03]}
            radius={0.003}
            smoothness={2}
            position={[sx * (P_HALF_W - 0.05), 0.005, sz * (P_HALF_D - 0.055)]}
            material={bodyDarkMat}
            castShadow
            receiveShadow
          />
        )),
      )}

      {/* base / plinto */}
      <RoundedBox
        args={[PRINT_W, 0.022, PRINT_D]}
        radius={0.014}
        smoothness={3}
        position={[0, 0.013, 0]}
        material={bodyDarkMat}
        castShadow
        receiveShadow
      />

      {/* carcaça principal — topo arredondado */}
      <RoundedBox
        args={[0.3, 0.128, 0.21]}
        radius={0.036}
        smoothness={4}
        position={[0, 0.02 + 0.064, 0]}
        material={bodyMat}
        castShadow
        receiveShadow
      />

      {/* laterais curvas — mais altas atrás, descem em direção à frente */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={`side${s}`}
          args={[0.026, 0.128, 0.2]}
          radius={0.013}
          smoothness={3}
          position={[s * 0.152, 0.02 + 0.066, 0]}
          rotation={[0.04, 0, 0]}
          material={bodyMat}
          castShadow
          receiveShadow
        />
      ))}

      {/* ============ topo rebaixado com abertura mecânica ============ */}
      {/* cavidade: rebaixo largo na superfície superior */}
      <RoundedBox
        args={[0.23, 0.022, 0.15]}
        radius={0.008}
        smoothness={3}
        position={[0, 0.02 + 0.128 - 0.011, -0.042]}
        material={graphiteMat}
        castShadow
        receiveShadow
      />
      {/* roletes internos da saída */}
      {[-0.102, -0.072, -0.042].map((z) => (
        <mesh key={z} position={[0, 0.02 + 0.133 - 0.008, z]} rotation={[0, 0, Math.PI / 2]} material={rollerMat}>
          <cylinderGeometry args={[0.007, 0.007, 0.19, 10]} />
        </mesh>
      ))}
      {/* guias laterais internas */}
      {[-0.09, 0.09].map((x) => (
        <RoundedBox
          key={`guide${x}`}
          args={[0.007, 0.006, 0.13]}
          radius={0.002}
          smoothness={2}
          position={[x, 0.02 + 0.128 - 0.012, -0.06]}
          material={rollerMat}
        />
      ))}
      {/* lâminas-guia na borda frontal da cavidade (saindo, inclinadas p/ frente) */}
      {[-0.094, -0.031, 0.031, 0.094].map((x) => (
        <RoundedBox
          key={`flap${x}`}
          args={[0.022, 0.03, 0.008]}
          radius={0.004}
          smoothness={2}
          position={[x, 0.02 + 0.128 + 0.015, 0.032]}
          rotation={[0.14, 0, 0]}
          material={bodyMat}
        />
      ))}

      {/* ============ painel frontal ============ */}
      <RoundedBox
        args={[0.26, 0.08, 0.014]}
        radius={0.012}
        smoothness={3}
        position={[0, 0.02 + 0.066, P_HALF_D - 0.017]}
        material={panelMat}
        castShadow
        receiveShadow
      />

      {/* abertura frontal de saída — boca escura com profundidade + roletes */}
      <RoundedBox
        args={[0.2, 0.034, 0.014]}
        radius={0.006}
        smoothness={2}
        position={[0, 0.02 + 0.05, P_HALF_D - 0.005]}
        material={graphiteMat}
        castShadow
      />
      <RoundedBox
        args={[0.18, 0.026, 0.03]}
        radius={0.004}
        smoothness={2}
        position={[0, 0.02 + 0.047, P_HALF_D - 0.02]}
        material={graphiteMat}
      />
      {[-0.04, 0.04].map((x) => (
        <mesh key={`or${x}`} position={[x, 0.02 + 0.055, P_HALF_D - 0.006]} rotation={[0, 0, Math.PI / 2]} material={rollerMat}>
          <cylinderGeometry args={[0.005, 0.005, 0.16, 8]} />
        </mesh>
      ))}

      {/* botão físico circular (quebra a simetria, 15% da largura à esquerda) */}
      <group position={[-0.118, 0.02 + 0.084 - (hover ? 0.002 : 0), P_HALF_D - 0.005]}>
        <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]} material={bodyDarkMat} castShadow>
          <cylinderGeometry args={[0.013, 0.011, 0.008, 16]} />
        </mesh>
      </group>

      {/* LED de status (lado direito) */}
      <mesh position={[0.118, 0.02 + 0.08, P_HALF_D - 0.008]}>
        <sphereGeometry args={[0.0045, 10, 8]} />
        <meshStandardMaterial
          ref={ledRef}
          color="#3a1508"
          emissive="#ff7a3c"
          emissiveIntensity={0.05}
          toneMapped={false}
        />
      </mesh>

      {/* marca discreta (geométrica, sem marca registrada) */}
      <RoundedBox
        args={[0.05, 0.014, 0.004]}
        radius={0.002}
        smoothness={2}
        position={[0, 0.02 + 0.098, P_HALF_D - 0.009]}
        material={rollerMat}
      />

      {/* ============ bandeja frontal aberta (com papel dentro) ============ */}
      {/* piso da bandeja — levemente inclinada (frente mais baixa) */}
      <RoundedBox
        args={[0.235, 0.006, 0.15]}
        radius={0.005}
        smoothness={2}
        position={[0, 0.012, 0.19]}
        rotation={[0.045, 0, 0]}
        material={bodyMat}
        castShadow
        receiveShadow
      />
      {/* guias laterais da bandeja */}
      {[-1, 1].map((s) => (
        <RoundedBox
          key={`rail${s}`}
          args={[0.014, 0.012, 0.15]}
          radius={0.004}
          smoothness={2}
          position={[s * 0.108, 0.02, 0.19]}
          rotation={[0.045, 0, 0]}
          material={bodyMat}
          castShadow
        />
      ))}
      {/* aba frontal da bandeja (espessura visível) */}
      <RoundedBox
        args={[0.235, 0.018, 0.02]}
        radius={0.007}
        smoothness={2}
        position={[0, 0.02 + 0.006, 0.252]}
        rotation={[0.045, 0, 0]}
        material={bodyMat}
        castShadow
      />
      {/* guia central (peça trapezoidal simples) */}
      <RoundedBox
        args={[0.075, 0.026, 0.02]}
        radius={0.006}
        smoothness={2}
        position={[0, 0.033, 0.25]}
        rotation={[0.08, 0, 0]}
        material={bodyDarkMat}
        castShadow
      />
      {/* trilhos internos de escala */}
      {[-0.09, 0.09].map((x) => (
        <RoundedBox
          key={`touch${x}`}
          args={[0.008, 0.008, 0.11]}
          radius={0.002}
          smoothness={2}
          position={[x, 0.028, 0.17]}
          rotation={[0.045, 0, 0]}
          material={graphiteMat}
        />
      ))}
      {/* folha parada dentro da bandeja (offset acima do piso) */}
      <mesh
        position={[0, 0.017, 0.185]}
        rotation={[0.045, 0, 0]}
        material={trayPaperMat}
        castShadow
        receiveShadow
      >
        <planeGeometry args={[0.205, 0.128]} />
      </mesh>

      {/* ============ folha impressa (nasce DENTRO da boca frontal) ============
          anchor: origem/direção de saída; paperRef: pivô na BORDA TRASEIRA
          durante a impressão (a malha fica +SHEET_H/2 à frente do pivô). */}
      <group ref={anchorRef} position={PAPER_EXIT_ORIGIN} rotation={[PAPER_EXIT_TILT, 0, 0]}>
        <group ref={paperRef} position={[0, 0, PAPER_CENTER_Z_START]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} material={paperMat} castShadow>
            <planeGeometry args={[SHEET_W, SHEET_H, SHEET_SEG_W, SHEET_SEG_H]} />
            {office.paperDebug ? (
              <mesh>
                <boxGeometry args={[SHEET_W, SHEET_H, 0.002]} />
                <meshBasicMaterial color="#39ff14" wireframe transparent opacity={0.5} />
              </mesh>
            ) : null}
          </mesh>
        </group>

        {office.paperDebug ? (
          <>
            {/* eixos locais + origem do papel */}
            <axesHelper args={[0.08]} />
            <arrowHelper
              args={[new THREE.Vector3(0, 0, 1), new THREE.Vector3(0, 0, 0), 0.12, 0x00e5ff, 0.022, 0.012]}
            />
            <mesh>
              <sphereGeometry args={[0.006, 12, 8]} />
              <meshBasicMaterial color="#ff2bd1" />
            </mesh>
          </>
        ) : null}
      </group>

      {office.paperDebug ? (
        // plano de colisão da mesa (tampo, y local = 0)
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.001, 0.15]}>
          <planeGeometry args={[0.8, 0.8]} />
          <meshBasicMaterial color="#00ff66" wireframe transparent opacity={0.22} />
        </mesh>
      ) : null}

      {/* alvo de clique GLOBAL (maior que o corpo): clicar inicia a impressão;
          se a folha já está na mesa, reabre o preview */}
      <mesh
        position={[0, 0.1, P_HALF_D - 0.02]}
        onClick={(e) => {
          e.stopPropagation()
          startPrintSeq()
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
        }}
        onPointerOut={() => setHover(false)}
      >
        <boxGeometry args={[PRINT_W * 1.9, 0.6, 0.4]} />
        <meshBasicMaterial visible={false} transparent opacity={0} />
      </mesh>
    </group>
  )
}

export function startPrintSeq() {
  if (office.mode !== 'ambient' && office.mode !== 'computer') return
  if (office.mode === 'computer') exitComputerMode()
  const p = office.printer
  if (p.state !== 'idle') return
  if (p.paperOnDesk) {
    // papel já impresso: reutiliza e abre direto o preview (§41)
    openQrPreview()
    return
  }
  p.state = 'starting'
  p.t = 0
  setOfficeMode('starting')
}

/* ------------------------------ animação do papel ------------------------------ */

type PaperRelease = {
  /** centro da folha no momento em que perde o apoio (mundo) */
  p0: THREE.Vector3
  q0: THREE.Quaternion
  /** pose de repouso sobre o tampo (mundo) */
  p1: THREE.Vector3
  q1: THREE.Quaternion
}

/** temporários de módulo (sem alocação por frame) */
const _v = new THREE.Vector3()
const _scale = new THREE.Vector3()
const _q = new THREE.Quaternion()
const _wobble = new THREE.Quaternion()
const _euler = new THREE.Euler()
const _box = new THREE.Box3()
const _parkEuler = new THREE.Euler(0.015, 0.06, 0.02)

function easeInOutSine(t: number): number {
  return -(Math.cos(Math.PI * t) - 1) / 2
}

function easeInQuad(t: number): number {
  return t * t
}

function applyShake(group: THREE.Group | null, t: number) {
  if (!group) return
  const s = t < 1 ? Math.sin(t * 60) * 0.0006 * (1 - t) : 0
  group.position.x = PRINT_POS[0] + s
  group.position.z = PRINT_POS[2] + s * 0.5
}

/**
 * Revelação por plano de corte. O plano fica na boca frontal (origem do papel),
 * com normal na direção de saída: fica oculto tudo que ainda está para dentro
 * da máquina. `setFromNormalAndCoplanarPoint` recalcula o `constant`; quando
 * inativo, empurramos o plano para longe (constant grande) para não cortar nada.
 */
function updateClip(anchor: THREE.Group | null, plane: THREE.Plane, active: boolean) {
  if (!anchor) return
  if (!active) {
    plane.constant = 1000
    return
  }
  anchor.updateWorldMatrix(true, false)
  anchor.getWorldPosition(_v)
  anchor.getWorldQuaternion(_q)
  plane.normal.set(0, 0, 1).applyQuaternion(_q)
  plane.setFromNormalAndCoplanarPoint(plane.normal, _v)
}

/**
 * Fase de saída: a borda traseira fica presa no slot e avança no eixo de saída.
 * Movimento quase linear (easeInOutSine leve), sem curva grande. O pivô do
 * grupo é exatamente a borda traseira, então a ponta avança primeiro. O plano
 * de corte faz o resto: só aparece o que já passou pela boca.
 */
function posePaperExit(
  paper: THREE.Group | null,
  uniforms: { uSag: { value: number }; uBow: { value: number } },
  u: number,
) {
  if (!paper) return
  const e = easeInOutSine(clamp01(u))
  const rear = PAPER_REAR_START + (PAPER_REAR_END - PAPER_REAR_START) * e
  paper.position.set(0, 0, rear + SHEET_H / 2)
  paper.rotation.set(0, 0, 0)
  uniforms.uSag.value = DROOP_MAX * e
  uniforms.uBow.value = 0
}

/**
 * A folha saiu por completo: converte o pivô (borda traseira) para o centro de
 * massa em MUNDO e reparenta para a cena preservando o world transform — sem
 * salto no frame da troca. Desliga o plano de corte (a folha agora é inteira).
 */
function releasePaper(
  anchor: THREE.Group | null,
  paper: THREE.Group | null,
  group: THREE.Group | null,
  scene: THREE.Scene,
  releaseRef: { current: PaperRelease | null },
  uniforms: { uBow: { value: number } },
  plane: THREE.Plane,
) {
  if (!anchor || !paper || !group) return
  paper.updateWorldMatrix(true, false)
  const p0 = new THREE.Vector3()
  const q0 = new THREE.Quaternion()
  paper.matrixWorld.decompose(p0, q0, _v)
  scene.attach(paper)
  group.updateWorldMatrix(true, false)
  const p1 = group.localToWorld(new THREE.Vector3(0, PAPER_PARK_Y, PAPER_PARK_Z))
  const q1 = new THREE.Quaternion().setFromEuler(_parkEuler)
  releaseRef.current = { p0, q0, p1, q1 }
  plane.constant = 1000
  uniforms.uBow.value = 0.006
}

/**
 * Queda curta e natural: avança + desce sob gravidade (aceleração), girando
 * devagar até deitar plana. Contato -> micro-bounce amortecido -> settle.
 */
function animatePaperFall(paper: THREE.Group | null, rel: PaperRelease | null, t: number) {
  if (!paper || !rel) return
  const { p0, q0, p1, q1 } = rel
  if (t <= PAPER_FALL_T) {
    const q = clamp01(t / PAPER_FALL_T)
    const gy = easeInQuad(q) // gravidade: acelera ao descer
    const xz = easeOutCubic(q) // desliza para frente e desacelera
    paper.position.set(
      p0.x + (p1.x - p0.x) * xz,
      p0.y + (p1.y - p0.y) * gy,
      p0.z + (p1.z - p0.z) * xz,
    )
    // rotação começa devagar (segue a gravidade), terminando plana no contato
    paper.quaternion.slerpQuaternions(q0, q1, easeInQuad(q))
  } else {
    const s = clamp01((t - PAPER_FALL_T) / PAPER_SETTLE_T)
    const damp = Math.exp(-4.5 * s)
    const wave = Math.sin(s * Math.PI * 2)
    paper.position.set(p1.x, p1.y + wave * 0.0032 * damp, p1.z)
    _euler.set(wave * 0.015 * damp, 0, wave * 0.008 * damp)
    _wobble.setFromEuler(_euler)
    paper.quaternion.copy(q1).multiply(_wobble)
  }
}

/** Repouso estável e explícito: deitado em cima do tampo, à frente da máquina. */
function parkPaper(paper: THREE.Group | null, rel: PaperRelease | null) {
  if (!paper) return
  if (rel) {
    paper.position.copy(rel.p1)
    paper.quaternion.copy(rel.q1)
    return
  }
  paper.position.set(0, PAPER_PARK_Y, PAPER_PARK_Z)
  paper.quaternion.setFromEuler(_parkEuler)
}

/** Telemetria de debug: posição/orientação MUNDO do centro da folha (+ AABB). */
function tracePaper(paper: THREE.Group | null) {
  if (!paper) return
  paper.updateWorldMatrix(true, false)
  paper.matrixWorld.decompose(_v, _q, _scale)
  _euler.setFromQuaternion(_q)
  office.paperLocal = {
    x: _v.x,
    y: _v.y,
    z: _v.z,
    rx: _euler.x,
    ry: _euler.y,
    rz: _euler.z,
  }
  office.paperWorldY = _v.y
  if (office.paperDebug || office.debug) {
    _box.setFromObject(paper)
    office.paperBox = {
      minX: _box.min.x,
      maxX: _box.max.x,
      minY: _box.min.y,
      maxY: _box.max.y,
      minZ: _box.min.z,
      maxZ: _box.max.z,
    }
  }
}