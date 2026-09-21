import { useEffect, useMemo, useRef, useState } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { quality } from '../../../utils/sim'
import { CrtMonitor } from './CrtMonitor'
import {
  CAM_FOV,
  CAM_FOV_MOBILE,
  CAM_MOBILE,
  CAM_MOBILE_TARGET,
  CAM_SEATED,
  CAM_TARGET,
  CRT_POS,
} from './officeGeometry'
import { CRT_H, CRT_W, doCopy, doShare, exitComputerMode, office } from './officeState'
import { getCrtButtons } from './crtUi'
import {
  Desk,
  DriveProps,
  Floor,
  FloppyDisk,
  Keyboard,
  OfficeLamp,
  PaperPad,
  Pen,
  PhysicalMouse,
  Poster,
  Wall,
} from './officeProps'
import { Printer, startPrintSeq } from './Printer'
import { CalloutLayer } from './CalloutLayer'
import { disposeSceneDeep } from './dispose'

/** Desmontagem real ao fechar: libera geometrias, materiais, texturas e o
 *  renderer (apenas em produção; no dev o StrictMode remonta o Canvas). */
function GarbageCollector() {
  const { gl, scene } = useThree()
  useEffect(() => {
    if (!import.meta.env.PROD) return
    return () => disposeSceneDeep(scene, gl)
  }, [gl, scene])
  return null
}

/**
 * Escritório retrô — a experiência 3D opcional da seção de apoio (§2).
 *
 * Câmera sentada (olhar humano levemente para baixo, borda da mesa no rodapé)
 * com micro-parallax; luz quente da luminária como chave. As interações são:
 *   1) clicar no MOUSE FÍSICO → modo computador (cursor virtual no CRT)
 *   2) movimentar o ponteiro no modo computador → mapeia para o CRT
 *   3) clicar em COPIAR/COMPARTILHAR dentro do CRT → ação real
 *   4) clicar no botão da IMPRESSORA → imprime o papel + QR
 *   5) papel cai → abre o QR preview (DOM, com blur)
 *   6) ESC / botão SAIR → volta.
 *
 * Nada aqui é externo: todas as texturas e o QR são desenhados localmente.
 */

/* ------------------------- feedback de debug no UI overlay ------------------------- */

function officeDebugText(): string[] {
  return [
    `MODE        ${office.mode}`,
    `CURSOR      ${office.cursorUV.x.toFixed(2)} , ${office.cursorUV.y.toFixed(2)}`,
    `MOUSE       ${office.mouseOffset.x.toFixed(3)} , ${office.mouseOffset.z.toFixed(3)}`,
    `PRINTER     ${office.printer.state} / t=${office.printer.t.toFixed(2)}`,
    `PAPER       ${office.printer.paperOnDesk ? 'na mesa' : 'no slot'}`,
    `PAPERPHASE  ${office.paperPhase}${office.paperPaused ? '  [PAUSADO - P]' : ''}`,
    `PAPERPROG   ${office.paperProgress.toFixed(2)}`,
    `DESKTOP     y=${office.deskTopY.toFixed(4)}`,
    `PAPERLOC    x=${office.paperLocal.x.toFixed(3)} y=${office.paperLocal.y.toFixed(3)} z=${office.paperLocal.z.toFixed(3)} rx=${office.paperLocal.rx.toFixed(2)}`,
    `PAPERWORLD  y=${office.paperWorldY.toFixed(4)}`,
    `PAPERBOX    y=[${office.paperBox.minY.toFixed(3)},${office.paperBox.maxY.toFixed(3)}] z=[${office.paperBox.minZ.toFixed(3)},${office.paperBox.maxZ.toFixed(3)}]`,
    `QR          ${office.qrPreview ? 'aberto' : 'fechado'}`,
    `POWER       ${office.crtPower.toFixed(2)}`,
    `SCREENREG   ${office.screenMesh ? 'sim' : 'não'}`,
    (office.fps || 60).toFixed(0) + ' fps',
  ]
}

function DebugOverlay() {
  const [lines, setLines] = useState<string[]>([])
  useEffect(() => {
    const id = window.setInterval(() => setLines(officeDebugText()), 200)
    return () => window.clearInterval(id)
  }, [])
  return (
    <div className="office-debug" aria-hidden="true">
      <code>{lines.map((l, i) => <div key={i}>{l}</div>)}</code>
    </div>
  )
}

/* ------------------------- câmera sentada + micro-parallax ------------------------- */

function CameraRig() {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const counts = useRef({ frames: 0, lastT: performance.now() })

  useFrame((state) => {
    const mobile = quality.isMobile
    const pos = mobile ? CAM_MOBILE : CAM_SEATED
    const look = mobile ? CAM_MOBILE_TARGET : CAM_TARGET
    const px = state.pointer.x
    const py = state.pointer.y
    // amplitude contida: o alvo não "foge" do cursor no instante do clique
    const amp = mobile ? 0.008 : 0.012
    camera.position.set(
      pos[0] + px * amp * 0.4,
      pos[1] + py * -amp * 0.25,
      pos[2] + (mobile ? 0 : py * amp * 0.38),
    )
    camera.fov = mobile ? CAM_FOV_MOBILE : CAM_FOV
    camera.lookAt(look[0] + px * amp * 0.2, look[1] + py * -amp * 0.12, look[2])
    camera.updateProjectionMatrix()

    // FPS medidos de verdade (lerdo de debug/profiling)
    const c = counts.current
    c.frames++
    const now = performance.now()
    if (now - c.lastT >= 500) {
      office.fps = (c.frames * 1000) / (now - c.lastT)
      c.frames = 0
      c.lastT = now
    }
  })
  return null
}

/* ------------------------- interação: pointer → CRT virtual ------------------------- */

/**
 * Converte um PointerEvent do DOM num raio e devolve a interseção UV na tela
 * do CRT (mesh registrada em office.screenMesh). Se não cruzar a tela, mapeia
 * pelo retângulo projetado (fallback robusto).
 */

type OfficeControlsProps = {
  onCursor: (uv: { x: number; y: number }) => void
}

function OfficeControls({ onCursor }: OfficeControlsProps) {
  const { gl, camera } = useThree()
  const raycaster = useMemo(() => new THREE.Raycaster(), [])
  const ndc = useMemo(() => new THREE.Vector2(), [])

  useEffect(() => {
    const el = gl.domElement

    const computeUv = (e: PointerEvent): { x: number; y: number } | null => {
      const rect = el.getBoundingClientRect()
      ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(ndc, camera)
      const mesh = office.screenMesh
      if (!mesh) {
        return {
          x: (ndc.x + 1) / 2,
          y: (1 - ndc.y) / 2,
        }
      }
      const hits = raycaster.intersectObject(mesh, false)
      if (hits.length && hits[0].uv) {
        const uv = hits[0].uv
        return {
          x: Math.min(1, Math.max(0, uv.x)),
          y: Math.min(1, Math.max(0, 1 - uv.y)),
        }
      }
      return {
        x: Math.min(1, Math.max(0, (ndc.x + 1) / 2)),
        y: Math.min(1, Math.max(0, (1 - ndc.y) / 2)),
      }
    }

    const onPointerDown = (e: PointerEvent) => {
      if (office.mode === 'qr-preview') return
      if (office.mode === 'paper-fall') return

      if (office.mode !== 'computer') {
        // rotina de entrada: o clique no mouse físico entra no computador
        return
      }

      // modo computador: clique vira pressionamento e aciona o botão sob cursor
      office.mousePressing = true
      const uv = computeUv(e)
      if (uv) {
        onCursor(uv)
        const px = Math.round(uv.x * CRT_W)
        const py = Math.round(uv.y * CRT_H)
        void getButtonAt(px, py)
      }
    }

    const onPointerUp = () => {
      office.mousePressing = false
    }

    const onPointerMove = (e: PointerEvent) => {
      if (office.mode !== 'computer') return
      const uv = computeUv(e)
      if (uv) onCursor(uv)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (office.mode !== 'computer') return
      if (e.key === 'Escape') {
        e.preventDefault()
        exitComputerMode()
      }
    }

    if (office.debug) (window as unknown as { __officeCam?: THREE.Camera }).__officeCam = camera

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointercancel', onPointerUp)
    window.addEventListener('keydown', onKeyDown)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointercancel', onPointerUp)
      window.removeEventListener('keydown', onKeyDown)
    }
  }, [gl, camera, onCursor, ndc, raycaster])

  return null
}

function getButtonAt(px: number, py: number) {
  const buttons = getCrtButtons()
  const hit = buttons.find((b) => {
    return px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h
  })
  if (hit) {
    if (hit.id === 'copy') void doCopy()
    else if (hit.id === 'share') void doShare(getInviteUrl())
    else if (hit.id === 'print') startPrintSeq()
  }
}

function getInviteUrl(): string {
  if (typeof window !== 'undefined') return window.location.href.split('#')[0]
  return 'https://projetoicaro.example/apoio'
}

/* ------------------------- composição ------------------------- */

/** Brilho frio do fósforo do monitor: acende com o CRT e sobe no modo computador. */
function CrtGlow() {
  const ref = useRef<THREE.PointLight>(null)
  const pos = useMemo(() => {
    const y = office.deskTopY
    return new THREE.Vector3(CRT_POS[0] + 0.02, y + 0.26, CRT_POS[2] + 0.22)
  }, [])
  useFrame((_, delta) => {
    const target = office.mode === 'computer' ? 0.55 : 0.2 * office.crtPower
    if (ref.current) {
      ref.current.intensity += (target - ref.current.intensity) * Math.min(delta * 3, 1)
    }
  })
  return <pointLight ref={ref} position={pos} intensity={0.12} distance={2.4} decay={2} color="#a4e7bd" />
}

type Props = {
  reduced: boolean
}

export function OfficeScene({ reduced }: Props) {
  const shadows = quality.shadows && quality.deviceTier !== 'mobile'
  const params = typeof URLSearchParams !== 'undefined' ? new URLSearchParams(location.search) : null
  const debug = params?.get('debugOffice') === '1' || params?.get('debugPaper') === '1'

  return (
    <>
      <Canvas
        shadows={shadows}
        dpr={[1, Math.min(1.5, quality.dprCap)]}
        gl={{
          antialias: !reduced,
          alpha: false,
          powerPreference: 'high-performance',
          // plano de corte da boca da impressora (revelação progressiva da folha)
          localClippingEnabled: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.12,
        }}
        camera={{ position: CAM_SEATED, fov: CAM_FOV, near: 0.1, far: 40 }}
        style={{ touchAction: 'none' }}
      >
        {/* névoa quente: o fundo da sala desaparece na escuridão (§18) */}
        <fog attach="fog" args={['#140d08', 2.4, 8]} />

        <CameraRig />
        <OfficeControls
          onCursor={(uv) => {
            office.cursorUV = uv
          }}
        />

        {/* luz quente da luminária; fill muito fraco; glow do CRT (§18) */}
        <ambientLight intensity={0.16} color="#ffe4c2" />
        <hemisphereLight args={['#ffd9b0', '#140d08', 0.42]} />
        <directionalLight position={[3.2, 5.5, 2.5]} intensity={0.28} color="#ffce8a" />
        {/* luz frontal quente tipo softbox: revela a cara do monitor e o mouse (§18) */}
        <directionalLight position={[2.6, 3.6, 3.2]} intensity={0.55} color="#ffe4bd" />
        {/* back-light frio: recorta a silhueta da carcaça contra a parede (§18) */}
        <directionalLight position={[-3.2, 2.4, -2]} intensity={0.16} color="#7a6b58" />
        {/* fill quente da esquerda-frente: revela a impressora e o papel na mesa (§18) */}
        <directionalLight position={[-2.6, 3.4, 4.2]} intensity={0.15} color="#ffd1a0" />
        {/* brilho frio e sutil do fósforo do monitor sobre a mesa */}
        <CrtGlow />

        <Wall />
        <Poster />
        <Floor />
        <Desk />
        <OfficeLamp shadows={shadows} />
        <Keyboard />
        <PhysicalMouse />
        <Printer />
        <CrtMonitor />
        <PaperPad />
        <Pen />
        <FloppyDisk />
        <DriveProps />
        <CalloutLayer />
        <GarbageCollector />
      </Canvas>

      {debug ? <DebugOverlay /> : null}
    </>
  )
}