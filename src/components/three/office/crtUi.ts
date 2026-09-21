import { campaign } from '../../../data/campaign'
import { formatBRL, percentRaised } from '../../../utils/money'
import { isPlaceholder } from '../../../utils/placeholders'
import { CRT_H, CRT_W, office } from './officeState'
import { project } from '../../../data/project'

/**
 * Interface do CRT — CanvasTexture 480×360, NearestFilter. Nada de React:
 * software antigo desenhado em 2D com a ORDEM da especificação:
 *
 *   PROJETO ICARO :: SISTEMA DE APOIO A MISSAO
 *   > ARRECADACAO   [valor / meta]  [pct]
 *      [barra segmentada retrô]
 *   > CHAVE PIX     [44988061945]
 *   [ COPIAR CHAVE ]  [ COMPARTILHAR ]
 *   PRONTO — AGUARDANDO COMANDO / [ CHAVE COPIADA ]
 *
 * As caixas de botão vivem no MESMO sistema de coordenadas do canvas; o
 * hit-testing usa essas caixas (nada de DOM solto).
 */

export type CrtButton = {
  id: 'copy' | 'share' | 'print' | 'exit-mobile'
  x: number
  y: number
  w: number
  h: number
  label: string
  actionLabel: string
}

const MONO = '"Space Mono", ui-monospace, monospace'

function box(id: CrtButton['id'], x: number, y: number, w: number, h: number, label: string, actionLabel: string): CrtButton {
  return { id, x, y, w, h, label, actionLabel }
}

/**
 * Caixas de clique em pixels do canvas CRT (480×360). Toda a UI respeita uma
 * SAFE AREA de ~7% (bordas recuam na curvatura/vinheta/barrel do vidro).
 */
const SAFE = 34
const BUTTON_Y = 254
const BUTTON_H = 44

export function getCrtButtons(): CrtButton[] {
  const gap = 10
  const bw = (CRT_W - SAFE * 2 - gap) / 2
  const copy = box('copy', SAFE, BUTTON_Y, bw, BUTTON_H, '[ COPIAR CHAVE ]', '[ CHAVE COPIADA ]')
  const share = box('share', SAFE + bw + gap, BUTTON_Y, bw, BUTTON_H, '[ COMPARTILHAR ]', '[ COMPARTILHADO ]')
  return [copy, share]
}

export type CrtLayout = {
  buttons: CrtButton[]
}

export function pointInButton(button: CrtButton, px: number, py: number): boolean {
  return px >= button.x && px <= button.x + button.w && py >= button.y && py <= button.y + button.h
}

/* ------------------------------- desenho ------------------------------- */

/** Escreve a interface no canvas do CRT. `cursorPx` é a posição (px) do cursor. */
export function drawCrtUi(
  ctx: CanvasRenderingContext2D,
  cursorPx: { x: number; y: number } | null,
  cursorPressed: boolean,
): CrtLayout {
  const w = CRT_W
  const h = CRT_H
  const RIGHT = w - SAFE
  ctx.clearRect(0, 0, w, h)

  // fundo: verde-fósforo quase preto (nada de dark-mode moderno)
  ctx.fillStyle = '#04120a'
  ctx.fillRect(0, 0, w, h)
  // leve gradiente de tubo
  const tube = ctx.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.72)
  tube.addColorStop(0, 'rgba(18, 60, 40, 0.22)')
  tube.addColorStop(1, 'rgba(0, 0, 0, 0.6)')
  ctx.fillStyle = tube
  ctx.fillRect(0, 0, w, h)

  const phosphor = '#bfe9c6'
  const bright = '#e6f9e2'
  const dim = '#6f9a7e'
  const amber = '#ffb451'
  const warn = '#e8a23d'

  ctx.save()
  ctx.textBaseline = 'alphabetic'

  /* -------- topo: cabeçalho do sistema -------- */
  ctx.fillStyle = phosphor
  ctx.font = `700 21px ${MONO}`
  ctx.fillText('PROJETO ICARO', SAFE, 54)
  ctx.fillStyle = dim
  ctx.font = `700 10px ${MONO}`
  ctx.fillText('SISTEMA DE APOIO A MISSAO', SAFE, 68)
  ctx.strokeStyle = dim
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(SAFE, 76)
  ctx.lineTo(RIGHT, 76)
  ctx.stroke()

  /* -------- bloco: ARRECADAÇÃO -------- */
  ctx.fillStyle = amber
  ctx.font = `700 14px ${MONO}`
  ctx.fillText('> ARRECADACAO', SAFE, 96)

  const raised = campaign.raisedCents
  const goal = campaign.goalCents
  const pct = percentRaised(raised, goal)
  const pctInt = Math.floor(pct)

  const raisedStr = formatBRL(raised)
  const goalStr = formatBRL(goal)
  ctx.fillStyle = bright
  ctx.font = `700 28px ${MONO}`
  ctx.fillText(raisedStr, SAFE, 124)
  const raisedW = ctx.measureText(raisedStr).width
  ctx.fillStyle = dim
  ctx.font = `700 28px ${MONO}`
  ctx.fillText(` / ${goalStr}`, SAFE + raisedW, 124)
  ctx.fillStyle = amber
  ctx.font = `700 16px ${MONO}`
  ctx.fillText(`${pctInt}%`, RIGHT - ctx.measureText(`${pctInt}%`).width, 126)

  // barra de progresso retrô: caixa + blocos segmentados (sem cantos macios)
  const barX = SAFE
  const barTop = 136
  const barW = RIGHT - SAFE
  const seg = 16
  const segCount = Math.max(1, Math.round(barW / seg))
  const filled = Math.round((pct / 100) * segCount)
  const segW = barW / segCount
  ctx.strokeStyle = 'rgba(160, 220, 170, 0.6)'
  ctx.lineWidth = 1
  ctx.strokeRect(barX, barTop, barW, 18)
  for (let i = 0; i < segCount; i++) {
    ctx.fillStyle = i < filled ? 'rgba(191, 233, 198, 0.9)' : 'rgba(90, 130, 100, 0.26)'
    ctx.fillRect(barX + 1 + i * segW, barTop + 2, segW - 1.6, 14)
  }
  ctx.fillStyle = amber
  ctx.font = `700 11px ${MONO}`
  const note = pctInt >= 100 ? 'META ALCANCADA' : `FALTAM ${formatBRL(Math.max(0, goal - raised))} PARA A META`
  ctx.fillText(note, barX, 168)

  // divisor
  ctx.strokeStyle = dim
  ctx.beginPath()
  ctx.moveTo(SAFE, 182)
  ctx.lineTo(RIGHT, 182)
  ctx.stroke()

  /* -------- bloco: CHAVE PIX -------- */
  ctx.fillStyle = amber
  ctx.font = `700 14px ${MONO}`
  ctx.fillText('> CHAVE PIX', SAFE, 202)

  const key = project.pix.key
  const keyPending = isPlaceholder(key)
  const keyText = keyPending ? 'CHAVE PIX A PUBLICAR' : key
  ctx.strokeStyle = 'rgba(90, 120, 100, 0.5)'
  ctx.lineWidth = 1
  ctx.strokeRect(SAFE, 210, RIGHT - SAFE, 38)
  ctx.fillStyle = keyPending ? warn : bright
  ctx.font = `700 21px ${MONO}`
  ctx.fillText(keyText, SAFE + 8, 236)

  /* -------- botões: copiar (principal) + compartilhar -------- */
  const buttons = getCrtButtons()
  drawButton(ctx, buttons[0], cursorPx, cursorPressed, office.copyFlash > 0.02)
  drawButton(ctx, buttons[1], cursorPx, cursorPressed, office.shareFlash > 0.02)

  /* -------- rodapé / status -------- */
  ctx.fillStyle = amber
  ctx.font = `700 11px ${MONO}`
  if (office.crtStatus) {
    ctx.fillText(office.crtStatus, SAFE, 316)
  } else if (office.copyFlash > 0.02) {
    ctx.fillText('[ CHAVE COPIADA ]', SAFE, 316)
  } else if (office.shareFlash > 0.02) {
    ctx.fillText('[ COMPARTILHADO ]', SAFE, 316)
  } else {
    ctx.fillText('PRONTO - AGUARDANDO COMANDO', SAFE, 316)
  }

  ctx.fillStyle = dim
  ctx.font = `700 10px ${MONO}`
  ctx.fillText('ESC PARA SAIR', SAFE, h - 26)
  ctx.fillText('TOTAL DOADORES: ?', RIGHT - ctx.measureText('TOTAL DOADORES: ?').width, h - 26)

  // cursor virtual (seta monocromática com outline)
  if (cursorPx) {
    drawVirtualCursor(ctx, cursorPx, cursorPressed)
  }

  ctx.restore()

  return { buttons }
}

function drawButton(
  ctx: CanvasRenderingContext2D,
  btn: CrtButton,
  cursor: { x: number; y: number } | null,
  cursorPressed: boolean,
  flashed: boolean,
): void {
  const hovered = cursor ? pointInButton(btn, cursor.x, cursor.y) : false
  const pressed = hovered && cursorPressed

  // contorno de botão retrô: caixa simples, sem border-radius
  ctx.strokeStyle = hovered || flashed ? '#d5f0d9' : 'rgba(145, 190, 155, 0.85)'
  ctx.lineWidth = pressed ? 3 : 2
  if (pressed) ctx.fillStyle = 'rgba(120, 200, 130, 0.25)'
  else ctx.fillStyle = hovered ? 'rgba(120, 200, 130, 0.12)' : 'rgba(40, 90, 60, 0.2)'
  ctx.fillRect(btn.x + 2, btn.y + 2, btn.w - 4, btn.h - 4)
  ctx.strokeRect(btn.x + 2, btn.y + 2, btn.w - 4, btn.h - 4)

  const label = flashed ? btn.actionLabel || btn.label : btn.label
  ctx.fillStyle = flashed ? '#ffd98a' : '#cfeafe'
  ctx.font = `700 15px ${MONO}`
  ctx.textBaseline = 'middle'
  const lw = ctx.measureText(label).width
  ctx.fillText(label, btn.x + btn.w / 2 - lw / 2, btn.y + btn.h / 2 + 1)
  ctx.textBaseline = 'alphabetic'
}

function drawVirtualCursor(ctx: CanvasRenderingContext2D, p: { x: number; y: number }, pressed: boolean): void {
  const s = 7
  ctx.save()
  ctx.translate(p.x, p.y)
  // outline escuro (contraste sobre fundo verde)
  ctx.fillStyle = 'rgba(4, 8, 6, 0.9)'
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(0, s * 1.7)
  ctx.lineTo(s * 1.1, s)
  ctx.lineTo(s * 0.55, s)
  ctx.lineTo(s * 0.8, s * 1.9)
  ctx.closePath()
  ctx.fill()
  // seta clara por cima (branca pura: aparece bem sobre o fósforo escuro)
  ctx.fillStyle = pressed ? '#ffd98a' : '#ffffff'
  ctx.beginPath()
  ctx.translate(-0.6, -0.6)
  ctx.moveTo(0, 0)
  ctx.lineTo(0, s * 1.7)
  ctx.lineTo(s * 1.1, s)
  ctx.lineTo(s * 0.55, s)
  ctx.lineTo(s * 0.8, s * 1.9)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}