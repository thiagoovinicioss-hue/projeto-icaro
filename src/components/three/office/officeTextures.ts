import * as THREE from 'three'
import QRCode from 'qrcode'
import { project } from '../../../data/project'
import { hasRealPixPayload } from '../../../utils/pix'

/**
 * Texturas processuais do escritório retrô (§60/§61). Nada de asset externo:
 * madeira, plástico bege, papel, teclado, post-it, parede e as folhas impressas
 * são <canvas> → THREE.CanvasTexture. O QR é desenhado LOCALMENTE com o pacote
 * `qrcode` (sem rede, §34/§58).
 */

export const BEIGE = '#d8d0c0'
export const BEIGE_DARK = '#a89a82'
export const BEIGE_LIGHT = '#e9e2d4'
export const WOOD_BASE = '#6a4a28'
export const WOOD_DARK = '#3c2712'

function seeded(i: number): number {
  const x = Math.sin(i * 12.9898 + 78.233) * 43758.5453
  return x - Math.floor(x)
}

function makeTexture(canvas: HTMLCanvasElement, nearest = false): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.SRGBColorSpace
  if (nearest) {
    tex.magFilter = THREE.NearestFilter
    tex.minFilter = THREE.NearestFilter
  } else {
    tex.anisotropy = 8
  }
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

/* ------------------------------- madeira da mesa ------------------------------- */

export type WoodFace = 'top' | 'side'

export function makeDeskWoodTexture(face: WoodFace = 'top'): THREE.CanvasTexture {
  const w = 512
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  // Walnut quente e escuro — luz quente da luminária vai criar o hotspot (§17)
  ctx.fillStyle = face === 'top' ? '#5a3a20' : WOOD_DARK
  ctx.fillRect(0, 0, w, h)

  // fundo com variação larga de tom (plaino não uniforme)
  const base = ctx.createLinearGradient(0, 0, w, h)
  base.addColorStop(0, face === 'top' ? '#5a3a20' : '#3c2712')
  base.addColorStop(0.5, face === 'top' ? '#4a2e16' : '#301d0c')
  base.addColorStop(1, face === 'top' ? '#543719' : '#3c2712')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // veios longos e escuros, discretos, ao longo de X
  ctx.lineCap = 'round'
  for (let i = 0; i < 90; i++) {
    const y = seeded(i * 3) * h
    const drift = Math.sin(seeded(i) * Math.PI * 4) * (face === 'top' ? 10 : 3)
    ctx.strokeStyle = i % 7 === 0 ? 'rgba(28,16,6,0.5)' : 'rgba(44,26,10,0.42)'
    ctx.lineWidth = i % 7 === 0 ? 4 : 2.4
    ctx.beginPath()
    ctx.moveTo(-10, y)
    ctx.bezierCurveTo(w * 0.3, y + drift, w * 0.6, y - drift, w + 10, y + seeded(i + 5) * 6)
    ctx.stroke()
  }
  // fios de veio fino e mais claro
  ctx.strokeStyle = 'rgba(190, 140, 84, 0.22)'
  ctx.lineWidth = 1.2
  for (let i = 0; i < 120; i++) {
    const y = seeded(i + 300) * h
    ctx.beginPath()
    ctx.moveTo(-10, y)
    ctx.bezierCurveTo(w * 0.3, y + 5, w * 0.7, y - 5, w + 10, y + 3)
    ctx.stroke()
  }
  // grão fino
  for (let i = 0; i < 900; i++) {
    const x = seeded(i) * w
    const y = seeded(i + 700) * h
    const a = face === 'top' ? 0.05 : 0.09
    ctx.fillStyle = `rgba(16, 9, 3, ${a})`
    ctx.fillRect(x, y, 1.6, 1.4)
  }

  // acabamento semi-fosco: brilho suave vindo do canto superior (luminária)
  const sheen = ctx.createLinearGradient(0, 0, 0, h)
  sheen.addColorStop(0, 'rgba(255, 214, 160, 0.075)')
  sheen.addColorStop(0.35, 'rgba(255, 214, 160, 0.02)')
  sheen.addColorStop(1, 'rgba(0, 0, 0, 0.28)')
  ctx.fillStyle = sheen
  ctx.fillRect(0, 0, w, h)

  const tex = makeTexture(canvas)
  tex.anisotropy = 8
  if (face === 'top') {
    tex.repeat.set(3.2, 2.6)
    tex.wrapS = THREE.RepeatWrapping
    tex.wrapT = THREE.RepeatWrapping
  }
  return tex
}

/* ------------------------------- plástico bege ------------------------------- */

export function makeBeigeTexture(variant: 'body' | 'dark' | 'key' | 'light'): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const base = variant === 'body' ? BEIGE : variant === 'dark' ? BEIGE_DARK : variant === 'key' ? '#d6cdbb' : BEIGE_LIGHT
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  // sombreado suave (plástico envelhecido, um pouco amarelado)
  const g = ctx.createRadialGradient(size / 2, size * 0.3, size * 0.1, size / 2, size / 2, size * 0.75)
  g.addColorStop(0, 'rgba(245, 238, 222, 0.35)')
  g.addColorStop(1, 'rgba(90, 70, 46, 0.3)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  // grão de plástico
  for (let i = 0; i < 500; i++) {
    const x = seeded(i) * size
    const y = seeded(i + 99) * size
    ctx.fillStyle = `rgba(60, 48, 34, ${0.02 + seeded(i + 40) * 0.04})`
    ctx.fillRect(x, y, 1.4, 1.4)
  }
  return makeTexture(canvas)
}

/* ------------------------------- papel ------------------------------- */

export function makePaperTexture(tint: 'light' | 'crumb' = 'light'): THREE.CanvasTexture {
  const w = 256
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  const base = tint === 'light' ? '#f0ead8' : '#e6dfc9'
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)
  for (let i = 0; i < 600; i++) {
    const x = seeded(i) * w
    const y = seeded(i + 333) * h
    ctx.fillStyle = `rgba(90, 76, 52, ${0.02 + seeded(i + 7) * 0.05})`
    ctx.fillRect(x, y, 1.1, 1.1)
  }
  return makeTexture(canvas)
}

/* -------------------- plástico da impressora (off-white antigo) -------------------- */

/**
 * Off-white quente levemente amarelado — o plástico "bege de escritório" dos
 * anos 2000 (queimado de luz, não novo). Grão fino + sombra de canto suave
 * que dá a leitura de volume mesmo antes da iluminação entrar.
 */
export function makePrinterPlasticTexture(weight: 'light' | 'base' | 'dark' = 'base'): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const base = weight === 'light' ? '#e2dcc9' : weight === 'dark' ? '#b8b09b' : '#d9d2be'
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // variação larga de tom (plástico queimado, não uniforme)
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, 'rgba(252, 248, 232, 0.28)')
  g.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  g.addColorStop(1, 'rgba(92, 74, 48, 0.26)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  // molde/granulado do plástico injetado
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = `rgba(70, 56, 36, ${0.015 + seeded(i + 11) * 0.045})`
    ctx.fillRect(seeded(i) * size, seeded(i + 51) * size, 1.3, 1.3)
  }
  // manchinhas de envelhecimento mais escuras e mais claras
  for (let i = 0; i < 160; i++) {
    const x = seeded(i + 3) * size
    const y = seeded(i + 4) * size
    const dark = seeded(i + 5) > 0.5
    ctx.fillStyle = dark ? `rgba(74, 58, 36, ${0.03 + seeded(i + 6) * 0.06})` : `rgba(255, 250, 235, ${0.04 * seeded(i + 8)})`
    ctx.fillRect(x, y, 2, 2)
  }

  // sombra de canto sutil (leitura de volume / AO fake)
  const corner = ctx.createRadialGradient(size * 0.62, size * 0.4, size * 0.12, size * 0.5, size * 0.5, size * 0.92)
  corner.addColorStop(0, 'rgba(255, 255, 255, 0)')
  corner.addColorStop(1, 'rgba(66, 50, 28, 0.22)')
  ctx.fillStyle = corner
  ctx.fillRect(0, 0, size, size)

  return makeTexture(canvas)
}

/* -------------------- plástico do mouse (ABS creme amarelado) -------------------- */

/**
 * ABS creme já amarelado pelo tempo (§7): fundo quente, leve variação larga de
 * tom, grão fino de moldagem e poucas manchinhas — sem brilho de plástico novo.
 * A cor final vem daqui (o material usa cor branca e multiplica).
 */
export function makeMousePlasticTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const base = '#d9d3b2'
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)

  // variação de tom quente, não uniforme (topo mais claro, base mais suja)
  const g = ctx.createLinearGradient(0, 0, size * 0.8, size)
  g.addColorStop(0, 'rgba(248, 244, 224, 0.34)')
  g.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  g.addColorStop(1, 'rgba(96, 82, 52, 0.26)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)

  // grão de plástico injetado
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(84, 72, 46, ${0.015 + seeded(i + 31) * 0.04})`
    ctx.fillRect(seeded(i) * size, seeded(i + 71) * size, 1.2, 1.2)
  }
  // manchinhas de envelhecimento (mais escuras e mais claras)
  for (let i = 0; i < 90; i++) {
    const dark = seeded(i + 5) > 0.45
    ctx.fillStyle = dark
      ? `rgba(78, 62, 38, ${0.03 + seeded(i + 6) * 0.05})`
      : `rgba(255, 251, 236, ${0.035 * seeded(i + 8)})`
    ctx.fillRect(seeded(i + 3) * size, seeded(i + 4) * size, 2.2, 2)
  }

  return makeTexture(canvas)
}

/* -------------------- plástico interno (grafite fosco) -------------------- */

/** Interior escuro da máquina: grafite quase neutro, fosco, com guias visíveis. */
export function makeGraphiteTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#24221f'
  ctx.fillRect(0, 0, size, size)
  const g = ctx.createLinearGradient(0, 0, size, size)
  g.addColorStop(0, 'rgba(80, 78, 72, 0.18)')
  g.addColorStop(0.5, 'rgba(0, 0, 0, 0)')
  g.addColorStop(1, 'rgba(0, 0, 0, 0.5)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(14, 13, 12, ${0.04 + seeded(i + 21) * 0.1})`
    ctx.fillRect(seeded(i) * size, seeded(i + 31) * size, 1.4, 1.4)
  }
  for (let i = 0; i < 120; i++) {
    ctx.fillStyle = `rgba(120, 116, 104, ${0.03 + seeded(i + 41) * 0.04})`
    ctx.fillRect(seeded(i + 2) * size, seeded(i + 3) * size, 1.8, 1.2)
  }
  return makeTexture(canvas)
}

/* -------------------- sombra de contato (AO fake para objetos de mesa) -------------------- */

/** Blob radial preto→transparente; deitado sob bases para "grudar" o objeto na mesa. */
export function makeContactShadowTexture(): THREE.CanvasTexture {
  const size = 256
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.08, size / 2, size / 2, size * 0.5)
  g.addColorStop(0, 'rgba(14, 9, 4, 0.6)')
  g.addColorStop(0.42, 'rgba(14, 9, 4, 0.32)')
  g.addColorStop(0.75, 'rgba(14, 9, 4, 0.1)')
  g.addColorStop(1, 'rgba(14, 9, 4, 0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = makeTexture(canvas)
  tex.wrapS = THREE.ClampToEdgeWrapping
  tex.wrapT = THREE.ClampToEdgeWrapping
  return tex
}

/* ------------------------------- teclado (face) ------------------------------- */

export function makeKeyboardTexture(): THREE.CanvasTexture {
  const w = 768
  const h = 192
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = BEIGE
  ctx.fillRect(0, 0, w, h)
  // grão plástico
  for (let i = 0; i < 200; i++) {
    ctx.fillStyle = `rgba(60, 50, 38, ${0.02 + seeded(i) * 0.03})`
    ctx.fillRect(seeded(i + 1) * w, seeded(i + 2) * h, 1.2, 1.2)
  }

  const cols = 11
  const rows = 4
  const cw = w / cols
  const ch = h / rows
  ctx.font = `700 ${Math.round(ch * 0.5)}px "Space Mono", monospace`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const labels = [
    ['ESC', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'BACK'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'ENTER', 'RET'],
    ['SHIFT', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', ',', '.', 'UP'],
  ]
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * cw + cw / 2
      const y = r * ch + ch / 2
      const keyW = (cwidth(labels[r][c]) as number)
      const kw = cw * keyW
      const x0 = x - kw / 2
      const bw = kw - 3
      ctx.fillStyle = '#d6cdbb'
      ctx.fillRect(x0 + 1.5, r * ch + 2.5, bw, ch - 5)
      ctx.strokeStyle = 'rgba(80,66,48,0.35)'
      ctx.lineWidth = 1
      ctx.strokeRect(x0 + 1.5, r * ch + 2.5, bw, ch - 5)
      ctx.fillStyle = '#4a4236'
      ctx.fillText(labels[r][c], x, y + 1)
    }
  }
  return makeTexture(canvas)
}

function cwidth(label: string): number {
  if (label === 'BACK' || label === 'SHIFT' || label === 'ENTER') return 1.4
  if (label === 'ESC') return 1.2
  return 1
}

/* --------------------------- painel frontal do monitor CRT --------------------------- */

/**
 * Face dianteira do CRT (a moldura grossa): plástico bege envelhecido. A zona
 * ABERTURA DA TELA é deixada transparente — o buraco da moldura extrudada
 * aparece atrás, formando a cavidade escura do tubo. Grade de ventilação,
 * etiqueta, parafusos e micro-led ocupam apenas os filetes ao redor.
 */
export function makeCrtFaceTexture(): THREE.CanvasTexture {
  const w = 520
  const h = 400
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // janela da tela: proporção real do CR (CRT_SCREEN_W/H ÷ CRT_BEZEL_W/H)
  const ow = 360
  const oh = 270
  const ox = (w - ow) / 2 // 80
  const oy = (h - oh) / 2 // 65

  // 1) plástico base — bege quente com gradiente de luz
  const base = ctx.createLinearGradient(0, 0, w, h)
  base.addColorStop(0, '#e2d9c5')
  base.addColorStop(0.55, '#d3c9b4')
  base.addColorStop(1, '#bcb09a')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // envelhecimento leve (manchas e variação de plástico)
  for (let i = 0; i < 1600; i++) {
    const a = seeded(i) * 0.05
    ctx.fillStyle = seeded(i + 7) > 0.5 ? `rgba(60, 48, 32, ${a})` : `rgba(255, 245, 228, ${a * 0.7})`
    ctx.fillRect(seeded(i + 3) * w, seeded(i + 5) * h, 1.6, 2)
  }

  // 2) vão escurecido ao redor da tela (lábio do encaixe do vidro)
  const lip = ctx.createLinearGradient(0, oy, 0, oy + oh)
  lip.addColorStop(0, 'rgba(70, 58, 42, 0.35)')
  lip.addColorStop(0.12, 'rgba(70, 58, 42, 0)')
  lip.addColorStop(0.88, 'rgba(70, 58, 42, 0)')
  lip.addColorStop(1, 'rgba(60, 48, 34, 0.4)')
  ctx.fillStyle = lip
  ctx.fillRect(0, 0, w, h)

  // 3) grade de ventilação — faixa vertical à ESQUERDA da tela
  const vx = 20
  const vy0 = 40
  const ventH = 150
  ctx.fillStyle = 'rgba(90, 78, 60, 0.5)'
  for (let i = 0; i < 12; i++) {
    ctx.fillRect(vx, vy0 + i * (ventH / 12) + 1, 14, ventH / 12 - 2)
  }
  ctx.strokeStyle = 'rgba(80, 66, 48, 0.55)'
  ctx.lineWidth = 2
  ctx.strokeRect(vx - 3, vy0 - 5, 20, ventH + 10)
  // parafusos da tampa da grade
  for (const sy of [vy0 - 14, vy0 + ventH + 14]) {
    ctx.fillStyle = '#9b9079'
    ctx.beginPath()
    ctx.arc(vx + 7, sy, 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60,48,32,0.7)'
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.moveTo(vx + 4, sy)
    ctx.lineTo(vx + 10, sy)
    ctx.stroke()
  }

  // 4) etiqueta do modelo (sem marca, só o projeto)
  ctx.fillStyle = '#ece5d5'
  ctx.fillRect(18, 246, 52, 92)
  ctx.strokeStyle = 'rgba(90, 74, 52, 0.4)'
  ctx.lineWidth = 1.5
  ctx.strokeRect(18, 246, 52, 92)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = '#2c241a'
  ctx.font = '700 17px "Space Mono", monospace'
  ctx.fillText('ICARO', 44, 274)
  ctx.fillStyle = '#6b5f45'
  ctx.font = '700 9px "Space Mono", monospace'
  ctx.fillText('TERMINAL', 44, 292)
  ctx.fillText('DE APOIO', 44, 305)
  ctx.fillStyle = '#4a3f2e'
  ctx.font = '700 8px "Space Mono", monospace'
  ctx.fillText('CRT · 14"', 44, 324)

  // 5) parafusos nos cantos do painel
  for (const [sx, sy] of [[16, 16], [w - 16, 16], [16, h - 16], [w - 16, h - 16]]) {
    ctx.fillStyle = '#a99e88'
    ctx.beginPath()
    ctx.arc(sx, sy, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = 'rgba(60, 48, 32, 0.7)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.moveTo(sx - 3, sy)
    ctx.lineTo(sx + 3, sy)
    ctx.stroke()
  }

  // 6) micro-led de energia (o texto/modelo físico fica em 3D na moldura)
  ctx.fillStyle = '#3a2f20'
  ctx.beginPath()
  ctx.arc(w - 30, h - 24, 6, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = 'rgba(120, 255, 160, 0.7)'
  ctx.beginPath()
  ctx.arc(w - 30, h - 24, 2.6, 0, Math.PI * 2)
  ctx.fill()

  // 7) NO FINAL: apaga a área da tela (cavidade → vê-se o interior escuro)
  ctx.clearRect(ox + 4, oy + 4, ow - 8, oh - 8)

  const tex = makeTexture(canvas)
  return tex
}

/* --------------------------- traseira do monitor CRT --------------------------- */

/** Tampa traseira: plástico bege escuro com filetes de ventilação horizontais. */
export function makeCrtBackTexture(): THREE.CanvasTexture {
  const w = 256
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const base = ctx.createLinearGradient(0, 0, w, h)
  base.addColorStop(0, '#b9af9b')
  base.addColorStop(1, '#a0947d')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, w, h)

  // filetes de ventilação horizontais
  ctx.fillStyle = 'rgba(60, 50, 38, 0.55)'
  for (let i = 0; i < 14; i++) {
    const y = 40 + i * 13
    ctx.fillRect(18, y, w - 36, 5)
  }
  for (let i = 0; i < 600; i++) {
    ctx.fillStyle = `rgba(40, 32, 24, ${0.02 + seeded(i) * 0.05})`
    ctx.fillRect(seeded(i + 1) * w, seeded(i + 2) * h, 1.5, 1.5)
  }
  return makeTexture(canvas)
}

/* --------------------------- adesivo OBAFOG (die-cut) --------------------------- */

/**
 * Adesivo OBAFOG aplicado na lateral esquerda da TV (§25–§31). Nada de asset
 * externo: o logotipo é desenhado localmente (lettering azul + globo integrado,
 * foguete e trajetória laranja, faixa azul "OLIMPÍADA BRASILEIRA DE FOGUETES").
 *
 * Recorte "die-cut": o fundo é TRANSPARENTE e o conteúdo é expandido em uma
 * silhueta creme fina — o vinil acompanha o logo, sem retângulo branco.
 */
const OBAFOG_BLUE = '#1B5EA6'
const OBAFOG_BLUE_LIGHT = '#2E82D6'
const OBAFOG_BLUE_DARK = '#0F3E75'
const OBAFOG_ORANGE = '#F5821F'
const OBAFOG_ORANGE_DARK = '#C96510'
const OBAFOG_CREAM = '#F4F1E8'

export function makeObafogStickerTexture(): THREE.CanvasTexture {
  const W = 768
  const H = 384
  const art = document.createElement('canvas')
  art.width = W
  art.height = H
  const ctx = art.getContext('2d')!
  drawObafogArt(ctx, W, H)

  // silhueta creme (dilatação) para o recorte do vinil
  const silh = document.createElement('canvas')
  silh.width = W
  silh.height = H
  const sctx = silh.getContext('2d')!
  sctx.drawImage(art, 0, 0)
  sctx.globalCompositeOperation = 'source-in'
  sctx.fillStyle = OBAFOG_CREAM
  sctx.fillRect(0, 0, W, H)

  const out = document.createElement('canvas')
  out.width = W
  out.height = H
  const octx = out.getContext('2d')!
  const d = 5
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2
    octx.drawImage(silh, Math.cos(a) * d, Math.sin(a) * d)
  }
  octx.drawImage(art, 0, 0)

  return makeTexture(out)
}

function drawObafogArt(ctx: CanvasRenderingContext2D, W: number, H: number): void {
  ctx.clearRect(0, 0, W, H)
  ctx.textBaseline = 'alphabetic'

  const fontPx = Math.round(H * 0.26)
  const font = `900 ${fontPx}px "Arial Black", Arial, Helvetica, sans-serif`
  ctx.font = font
  const word = 'OBAFOG'
  const wWord = ctx.measureText(word).width
  const startX = 40
  const baseY = Math.round(H * 0.44)

  // lettering azul
  ctx.fillStyle = OBAFOG_BLUE
  ctx.fillText(word, startX, baseY)

  // globo integrado no primeiro "O"
  const oW = ctx.measureText('O').width
  const gcx = startX + oW * 0.5
  const gcy = baseY - fontPx * 0.35
  drawGlobe(ctx, gcx, gcy, fontPx * 0.3)

  // foguete laranja + trajetória
  const rocketX = W - 92
  const rocketY = H * 0.34
  drawTrajectory(ctx, startX + wWord * 0.52, H * 0.66, rocketX - 6, rocketY + 34)
  drawRocket(ctx, rocketX, rocketY, H * 0.13)

  // faixa azul inferior
  const bandX = 18
  const bandY = Math.round(H * 0.78)
  const bandW = W - bandX * 2
  const bandH = Math.round(H * 0.19)
  roundRect(ctx, bandX, bandY, bandW, bandH, bandH * 0.32)
  ctx.fillStyle = OBAFOG_BLUE
  ctx.fill()

  const sub = 'OLIMPÍADA BRASILEIRA DE FOGUETES'
  const maxW = bandW - 36
  let subPx = Math.round(H * 0.085)
  ctx.font = `900 ${subPx}px Arial, Helvetica, sans-serif`
  while (ctx.measureText(sub).width > maxW && subPx > 8) {
    subPx -= 1
    ctx.font = `900 ${subPx}px Arial, Helvetica, sans-serif`
  }
  ctx.fillStyle = OBAFOG_CREAM
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(sub, W / 2, bandY + bandH / 2 + 1)
  ctx.textAlign = 'left'
  ctx.textBaseline = 'alphabetic'
}

function drawGlobe(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  const g = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r)
  g.addColorStop(0, OBAFOG_BLUE_LIGHT)
  g.addColorStop(1, OBAFOG_BLUE)
  ctx.fillStyle = g
  ctx.fill()

  // continentes simples
  ctx.fillStyle = '#DCEBF8'
  ctx.beginPath()
  ctx.ellipse(cx - r * 0.25, cy - r * 0.18, r * 0.42, r * 0.26, -0.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx + r * 0.32, cy + r * 0.34, r * 0.32, r * 0.22, 0.4, 0, Math.PI * 2)
  ctx.fill()

  // malha (meridianos/paralelo)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
  ctx.lineWidth = Math.max(1, r * 0.07)
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 0.42, r, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.beginPath()
  ctx.moveTo(cx - r, cy)
  ctx.lineTo(cx + r, cy)
  ctx.stroke()

  // aro
  ctx.strokeStyle = OBAFOG_BLUE_DARK
  ctx.lineWidth = Math.max(1.5, r * 0.13)
  ctx.beginPath()
  ctx.arc(cx, cy, r, 0, Math.PI * 2)
  ctx.stroke()

  // órbita
  ctx.strokeStyle = OBAFOG_ORANGE
  ctx.lineWidth = Math.max(1.5, r * 0.12)
  ctx.beginPath()
  ctx.ellipse(cx, cy, r * 1.55, r * 0.5, -0.55, 0, Math.PI * 2)
  ctx.stroke()
  ctx.restore()
}

function drawRocket(ctx: CanvasRenderingContext2D, x: number, y: number, h: number): void {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(Math.PI / 4)
  const s = h / 40

  // chama
  ctx.fillStyle = '#FFD46A'
  ctx.beginPath()
  ctx.moveTo(-7 * s, 26 * s)
  ctx.quadraticCurveTo(0, 62 * s, 0, 54 * s)
  ctx.quadraticCurveTo(0, 62 * s, 7 * s, 26 * s)
  ctx.closePath()
  ctx.fill()

  // aletas
  ctx.fillStyle = OBAFOG_ORANGE_DARK
  ctx.beginPath()
  ctx.moveTo(-9 * s, 14 * s)
  ctx.lineTo(-26 * s, 38 * s)
  ctx.lineTo(-8 * s, 30 * s)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(9 * s, 14 * s)
  ctx.lineTo(26 * s, 38 * s)
  ctx.lineTo(8 * s, 30 * s)
  ctx.closePath()
  ctx.fill()

  // corpo
  ctx.fillStyle = OBAFOG_ORANGE
  ctx.beginPath()
  ctx.moveTo(0, -44 * s)
  ctx.quadraticCurveTo(16 * s, -14 * s, 13 * s, 12 * s)
  ctx.lineTo(11 * s, 28 * s)
  ctx.lineTo(-11 * s, 28 * s)
  ctx.lineTo(-13 * s, 12 * s)
  ctx.quadraticCurveTo(-16 * s, -14 * s, 0, -44 * s)
  ctx.closePath()
  ctx.fill()

  // janela
  ctx.fillStyle = OBAFOG_CREAM
  ctx.beginPath()
  ctx.arc(0, -6 * s, 6.5 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = OBAFOG_BLUE_DARK
  ctx.beginPath()
  ctx.arc(0, -6 * s, 3.4 * s, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawTrajectory(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): void {
  ctx.save()
  ctx.strokeStyle = OBAFOG_ORANGE
  ctx.lineWidth = 7
  ctx.lineCap = 'round'
  ctx.setLineDash([26, 16])
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.quadraticCurveTo((x0 + x1) / 2 - 20, y0 - 60, x1, y1)
  ctx.stroke()
  ctx.setLineDash([])
  // ponta de seta
  const ang = Math.atan2(y1 - (y0 - 40), x1 - (x0 + x1) / 2)
  ctx.translate(x1, y1)
  ctx.rotate(ang)
  ctx.fillStyle = OBAFOG_ORANGE
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(-18, 8)
  ctx.lineTo(-18, -8)
  ctx.closePath()
  ctx.fill()
  ctx.restore()
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

/* --------------------------- pôster da parede --------------------------- */

export function makePosterTexture(): THREE.CanvasTexture {
  const w = 256
  const h = 360
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  const g = ctx.createLinearGradient(0, 0, 0, h)
  g.addColorStop(0, '#14203a')
  g.addColorStop(0.5, '#101a30')
  g.addColorStop(1, '#0c1426')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)

  // anel de lançamento (círculos concêntricos)
  ctx.strokeStyle = 'rgba(246, 183, 60, 0.16)'
  for (const r of [34, 52, 70]) {
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(w / 2, h * 0.52, r, 0, Math.PI * 2)
    ctx.stroke()
  }

  // linha de contagem discretíssima
  ctx.fillStyle = 'rgba(246, 183, 60, 0.9)'
  ctx.font = '700 20px "Space Mono", monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('JORNADA OBAFOG', w / 2, h * 0.18)
  ctx.fillStyle = 'rgba(245, 240, 228, 0.92)'
  ctx.font = '700 34px "Space Grotesk Variable", sans-serif'
  ctx.fillText('PROJETO', w / 2, h * 0.32)
  ctx.fillText('ICARO', w / 2, h * 0.42)

  // pequeno foguete vetorial simples
  ctx.fillStyle = 'rgba(245, 240, 228, 0.85)'
  ctx.beginPath()
  ctx.moveTo(w / 2, h * 0.52 - 40)
  ctx.lineTo(w / 2 - 15, h * 0.52 + 8)
  ctx.lineTo(w / 2 + 15, h * 0.52 + 8)
  ctx.closePath()
  ctx.fill()
  ctx.fillStyle = 'rgba(246, 183, 60, 0.9)'
  ctx.beginPath()
  ctx.moveTo(w / 2, h * 0.52 - 34)
  ctx.lineTo(w / 2 - 8, h * 0.52 - 8)
  ctx.lineTo(w / 2 + 8, h * 0.52 - 8)
  ctx.closePath()
  ctx.fill()

  ctx.fillStyle = 'rgba(245, 240, 228, 0.6)'
  ctx.font = '700 12px "Space Mono", monospace'
  ctx.fillText('DO CHAO AO ESPACO', w / 2, h * 0.78)
  return makeTexture(canvas)
}

/* ------------------------------- folha de bloco ------------------------------- */

export function makePadTexture(): THREE.CanvasTexture {
  const w = 512
  const h = 512
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#f1ead6'
  ctx.fillRect(0, 0, w, h)
  // margem do bloco (adesivo no topo)
  ctx.fillStyle = 'rgba(160, 140, 90, 0.28)'
  ctx.fillRect(0, 0, w, 36)
  // linhas de pauta
  ctx.strokeStyle = 'rgba(140, 120, 90, 0.35)'
  ctx.lineWidth = 2
  for (let y = 68; y < h - 20; y += 38) {
    ctx.beginPath()
    ctx.moveTo(16, y)
    ctx.lineTo(w - 16, y)
    ctx.stroke()
  }
  // grão de papel
  for (let i = 0; i < 1400; i++) {
    ctx.fillStyle = `rgba(120, 100, 60, ${seeded(i) * 0.045})`
    ctx.fillRect(seeded(i + 1) * w, seeded(i + 2) * h, 1.4, 1.4)
  }
  return makeTexture(canvas)
}

/* ------------------------------- post-it amarelo ------------------------------- */

export function makePostItTexture(): THREE.CanvasTexture {
  const w = 256
  const h = 256
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  // papel de post-it (o amarelo característico)
  const g = ctx.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, '#ffe45c')
  g.addColorStop(0.55, '#ffd93b')
  g.addColorStop(1, '#f4c01e')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // leve dobra no canto (canto inferior direito dobrando)
  ctx.fillStyle = 'rgba(200, 150, 20, 0.35)'
  const fold = 38
  ctx.beginPath()
  ctx.moveTo(w - fold, h)
  ctx.lineTo(w, h)
  ctx.lineTo(w, h - fold)
  ctx.closePath()
  ctx.fill()
  // sombra fina de papel sobre o próprio post-it
  ctx.strokeStyle = 'rgba(140, 100, 20, 0.4)'
  ctx.lineWidth = 1
  ctx.strokeRect(1, 1, w - 2, h - 2)
  // grão
  for (let i = 0; i < 300; i++) {
    ctx.fillStyle = `rgba(90, 60, 0, ${0.02 + seeded(i) * 0.04})`
    ctx.fillRect(seeded(i + 8) * w, seeded(i + 9) * h, 1.2, 1.2)
  }
  // texto à mão — caneta escura, leve inclinação, várias linhas
  ctx.save()
  ctx.translate(w / 2, h / 2)
  ctx.rotate(-0.045)
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.font = '600 21px "Kalam", "Segoe Print", cursive'
  ctx.fillStyle = '#241a10'
  const lines = ['Quem mandar', 'R$25,00 ou +', 'terá o nome', 'assinado no', 'foguete!']
  const lineH = 33
  lines.forEach((ln, i) => {
    // passa de tinta + linha principal (caneta real)
    ctx.globalAlpha = 0.45
    ctx.fillText(ln, 1.2, -12 + i * lineH - 30 + 1.4)
    ctx.globalAlpha = 0.95
    ctx.fillText(ln, 0.6, -12 + i * lineH - 30 + 0.7)
    ctx.globalAlpha = 1
    ctx.fillText(ln, 0, -12 + i * lineH - 30)
  })
  // sublinhado manual em "foguete!"
  ctx.strokeStyle = '#241a10'
  ctx.lineWidth = 2.4
  ctx.globalAlpha = 0.9
  ctx.beginPath()
  ctx.moveTo(w / 2 - 40, 102)
  ctx.quadraticCurveTo(w / 2, 108, w / 2 + 40, 101)
  ctx.stroke()
  ctx.globalAlpha = 1
  ctx.restore()
  return makeTexture(canvas)
}

/* ------------------------------- parede ------------------------------- */

export function makeWallTexture(): THREE.CanvasTexture {
  const w = 512
  const h = 1024
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = '#2a2016'
  ctx.fillRect(0, 0, w, h)
  const g = ctx.createLinearGradient(0, 0, w, 0)
  g.addColorStop(0, 'rgba(0,0,0,0.42)')
  g.addColorStop(0.5, 'rgba(255, 210, 150, 0.06)')
  g.addColorStop(1, 'rgba(0,0,0,0.5)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, w, h)
  // rodapé simples na base da parede
  ctx.fillStyle = 'rgba(255, 210, 150, 0.05)'
  ctx.fillRect(0, 0, w, 60)
  ctx.strokeStyle = 'rgba(255, 200, 150, 0.1)'
  ctx.lineWidth = 2
  ctx.strokeRect(0, 58, w, 2)
  ctx.strokeStyle = 'rgba(40, 28, 18, 0.5)'
  ctx.lineWidth = 3
  ctx.strokeRect(0, 62, w, 3)
  // textura leve, quase imperceptível
  for (let i = 0; i < 700; i++) {
    ctx.fillStyle = `rgba(255, 220, 175,${0.015 + seeded(i) * 0.02})`
    ctx.fillRect(seeded(i) * w, seeded(i + 3) * h, 2, 1.6)
  }
  return makeTexture(canvas)
}

/* ------------------------------- QR (local) ------------------------------- */

/**
 * Desenha o QR do Pix em um <canvas> local a partir do payload real (ou da
 * chave quando ainda não existe payload). Retorna null quando nada é real —
 * o pedido de impressão mostra então um placeholder claro (§16).
 */
export async function drawQrToCanvas(canvas: HTMLCanvasElement, quietZone = 2): Promise<boolean> {
  const value = hasRealPixPayload(project.pix.payload) ? project.pix.payload!.trim() : ''
  if (!value) return false
  try {
    await QRCode.toCanvas(canvas, value, {
      margin: quietZone,
      width: canvas.width,
      errorCorrectionLevel: 'M',
      color: { dark: '#10120d', light: '#f5f1e6' },
    })
    return true
  } catch {
    return false
  }
}

/**
 * Folha A5 retrato impressa pela impressora: QR (se houver payload real)
 * centralizado com margem ampla + legenda. Quando ainda não há payload real,
 * um placeholder claro é impresso (§16) — nunca código inventado.
 */
export function makePrintPaperTexture(): THREE.CanvasTexture {
  const w = 384
  const h = 540
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')!

  // base de papel
  const base = makePaperTexture('light')
  ctx.drawImage(base.image as HTMLCanvasElement, 0, 0, w, h)

  // sombra de borda (papel não é um quadrado perfeito)
  const edge = ctx.createLinearGradient(0, 0, 0, h)
  edge.addColorStop(0, 'rgba(190,180,150,0.28)')
  edge.addColorStop(0.035, 'rgba(0,0,0,0)')
  edge.addColorStop(0.965, 'rgba(0,0,0,0)')
  edge.addColorStop(1, 'rgba(120,110,90,0.25)')
  ctx.fillStyle = edge
  ctx.fillRect(0, 0, w, h)

  const qrSize = 300
  const qx = (w - qrSize) / 2
  const qy = 104
  const qrCanvas = document.createElement('canvas')
  qrCanvas.width = qrSize
  qrCanvas.height = qrSize

  const tex = makeTexture(canvas)

  const hasQr = hasRealPixPayload(project.pix.payload)
  if (hasQr) {
    void drawQrToCanvas(qrCanvas, 4).then((ok) => {
      if (ok) {
        ctx.drawImage(qrCanvas, qx, qy, qrSize, qrSize)
        tex.needsUpdate = true
      }
    })
  } else {
    // placeholder: moldura tracejada + aviso claro
    ctx.fillStyle = '#f5f1e6'
    ctx.fillRect(qx, qy, qrSize, qrSize)
    ctx.strokeStyle = '#b0a894'
    ctx.setLineDash([12, 10])
    ctx.lineWidth = 4
    ctx.strokeRect(qx + 14, qy + 14, qrSize - 28, qrSize - 28)
    ctx.setLineDash([])
    ctx.fillStyle = '#3a3226'
    ctx.font = '600 26px "Space Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CHAVE PIX', w / 2, qy + qrSize / 2 - 16)
    ctx.fillText('A PUBLICAR', w / 2, qy + qrSize / 2 + 28)
  }

  // legenda do rodapé
  const beneficiary = isPlaceholderName(project.pix.beneficiary) ? '' : ` · ${project.pix.beneficiary}`
  ctx.fillStyle = '#2c2418'
  ctx.font = '700 17px "Space Mono", monospace'
  ctx.fillText('APOIO AO', w / 2, h - 58)
  ctx.fillText(`PROJETO ICARO${beneficiary}`, w / 2, h - 34)
  ctx.fillStyle = '#8a7f68'
  ctx.font = '700 12px "Space Mono", monospace'
  ctx.fillText('ESCANEIE PARA DOAR VIA PIX', w / 2, h - 14)

  return tex
}

function isPlaceholderName(name: string): boolean {
  return /projeto|exemplo|fulano|placeholder/i.test(String(name))
}

export function makePaperWithQr(width = 320, height = 320, quietZone = 2): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  if (hasRealPixPayload(project.pix.payload)) {
    void drawQrToCanvas(canvas, quietZone)
  } else {
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#f5f1e6'
    ctx.fillRect(0, 0, width, height)
    ctx.strokeStyle = '#b0a894'
    ctx.setLineDash([10, 8])
    ctx.lineWidth = 3
    ctx.strokeRect(24, 24, width - 48, height - 48)
    ctx.setLineDash([])
    ctx.fillStyle = '#3a3226'
    ctx.font = '600 22px "Space Mono", monospace'
    ctx.textAlign = 'center'
    ctx.fillText('CHAVE PIX', width / 2, height / 2 - 20)
    ctx.fillText('A PUBLICAR', width / 2, height / 2 + 20)
  }
  return makeTexture(canvas)
}