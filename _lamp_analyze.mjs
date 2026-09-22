import { PNG } from 'pngjs'
import fs from 'fs'

const SHOT = process.argv[2] || '/tmp/opencode/lamp-shot.png'
const img = PNG.sync.read(fs.readFileSync(SHOT))
const W = img.width, H = img.height
const at = (x, y) => { const i = (y * W + x) * 4; return [img.data[i], img.data[i + 1], img.data[i + 2]] }
const lum = ([r, g, b]) => 0.2126 * r + 0.7152 * g + 0.0722 * b

let fail = 0
const report = (id, pass, why) => { console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${why}`); if (!pass) fail++ }

// A) BASE — faixa larga e escura na região x150..520, y560..700
{
  const X0 = 150, X1 = 520, Y0 = 560, Y1 = 700
  let n = 0, xmin = 1e9, xmax = -1e9, ymax = -1e9
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const [r, g, b] = at(x, y)
    const L = lum([r, g, b])
    // bronze escuro aquecido: r>g>b, L entre ~25 e 90
    if (r > 25 && r < 130 && r > g && g > b && L > 22 && L < 95) { n++; if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y > ymax) ymax = y }
  }
  const w = xmax - xmin
  report('BAS_base_banda_larga', n > 3000 && w > 220, `bronze base n=${n} largura≈${w}px`)
  // linha de contato: sombra logo abaixo da base (clara no piso iluminado?)
  report('BAS_base_tocha_visual', w > 220, `extensão da base ${w}px (coluna deve ser << isto)`)
}

// B) COLUNA — faixa vertical fina de metal escuro em x300..400, y80..560
{
  const X0 = 300, X1 = 400, Y0 = 80, Y1 = 560
  let n = 0, xmin = 1e9, xmax = -1e9
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const [r, g, b] = at(x, y)
    const L = lum([r, g, b])
    if (r > 20 && r < 120 && r > g && g > b && L > 18 && L < 85) { n++; if (x < xmin) xmin = x; if (x > xmax) xmax = x }
  }
  const w = xmax - xmin
  report('COL_coluna_fina', n > 200 && w < 60, `coluna: n=${n} largura≈${w}px (delgada)`)
}

// C) CÚPULA — massa creme com interior quente e aro de latão na boca
{
  const X0 = 640, X1 = 880, Y0 = 200, Y1 = 590
  let cream = 0, warm = 0, brass = 0
  let xmin = 1e9, xmax = -1e9, ymin = 1e9, ymax = -1e9
  const warmPts = []
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const [r, g, b] = at(x, y)
    const L = lum([r, g, b])
    const warmish = r > g && g > b
    if (warmish && r > 130 && L > 60) {
      if (x < xmin) xmin = x; if (x > xmax) xmax = x; if (y < ymin) ymin = y; if (y > ymax) ymax = y
      cream++
      if (r > g + 40) { warm++; warmPts.push({ x, y }) }
    }
    // latão: r>g>b, médio, saturação maior que a madeira (madeira quente sim, mas fraca)
    if (r > 70 && r < 180 && r > g + 8 && g > b + 4 && L > 28 && L < 120 && !(r > 140 && g > 110)) brass++
  }
  const cw = xmax - xmin, ch = ymax - ymin
  report('CUP_creme_corpo', cream > 6000, `creme n=${cream} bbox ${cw}x${ch}px`)
  report('CUP_interior_quente', warm > 120, `interior emissivo n=${warm} (cavidade acesa)`)
  // centro do quente dentro da massa creme (não na borda)
  if (warmPts.length) {
    const cx = warmPts.reduce((a, p) => a + p.x, 0) / warmPts.length
    const cy = warmPts.reduce((a, p) => a + p.y, 0) / warmPts.length
    const inX = cx > xmin + cw * 0.15 && cx < xmin + cw * 0.85
    const inY = cy > ymin + ch * 0.25 && cy < ymin + ch * 0.85
    report('CUP_luz_origina_de_dentro', inX && inY, `centro quente (${cx|0},${cy|0}) no interior (bbox ${xmin|0},${ymin|0}..${xmax|0},${ymax|0})`)
  } else report('CUP_luz_origina_de_dentro', false, 'sem pixels quentes')
  report('CUP_aro_latao', brass > 40, `latão na boca n=${brass}`)
}

// D) Silhueta da boca NÃO ser reta: curvatura da aresta inferior do creme
{
  const X0 = 640, X1 = 880, Y0 = 200, Y1 = 590
  const bottomMost = []
  for (let x = X0; x < X1; x++) {
    let lastY = -1
    for (let y = Y0; y < Y1; y++) {
      const [r, g, b] = at(x, y)
      if (r > 120 && r > g && g > b && lum([r, g, b]) > 55) lastY = y
    }
    if (lastY > 0) bottomMost.push({ x, y: lastY })
  }
  if (bottomMost.length > 10) {
    const ys = bottomMost.map((p) => p.y)
    const vy = Math.max(...ys) - Math.min(...ys)
    // uma boca circular vista em perspectiva tem > 8px de "dip" entre centro e laterais
    const xs = bottomMost.map((p) => p.x)
    report('BOC_curvatura_abertura', vy > 8, `curvatura da aresta inferior = ${vy}px (reta ⇒ cone)`)

    // perfil: descrever formato da curva (centro mais baixo que laterais = arco de boca)
    const xm = (Math.min(...xs) + Math.max(...xs)) / 2
    const centerRow = bottomMost.filter((p) => Math.abs(p.x - xm) < 12)
    const edgeL = bottomMost.filter((p) => p.x < xm - (Math.max(...xs) - Math.min(...xs)) * 0.3)
    const edgeR = bottomMost.filter((p) => p.x > xm + (Math.max(...xs) - Math.min(...xs)) * 0.3)
    const mean = (a) => a.reduce((s, p) => s + p.y, 0) / a.length
    if (centerRow.length && edgeL.length && edgeR.length) {
      const cm = mean(centerRow), el = mean(edgeL), er = mean(edgeR)
      const dip = cm - (el + er) / 2
      report('BOC_arco_3d', Math.abs(dip) > 4, `centro ${cm|0} vs bordas ${el|0}/${er|0} → dip=${dip|0}px (curva convexa = boca real)`)
    }
  }
}

// E) Fonte de luz de dentro p/ fora: gradiente de brilho na boca (interior mais claro que o batente)
{
  const X0 = 700, X1 = 800, Y0 = 430, Y1 = 560
  let hi = 0, mid = 0, lo = 0, total = 0
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const L = lum(at(x, y)); total++
    if (L > 170) hi++; else if (L > 100) mid++; else lo++
  }
  report('LUX_interior_rebate_luz', hi > total * 0.05, `boca: brilho alto ${hi} / médio ${mid} / baixo ${lo}`)
}

console.log()
console.log(fail ? `${fail} checagem(ns) falharam` : 'TODAS AS CHECAGENS PASSARAM')
process.exit(fail ? 2 : 0)