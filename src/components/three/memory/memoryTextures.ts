import * as THREE from 'three'
import type { MemoryStage } from '../../../data/memoryCalendar'
import {
  getDay,
  getDaysInMonth,
  getFirstWeekday,
  getMonthName,
  getYear,
} from '../../../data/memoryCalendar'

/**
 * Texturas processuais da cena da mesa. Nenhum asset externo, nenhuma rede:
 * a superfície "retrô anos 80", o papel e a face impressa do calendário são
 * desenhadas em <canvas> e viram THREE.CanvasTexture. A face do calendário
 * imita um calendário de mesa oitentista — grade de dias, cabeçalho tipográfico
 * em negrito e o dia marcado à mão com canetinha (círculo + anotação).
 *
 * Fontes usadas no canvas: "Space Grotesk Variable" (títulos/dias),
 * "Space Mono" (rodapé/ano) e "Kalam" (anotações manuscritas) — as MESMAS do
 * site, já carregadas por @fontsource.
 */

const WOOD_W = 1024
const WOOD_H = 1024
const FACE_W = 1024
const FACE_H = 1280
const PAPER_W = 512
const PAPER_H = 640

export const FACE_MONTH_FONT = '"Space Grotesk Variable", "Space Grotesk", system-ui, sans-serif'
export const FACE_MONO_FONT = '"Space Mono", ui-monospace, monospace'
export const FACE_HAND_FONT = '"Kalam", "Segoe Print", cursive'

/** Pré-carrega as faces tipográficas usadas no canvas do calendário. */
export function preloadMemoryFonts(): void {
  if (typeof document === 'undefined' || !document.fonts) return
  const specs = [
    `800 96px ${FACE_MONTH_FONT}`,
    `600 52px ${FACE_MONTH_FONT}`,
    `400 44px ${FACE_MONO_FONT}`,
    `400 40px ${FACE_MONO_FONT}`,
    `400 34px ${FACE_HAND_FONT}`,
    `700 34px ${FACE_HAND_FONT}`,
  ]
  for (const spec of specs) {
    try {
      void document.fonts.load(spec)
    } catch {
      /* font indisponível: o canvas usa o fallback e ninguém quebra */
    }
  }
}

function makeTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

function seeded(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

/* ---------------------------------- grão fino de papel ------------------------------ */

function addPaperGrain(ctx: CanvasRenderingContext2D, w: number, h: number, amount: number): void {
  const n = Math.floor((w * h) / 14)
  ctx.save()
  for (let i = 0; i < n; i++) {
    const x = seeded(i) * w
    const y = seeded(i + 991) * h
    const a = (0.02 + seeded(i + 401) * 0.05) * amount
    ctx.fillStyle = `rgba(48, 36, 22, ${a})`
    ctx.fillRect(x, y, 1.2, 1.2)
  }
  ctx.restore()
}

/* ---------------------------------- superfície "retrô anos 80" --------------------------------------------------- */

export function makeWoodTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = WOOD_W
  canvas.height = WOOD_H
  const ctx = canvas.getContext('2d')!
  ctx.clearRect(0, 0, WOOD_W, WOOD_H)

  // base: madeira morna e clara (nada de indigo/sépia)
  const base = ctx.createLinearGradient(0, 0, WOOD_W, WOOD_H)
  base.addColorStop(0, '#3a2812')
  base.addColorStop(0.5, '#30200e')
  base.addColorStop(1, '#2a1b09')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, WOOD_W, WOOD_H)

  // grid retrô discreto (como piso synthwave, mas sutil sob o calendário)
  const cell = 46
  ctx.strokeStyle = 'rgba(255, 214, 150, 0.06)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let x = 0; x <= WOOD_W; x += cell) {
    ctx.moveTo(x + 0.5, 0)
    ctx.lineTo(x + 0.5, WOOD_H)
  }
  for (let y = 0; y <= WOOD_H; y += cell) {
    ctx.moveTo(0, y + 0.5)
    ctx.lineTo(WOOD_W, y + 0.5)
  }
  ctx.stroke()

  // feixes de luz quente varrendo a superfície (âmbar e creme)
  const bands: Array<[string, number, number, number]> = [
    ['rgba(255, 190, 96,', 0.09, WOOD_H * 0.24, 90],
    ['rgba(255, 236, 168,', 0.07, WOOD_H * 0.62, 90],
    ['rgba(214, 152, 78,', 0.06, WOOD_H * 0.45, 70],
  ]
  for (const [rgb, alpha, cy, spread] of bands) {
    const wx = WOOD_W * 0.18 + seeded(cy) * WOOD_W * 0.6
    const g = ctx.createRadialGradient(wx, cy, 10, wx, cy, spread)
    g.addColorStop(0, `${rgb} ${alpha})`)
    g.addColorStop(1, `${rgb} 0)`)
    ctx.fillStyle = g
    ctx.fillRect(0, 0, WOOD_W, WOOD_H)
  }

  // ruído de grão neutro
  for (let i = 0; i < 1600; i++) {
    const x = seeded(i) * WOOD_W
    const y = seeded(i + 711) * WOOD_H
    const a = 0.02 + seeded(i + 13) * 0.045
    ctx.fillStyle = `rgba(255, 236, 200, ${a})`
    ctx.fillRect(x, y, 1.1, 1.1)
  }

  // luz quente de "abajur" vindo do centro — chiaroscuro ambar­o
  const light = ctx.createRadialGradient(WOOD_W * 0.5, WOOD_H * 0.45, 40, WOOD_W * 0.5, WOOD_H * 0.45, WOOD_W * 0.7)
  light.addColorStop(0, 'rgba(255, 210, 130, 0.18)')
  light.addColorStop(0.5, 'rgba(255, 210, 130, 0.03)')
  light.addColorStop(1, 'rgba(28, 15, 4, 0.36)')
  ctx.fillStyle = light
  ctx.fillRect(0, 0, WOOD_W, WOOD_H)

  const tex = makeTexture(canvas)
  tex.repeat.set(2.4, 2.4)
  tex.wrapS = THREE.RepeatWrapping
  tex.wrapT = THREE.RepeatWrapping
  return tex
}

/* ------------------------------- papel liso (verso / traseira) ---------------------- */

export function makePlainPaperTexture(tint: 'recto' | 'verso' = 'recto'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = PAPER_W
  canvas.height = PAPER_H
  const ctx = canvas.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, PAPER_H)
  if (tint === 'recto') {
    g.addColorStop(0, '#f8f6fc')
    g.addColorStop(1, '#ece9f4')
  } else {
    g.addColorStop(0, '#f0edf6')
    g.addColorStop(1, '#ddd9e8')
  }
  ctx.fillStyle = g
  ctx.fillRect(0, 0, PAPER_W, PAPER_H)
  addPaperGrain(ctx, PAPER_W, PAPER_H, 1)
  return makeTexture(canvas)
}

/* ------------------- face impressa do calendário (retrô anos 80, dia marcado) ---------- */

const WEEKDAYS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB']

/* paleta retrô anos 80 — neon sobre papel claro, nada de sépia */
const INK_DARK = '#170d33'
const NEON_PINK = '#ff3fb0'
const NEON_CYAN = '#22c8f2'
const NEON_BLUE = '#3246e6'
const MARK_RED = '#ff1308'

export function drawCalendarFace(
  ctx: CanvasRenderingContext2D,
  stage: MemoryStage,
  w = FACE_W,
  h = FACE_H,
): void {
  const monthName = getMonthName(stage.date) || 'mês'
  const year = getYear(stage.date)
  const markedDay = getDay(stage.date)
  const daysInMonth = getDaysInMonth(stage.date)
  const firstWeekday = getFirstWeekday(stage.date)

  const margin = 58

  // fundo do papel — branco levemente azulado, frio (não é pergaminho)
  const paper = ctx.createLinearGradient(0, 0, 0, h)
  paper.addColorStop(0, '#faf8fd')
  paper.addColorStop(0.06, '#f5f2fa')
  paper.addColorStop(1, '#eae6f1')
  ctx.fillStyle = paper
  ctx.fillRect(0, 0, w, h)
  addPaperGrain(ctx, w, h, 1.4)

  // encadernação é 3D (aços no topo da folha); aqui o papel nasce limpo

  // cabeçalho: mês em negrito ultra-condensado
  ctx.textBaseline = 'alphabetic'
  ctx.textAlign = 'center'
  ctx.fillStyle = INK_DARK
  ctx.font = `800 ${Math.round(w * 0.1)}px ${FACE_MONTH_FONT}`
  ctx.fillText(monthName.toUpperCase(), w / 2, 208)

  // ano em mono ciano
  ctx.font = `400 ${Math.round(w * 0.047)}px ${FACE_MONO_FONT}`
  ctx.fillStyle = NEON_BLUE
  ctx.letterSpacing = '8px'
  ctx.fillText(String(year ?? ''), w / 2, 262)
  ctx.letterSpacing = '0px'

  // dupla regra neon (magenta por cima, ciano por baixo)
  ctx.strokeStyle = NEON_PINK
  ctx.lineWidth = 3
  ctx.beginPath()
  ctx.moveTo(margin, 304)
  ctx.lineTo(w - margin, 304)
  ctx.stroke()
  ctx.strokeStyle = NEON_CYAN
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(margin + 10, 320)
  ctx.lineTo(w - margin - 10, 320)
  ctx.stroke()

  // dias da semana — fim de semana em magenta, dias úteis em azul
  // se a etapa tem descrição, a grade abre espaço para a anotação manuscrita
  const desc = (stage.description ?? '').trim()
  const hasDesc = desc.length > 0
  const gridTop = 356
  const gridEnd = hasDesc ? h - 300 : h - 150
  const gridH = gridEnd - gridTop
  const rowH = gridH / 6
  const colW = (w - margin * 2) / 7
  ctx.font = `700 ${Math.round(w * 0.031)}px ${FACE_MONO_FONT}`
  ctx.textBaseline = 'middle'
  for (let c = 0; c < 7; c++) {
    const isWeekend = c === 0 || c === 6
    ctx.fillStyle = isWeekend ? NEON_PINK : NEON_BLUE
    ctx.fillText(WEEKDAYS[c], margin + colW * c + colW / 2, gridTop + 26)
  }

  // linhas de grade horizontais discretas
  ctx.strokeStyle = NEON_BLUE
  ctx.globalAlpha = 0.12
  ctx.lineWidth = 1
  for (let r = 1; r <= 5; r++) {
    ctx.beginPath()
    ctx.moveTo(margin, gridTop + 52 + r * rowH)
    ctx.lineTo(w - margin, gridTop + 52 + r * rowH)
    ctx.stroke()
  }
  ctx.globalAlpha = 1

  // números dos dias (domingo em magenta, resto em tinta escura)
  ctx.font = `800 ${Math.round(w * 0.06)}px ${FACE_MONTH_FONT}`
  let cell = firstWeekday
  let row = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const isSunday = cell === 0
    const cx = margin + colW * cell + colW / 2
    const cy = gridTop + 62 + rowH * row + rowH * 0.42
    ctx.fillStyle = isSunday ? NEON_PINK : INK_DARK
    ctx.fillText(String(d), cx, cy)

    if (markedDay === d) {
      drawMarkedCell(ctx, cx, cy, colW, row, rowH, gridTop, margin, cell)
    }
    cell++
    if (cell > 6) {
      cell = 0
      row++
    }
  }

  // descrição da fase em canetinha vermelha, na base do papel (não cobre a data)
  if (hasDesc) {
    drawHandDescription(ctx, desc, w, gridEnd)
  }

  // rodapé impresso discreto
  ctx.font = `400 ${Math.round(w * 0.023)}px ${FACE_MONO_FONT}`
  ctx.fillStyle = NEON_BLUE
  ctx.globalAlpha = 0.55
  ctx.textBaseline = 'alphabetic'
  ctx.letterSpacing = '3px'
  ctx.fillText(`·  PROJETO ÍCARO  ·`, w / 2, h - 60)
  ctx.letterSpacing = '0px'
  ctx.globalAlpha = 1
}

/**
 * Descrição da fase escrita à mão, com canetinha vermelha, na base da folha —
 * bem abaixo da grade, para nunca cobrir a data marcada. Quebra palavras e
 * faz duas passadas de tinta como um marcador de verdade.
 */
function drawHandDescription(
  ctx: CanvasRenderingContext2D,
  text: string,
  w: number,
  gridEnd: number,
): void {
  const x0 = 74
  const x1 = w - 74
  const size = Math.round(w * 0.041)
  const lineH = Math.round(size * 1.24)
  const y0 = gridEnd + 22

  ctx.save()
  ctx.font = `400 ${size}px ${FACE_HAND_FONT}`
  ctx.fillStyle = MARK_RED
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'

  const words = String(text).split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let cur = ''
  for (const word of words) {
    const probe = cur ? `${cur} ${word}` : word
    if (ctx.measureText(probe).width <= x1 - x0) {
      cur = probe
    } else {
      if (cur) lines.push(cur)
      cur = word
      if (lines.length >= 6) break
    }
  }
  if (cur && lines.length < 7) lines.push(cur)

  ctx.translate(x0, y0)
  ctx.rotate(-0.014 + 0.008)
  for (let i = 0; i < lines.length; i++) {
    const yy = i * lineH
    ctx.globalAlpha = 0.62
    ctx.fillText(lines[i], 1.5, yy + 2)
    ctx.globalAlpha = 0.92
    ctx.fillText(lines[i], 0.75, yy + 1)
    ctx.globalAlpha = 1
    ctx.fillText(lines[i], 0, yy)
  }
  ctx.restore()
}

/**
 * Dia marcado: marca-texto ciano na célula, círculo vermelho de "canetinha" em
 * volta do número e anotação manuscrita logo abaixo da data.
 */
function drawMarkedCell(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  colW: number,
  row: number,
  rowH: number,
  gridTop: number,
  margin: number,
  cell: number,
): void {
  const radius = colW * 0.36

  // marca-texto ciano cobrindo a célula do dia
  ctx.fillStyle = 'rgba(34, 200, 242, 0.18)'
  ctx.fillRect(margin + colW * cell + 3, gridTop + 52 + row * rowH + 3, colW - 6, rowH - 6)

  // círculo vermelho à mão em volta do número
  drawHandCircle(ctx, cx, cy - 4, radius)

  // anotação manuscrita (canetinha) logo abaixo do dia marcado
  drawHandNote(ctx, cx, cy, radius)
}

/**
 * Nota manuscrita de canetinha vermelha abaixo do dia marcado: um "hoje!" com
 * leve rotação, duas passadas de tinta (como marcador de verdade) e um risquinho
 * subindo em direção ao círculo.
 */
function drawHandNote(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const note = 'hoje!'
  const size = Math.round(FACE_W * 0.028)
  ctx.save()
  ctx.translate(cx, cy + radius + 12)
  ctx.rotate(-0.05)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.font = `400 ${size}px ${FACE_HAND_FONT}`
  ctx.fillStyle = MARK_RED

  // tinta dupla: passada fantasma deslocada + passada principal (borda molhada)
  ctx.globalAlpha = 0.5
  ctx.fillText(note, 1.2, 1.6)
  ctx.globalAlpha = 0.85
  ctx.fillText(note, 0.6, 0.9)
  ctx.globalAlpha = 1
  ctx.fillText(note, 0, 0)

  // risquinho de caneta conectando a nota ao círculo
  ctx.strokeStyle = MARK_RED
  ctx.globalAlpha = 0.95
  ctx.lineWidth = 3.5
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(-size * 0.45, -radius - 2)
  ctx.quadraticCurveTo(size * 0.2, -radius - 14, size * 0.75, -radius - 9)
  ctx.stroke()
  ctx.lineCap = 'butt'
  ctx.globalAlpha = 1
  ctx.restore()
}

/**
 * Círculo vermelho "marcado à mão" em volta do dia, com leve rotação e
 * imperfeição — como se tivesse sido desenhado com caneta.
 */
function drawHandCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): void {
  const now = Math.sin(cx * 7.7 + cy) // pequena variância determinística por posição
  const wobble = 0.04 + (now > 0 ? Math.abs(now) * 0.03 : 0.02)
  ctx.save()
  ctx.translate(cx, cy)
  ctx.rotate(-0.045 + (now > 0 ? 0.02 : -0.02))
  ctx.strokeStyle = MARK_RED
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  // duas passadas, levemente desalinhadas, como caneta em papel
  for (const pass of [0, 1]) {
    ctx.globalAlpha = 1 - pass * 0.12
    ctx.beginPath()
    const n = 14
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2
      const rr = radius * (1 + wobble * Math.sin(a * 3 + pass * 2))
      const x = Math.cos(a) * rr + (pass === 0 ? 0 : 1.5)
      const y = Math.sin(a) * rr + (pass === 1 ? 1.5 : 0)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  // pequeno traço de caneta saindo do círculo (só tinta que escorre)
  ctx.globalAlpha = 0.95
  ctx.lineWidth = 6
  ctx.beginPath()
  ctx.moveTo(radius * 0.3, -radius * 0.92)
  ctx.quadraticCurveTo(radius * 0.55, -radius * 1.15, radius * 0.8, -radius * 0.7)
  ctx.stroke()

  ctx.restore()
  ctx.globalAlpha = 1
}

export function makeCalendarFaceTexture(stage: MemoryStage): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = FACE_W
  canvas.height = FACE_H
  const ctx = canvas.getContext('2d')!
  drawCalendarFace(ctx, stage)
  return makeTexture(canvas)
}

/* ------------------------------ cache de recursos ------------------------------ */

const faceCache = new Map<number, THREE.CanvasTexture>()
let versoCache: THREE.CanvasTexture | null = null

/**
 * Face impressa de uma etapa, cacheada. Desenha na hora com fonte de fallback
 * (sans-serif, para o calendário nunca nascer em branco) e, quando as fontes
 * do site terminarem de carregar, redesenha no mesmo canvas com a tipografia
 * real. Barato e idempotente.
 */
export function getFaceTexture(stageIndex: number, stage: MemoryStage): THREE.CanvasTexture {
  const cached = faceCache.get(stageIndex)
  if (cached) return cached
  const tex = makeCalendarFaceTexture(stage)
  faceCache.set(stageIndex, tex)
  respellOnFontsReady(tex, stage)
  return tex
}

export function getVersoTexture(): THREE.CanvasTexture {
  if (versoCache) return versoCache
  versoCache = makePlainPaperTexture('verso')
  return versoCache
}

/** Redesenha a face quando as fontes do site estão ok (uma vez por textura). */
function respellOnFontsReady(tex: THREE.CanvasTexture, stage: MemoryStage): void {
  let done = false
  const refresh = () => {
    if (done || !tex.image) return
    done = true
    const ctx = (tex.image as HTMLCanvasElement).getContext('2d')
    drawCalendarFace(ctx!, stage)
    tex.needsUpdate = true
  }
  if (typeof document === 'undefined' || !document.fonts) return
  document.fonts.ready.then(() => refresh()).catch(() => {})
}

export function clearMemoryTextureCache(): void {
  faceCache.forEach((t) => t.dispose())
  faceCache.clear()
  if (versoCache) {
    versoCache.dispose()
    versoCache = null
  }
}