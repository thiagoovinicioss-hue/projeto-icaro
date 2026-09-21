import * as THREE from 'three'
import { project } from '../../../data/project'
import { campaign } from '../../../data/campaign'
import { buildShareContent } from '../../../utils/share'
import { pixCopyValue } from '../../../utils/pix'
import { DESK_TOP_Y } from './officeGeometry'

/**
 * Estado da cena do escritório retrô — uma máquina EXPLÍCITA, não booleanos
 * soltos (§48). Como o resto do mundo Three.js deste site, o estado é um
 * singleton mutável animado por useFrame; componentes DOM assinam via subscribe.
 *
 * Modos:
 *  - ambient         : a mesa, calma. callouts, raycast de entrada
 *  - computer        : controla o cursor virtual dentro do CRT (teclado ESC/sair)
 *  - starting        : impressora "pisca luz e vibra" (200–500ms)
 *  - printing        : papel emergindo do slot, QR aparece progressivamente
 *  - paper-fall      : papel saindo do apoio, caindo sobre a mesa
 *  - qr-preview      : folha aproximada (DOM com blur), bloqueia o resto
 *
 * Transições proibidas (nunca iluminadas por acidente):
 *  - printing + computer ao mesmo tempo
 *  - qr-preview com qualquer outra interação ativa
 *  - segunda impressão enquanto imprime
 */

export type OfficeMode =
  | 'ambient'
  | 'computer'
  | 'starting'
  | 'printing'
  | 'paper-fall'
  | 'qr-preview'

export type PrinterRefresh = {
  state: 'idle' | 'starting' | 'printing' | 'paper-fall'
  /** fator 0..1 da máquina de impressão (avanço do papel) */
  t: number
  /** opacidade da luz indicadora (LED) */
  light: number
  /** botão pressionado? */
  pressed: boolean
  /** papel já caiu sobre a mesa e está lá embaixo (não imprimir de novo re-renderiza) */
  paperOnDesk: boolean
}

/** Caixa de clique no papel/QR para exibir no debug. */
export type OfficeDebug = {
  mode: OfficeMode
  cursorScreen: { x: number; y: number } | null
  cursorUV: { x: number; y: number }
  mouseOffset: { x: number; z: number }
  printer: PrinterRefresh
  qrOpen: boolean
  fps: number
  crtPower: number
  hitBoundsVisible: boolean
  screenMeshRegistered: boolean
}

type Listener = () => void

export const CRT_W = 480
export const CRT_H = 360

export const office = {
  mode: 'ambient' as OfficeMode,
  debug: typeof URLSearchParams !== 'undefined' && new URLSearchParams(location.search).get('debugOffice') === '1',
  hitBoundsVisible: false,

  /* ------------------------- callouts (pontos de descoberta) ------------------------- */
  /** posições de mundo dos objetos que ganham seta/callout; registradas pelos componentes 3D */
  calloutTargets: {
    mouse: new THREE.Vector3(0, 0, 0),
    printer: new THREE.Vector3(0, 0, 0),
  },
  /** marca a primeira entrada no computador — para esconder o callout do mouse depois */
  usedComputer: false,
  /** marca que a folha já foi impressa nesta visita — callout da impressora some */
  printedPaper: false,

  /* ------------------------- controle do computador ------------------------- */
  /** quando o usuário acabou de entrar, segura por alguns frames antes de
      permitir ESC, para nunca "escapar" sem querer no clique de entrada */
  entering: 0,
  /** cursor virtual em UV da tela CRT (0..1) */
  cursorUV: { x: 0.5, y: 0.52 },
  /** o cursor está dentro do retângulo útil da tela? */
  cursorInside: true,
  /** iluminado pela projeção: coordenadas de tela do retângulo CRT no DOM */
  crtProjection: null as { x: number; y: number; w: number; h: number } | null,
  /** quantidade 0..1 do pulsar do clique virtual (para o mouse físico afundar) */
  clickPulse: 0,
  /** src da chave que será copiada/compartilhada */
  copyValue: pixCopyValue(project.pix.payload, project.pix.key),
  /** feedback de copiar como fator 0..1 (CRT desenha "[ COPIADO ]") */
  copyFlash: 0,
  /** feedback de compartilhar como fator 0..1 */
  shareFlash: 0,
  /** mensagem de status exibida dentro do CRT (fallback para sem-WebShare) */
  crtStatus: '',

  /* ------------------------- mouse físico ------------------------- */
  /** deslocamento visual do mouse sobre a mesa (-1..1), com damping no uso */
  mouseOffset: { x: 0, z: 0 },
  mouseRest: { x: 0, z: 0 },
  /** mouse está sendo pressionado (botão afunda) */
  mousePressing: false,

  /** altura real (mundo) do tampo da mesa — registrada pelo Desk (default: geometria) */
  deskTopY: DESK_TOP_Y,
  /** papel deitado: posição/rotação de repouso em mundo-para-trace */
  paperWorldY: 0,
  /** posição do papel em coordenadas locais do grupo da impressora */
  paperLocal: { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 },
  /** AABB mundo da folha (debug de clipping/interseção) */
  paperBox: { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 },
  /** ?debugPaper=1 — visualizador da animação da folha (eixos, direção, mesa) */
  paperDebug:
    typeof URLSearchParams !== 'undefined' && new URLSearchParams(location.search).get('debugPaper') === '1',
  /** congela o relógio do papel para inspeção frame-a-frame (tecla P no debug) */
  paperPaused: false,
  /** fase legível da animação do papel (debug): starting/exit/pause/fall/settle/settled */
  paperPhase: 'idle',

  /* ------------------------- impressora ------------------------- */
  printer: {
    state: 'idle' as PrinterRefresh['state'],
    t: 0,
    light: 0,
    pressed: false,
    paperOnDesk: false,
  },
  /** ângulo/avanço do papel em unidades de mundo — dirigido pelo Printer */
  paperProgress: 0,
  qrPreview: false,

  /* ------------------------- vida do CRT ------------------------- */
  crtTime: 0,
  crtPower: 0,
  crtReady: false,
  /** schedule neutro (determinístico) do glitch: conta regressiva em segundos */
  glitchTimer: 8 + Math.random() * 10,
  glitch: 0,

  /** malha da tela do monitor — registrada pelo CrtMonitor para raycast */
  screenMesh: null as THREE.Mesh | null,

  fps: 60,

  _listeners: new Set<Listener>(),
}

export type OfficeStore = typeof office

// QA/debug: com ?debugPaper=1 (ou ?debugOffice=1) o singleton fica acessível
// no console para inspeção frame-a-frame (pausar e posicionar o relógio).
if ((office.paperDebug || office.debug) && typeof window !== 'undefined') {
  ;(window as unknown as { paperOffice?: typeof office }).paperOffice = office
}

let lastMode: OfficeMode = office.mode
let lastPrinterState = office.printer.state

export function subscribeOffice(fn: Listener): () => void {
  office._listeners.add(fn)
  return () => office._listeners.delete(fn)
}

/** Chamado pelo renderer 1x/frame: dispara listeners apenas em mudança real. */
export function tickOffice(): void {
  const modeChanged = office.mode !== lastMode
  const printerChanged =
    office.printer.state !== lastPrinterState ||
    (office.printer.state !== 'idle' && office.printer.paperOnDesk)
  lastMode = office.mode
  lastPrinterState = office.printer.state
  if (modeChanged || printerChanged) {
    office._listeners.forEach((l) => l())
  }
}

export function setOfficeMode(next: OfficeMode): void {
  if (office.mode === next) return
  const cur = office.mode
  const printerBusy = cur === 'starting' || cur === 'printing' || cur === 'paper-fall'
  const nextPrinter = next === 'starting' || next === 'printing' || next === 'paper-fall'

  // Regras de prioridade (§49):
  //  - qr-preview bloqueia TUDO; só fecha exportando para o próprio sistema.
  //  - impressora em andamento não admite outra impressão nem computador.
  if (cur === 'qr-preview') return

  if (printerBusy) {
    if (nextPrinter) {
      office.mode = next
      tickOffice()
      return
    }
    // papel assenta primeiro
    if (next === 'ambient') {
      office.mode = next
      tickOffice()
      return
    }
    return
  }

  // ambiente → qualquer um; computador só a partir do ambiente
  if (cur === 'computer' && (next !== 'ambient' && next !== 'qr-preview')) return

  office.mode = next
  if (next === 'qr-preview') office.entering = 0
  tickOffice()
}

export function enterComputerMode(): void {
  office.mode = 'computer'
  office.entering = 0.35
  office.cursorUV = { x: 0.5, y: 0.52 }
  office.cursorInside = true
  office.crtStatus = ''
  office.usedComputer = true
  tickOffice()
}

export function exitComputerMode(): void {
  if (office.mode !== 'computer') return
  office.mode = 'ambient'
  office.mouseOffset = { x: 0, z: 0 }
  office.mouseRest = { x: 0, z: 0 }
  office.cursorInside = false
  tickOffice()
}

/**
 * Feedback rápido de cópia/compartilhamento que o CRT desenha.
 * Copia de verdade via Clipboard API e, para compartilhar, usa Web Share
 * quando existe; caso contrário copia mensagem+URL (§27).
 */
export async function doCopy(): Promise<boolean> {
  const ok = await copyToClipboard(office.copyValue)
  if (ok) {
    office.copyFlash = 1
    office.crtStatus = '[ COPIADO ]'
  }
  return ok
}

export async function doShare(url: string): Promise<void> {
  const content = buildShareContent(url, campaign.goalCents)
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(content)
      office.shareFlash = 0.8
      office.crtStatus = '[ COMPARTILHADO ]'
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const ok = await copyToClipboard(`${content.text}\n${content.url}`)
  office.shareFlash = 0.8
  office.crtStatus = ok ? '[ LINK COPIADO ]' : '[ ERRO NO COMPARTILHAR ]'
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    /* continua */
  }
  try {
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(ta)
    return ok
  } catch {
    return false
  }
}

/** Referências de malha que o controlador de interação usa para raycast. */
export const officeSceneRefs: {
  screenMesh: THREE.Mesh | null
  mouseHit: THREE.Mesh | null
  printerButtonHit: THREE.Mesh | null
  paperHit: THREE.Mesh | null
} = {
  screenMesh: null,
  mouseHit: null,
  printerButtonHit: null,
  paperHit: null,
}

/** Registra a malha da tela (o CrtMonitor chama). */
export function registerScreenMesh(m: THREE.Mesh | null) {
  officeSceneRefs.screenMesh = m
  office.screenMesh = m
}

export function openQrPreview(): void {
  if (office.mode === 'qr-preview') return
  office.qrPreview = true
  setOfficeMode('qr-preview')
}

export function closeQrPreview(): void {
  office.qrPreview = false
  // saída sancionada do qr-preview: o guard de setOfficeMode bloqueia qualquer
  // transição daí, então o próprio sistema de fechamento força o retorno
  office.mode = 'ambient'
  office.entering = 0
  tickOffice()
}

/**
 * Restaura o singleton para o estado inicial entre uma abertura e outra da
 * experiência. Chamado pelo overlay ao desmontar — nada carrega de uma visita
 * anterior (§12/§49).
 */
export function resetOfficeState(): void {
  office.mode = 'ambient'
  office.entering = 0
  office.cursorUV = { x: 0.5, y: 0.52 }
  office.cursorInside = true
  office.crtStatus = ''
  office.copyFlash = 0
  office.shareFlash = 0
  office.mouseOffset = { x: 0, z: 0 }
  office.mouseRest = { x: 0, z: 0 }
  office.mousePressing = false
  office.printer.state = 'idle'
  office.printer.t = 0
  office.printer.light = 0
  office.printer.pressed = false
  office.printer.paperOnDesk = false
  office.paperProgress = 0
  office.paperPaused = false
  office.paperPhase = 'idle'
  office.qrPreview = false
  office.deskTopY = DESK_TOP_Y
  office.paperWorldY = 0
  office.paperLocal = { x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0 }
  office.paperBox = { minX: 0, maxX: 0, minY: 0, maxY: 0, minZ: 0, maxZ: 0 }
  office.crtTime = 0
  office.crtPower = 0
  office.crtReady = false
  office.glitch = 0
  office.glitchTimer = 8 + Math.random() * 10
  office.screenMesh = null
  office.fps = 60
  office.usedComputer = false
  office.printedPaper = false
  officeSceneRefs.screenMesh = null
  officeSceneRefs.mouseHit = null
  officeSceneRefs.printerButtonHit = null
  officeSceneRefs.paperHit = null
  office.calloutTargets.mouse.set(0, 0, 0)
  office.calloutTargets.printer.set(0, 0, 0)
  lastMode = office.mode
  lastPrinterState = office.printer.state
}

export function debugSnapshot(): OfficeDebug {
  return {
    mode: office.mode,
    cursorScreen: null,
    cursorUV: { ...office.cursorUV },
    mouseOffset: { ...office.mouseOffset },
    printer: {
      state: office.printer.state,
      t: office.printer.t,
      light: office.printer.light,
      pressed: office.printer.pressed,
      paperOnDesk: office.printer.paperOnDesk,
    },
    qrOpen: office.qrPreview,
    fps: Math.round(office.fps * 10) / 10,
    crtPower: office.crtPower,
    hitBoundsVisible: office.hitBoundsVisible,
    screenMeshRegistered: officeSceneRefs.screenMesh !== null,
  }
}