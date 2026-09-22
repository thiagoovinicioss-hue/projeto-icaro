import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import fs from 'fs'

const SHOT = '/tmp/opencode/qa-kb.png'
const load = (f) => { const p = PNG.sync.read(fs.readFileSync(f)); return { w: p.width, h: p.height, px: p.data } }
const at = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.px[i], img.px[i + 1], img.px[i + 2]] }
async function dbg(page) { try { return await page.locator('.office-debug code').innerText({ timeout: 2000 }) } catch { return '' } }
async function mode(page) { const m = (await dbg(page)).match(/MODE\s+(\S+)/); return m ? m[1] : '?' }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

console.log('· abrindo escritório')
await page.goto('http://localhost:5173/?debugOffice=1', { waitUntil: 'networkidle' })
const launchBtn = page.locator('.office-launch__button')
await launchBtn.waitFor({ state: 'attached', timeout: 20000 })
await launchBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
for (let i = 0; i < 5 && !(await page.locator('.office-experience').count()); i++) {
  try { await launchBtn.click({ timeout: 5000 }) } catch (e) { /* tenta de novo */ }
  await page.waitForTimeout(1200)
}
if (!(await page.locator('.office-experience').count())) { console.log('FALHA: escritório não abriu'); await browser.close(); process.exit(2) }
await page.waitForTimeout(6000)

let ok = true
const report = (id, pass, why) => { console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${why}`); if (!pass) ok = false }

const dump = await page.evaluate(async () => {
  const t0 = performance.now()
  while (!window.__officeScene && performance.now() - t0 < 5000) await new Promise((r) => setTimeout(r, 80))
  const scene = window.__officeScene
  if (!scene) return null
  scene.updateMatrixWorld(true)
  const V3 = scene.position.constructor
  const out = { capsCount: -1, chassis: null, deskTopY: 0 }
  const chips = []
  scene.traverse((m) => {
    if (!m.isMesh || !m.geometry) return
    if (!m.geometry.boundingBox) m.geometry.computeBoundingBox()
    const gb = m.geometry.boundingBox
    if (m.isInstancedMesh && m.count > 50) out.capsCount = m.count
    const bb = new V3(1e9, 1e9, 1e9), mx = new V3(-1e9, -1e9, -1e9)
    for (const [dx, dy, dz] of [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,1]]) {
      const c = new V3(dx ? gb.max.x : gb.min.x, dy ? gb.max.y : gb.min.y, dz ? gb.max.z : gb.min.z)
      c.applyMatrix4(m.matrixWorld)
      bb.min(c); mx.max(c)
    }
    chips.push({ hasVC: !!(m.geometry.attributes && m.geometry.attributes.color), hasMap: !!(m.material && m.material.map), w: mx.x - bb.x, h: mx.y - bb.y, d: mx.z - bb.z, ymin: bb.y, minX: bb.x, maxX: mx.x, maxZ: mx.z })
  })
  let best = 0
  for (const q of chips) if (q.h > 0.01 && q.h < 0.2 && q.w > 1 && q.d > 0.5 && q.ymin + 0.07 > best) best = Math.min(q.ymin + q.h, q.ymin + 0.2) // topo do tampo ≈ ymax da mesa
  out.deskTopY = +best.toFixed(4)
  const chassis = chips.filter((q) => q.hasVC && q.w > 0.4 && q.h < 0.2 && q.d > 0.12).sort((a, b) => b.w - a.w)[0]
  if (chassis) out.chassis = { min: chassis.ymin, w: +chassis.w.toFixed(3), h: +chassis.h.toFixed(3), hasMap: chassis.hasMap, maxX: +chassis.maxX.toFixed(4), minX: +chassis.minX.toFixed(4) }
  return out
})
if (!dump) { console.log('FALHA: sem __officeScene'); await browser.close(); process.exit(2) }
console.log('· caps =', dump.capsCount, ' chassis =', dump.chassis)

report('KB000', dump.capsCount >= 100, `teclas instanciadas = ${dump.capsCount} (esperado 104)`)
report('KB001', !!dump.chassis, `carcaça real (vertexColors+map) = ${!!dump.chassis}`)
report('KB002', !!dump.chassis && Math.abs(dump.chassis.min - dump.deskTopY) < 0.006, `carcaça assentada no tampo (ymin ${dump.chassis && dump.chassis.min} ≈ deskTop ${dump.deskTopY})`)
report('KB003', !!dump.chassis && dump.chassis.w >= 0.43 && dump.chassis.w <= 0.5, `largura full-size ${dump.chassis && dump.chassis.w}m (43..50cm)`)
report('KB005', !!dump.chassis && dump.chassis.h >= 0.025 && dump.chassis.h <= 0.06, `altura da carcaça ${dump.chassis && dump.chassis.h}m (25..60mm)`)

// entrada no mundo real
const world = await page.evaluate(async () => {
  const scene = window.__officeScene
  scene.updateMatrixWorld(true)
  const V3 = scene.position.constructor
  const M4 = scene.matrixWorld.constructor
  const caps = (() => { let c; scene.traverse((m) => { if (m.isInstancedMesh && m.count > 50) c = m }); return c })()
  if (!caps) return null
  const m4 = new M4()
  const v = new V3()
  const local = []
  const wmin = [1e9, 1e9, 1e9], wmax = [-1e9, -1e9, -1e9]
  for (let i = 0; i < caps.count; i++) {
    caps.getMatrixAt(i, m4)
    v.set(0, 0, 0).applyMatrix4(m4)
    local.push([v.x, v.z, v.y])
    v.set(0, 0, 0).applyMatrix4(m4).applyMatrix4(caps.matrixWorld)
    for (let k = 0; k < 3; k++) { if (v.getComponent(k) < wmin[k]) wmin[k] = v.getComponent(k); if (v.getComponent(k) > wmax[k]) wmax[k] = v.getComponent(k) }
  }
  const n = local.length
  const centerWorld = [(wmin[0] + wmax[0]) / 2, (wmin[1] + wmax[1]) / 2, (wmin[2] + wmax[2]) / 2]
  // ñ caractérisé clusters no frame LOCAL
  const cluster = (fx, fz) => local.filter((p) => fx(p[0]) && fz(p[1])).length
  return {
    n,
    yMax: +wmax[1].toFixed(4),
    yMin: +wmin[1].toFixed(4),
    yTopCap: +Math.max(...local.map((p) => p[2])).toFixed(4),
    local,
    centerWorld,
    wmin: wmin.map((q) => +q.toFixed(4)),
    wmax: wmax.map((q) => +q.toFixed(4)),
    funRow: cluster(() => true, (z) => z < -0.055),
    numpad: cluster((x) => x > 0.1, () => true),
    arrows: cluster((x) => x > 0.06 && x < 0.17, (z) => z > 0.035),
    frontRowTop: +Math.max(...local.filter((p) => p[1] > 0.055).map((p) => p[2] + 0.0108)).toFixed(4),
  }
})
console.log('· world:', JSON.stringify(world))
report('KB020', !!world && world.n >= 100, `total de teclas = ${world && world.n}`)
report('KB021', !!world && world.funRow >= 13, `fileira de função (16 teclas + gap) = ${world && world.funRow}`)
report('KB022', !!world && world.numpad >= 16, `cluster numérico (17 teclas, direita) = ${world && world.numpad}`)
report('KB023', !!world && world.arrows >= 4, `setas em T invertido = ${world && world.arrows}`)
report('KB024', !!world && world.frontRowTop - 0.016 > 0.005, `topo da fileira frontal (${world && world.frontRowTop}m) elevado sobre o aro (0.016m)`)

// separação do mouse (corpo + sombras; exclui o cabo que serpenteia até o CRT)
let mouseVerts = null
const sep = await page.evaluate(() => {
  const scene = window.__officeScene
  let hit = null
  scene.traverse((m) => {
    if (m.isMesh && m.geometry && !m.isInstancedMesh) {
      m.geometry.computeBoundingBox()
      const gb = m.geometry.boundingBox
      if (gb.max.x - gb.min.x > 0.01 && gb.max.x - gb.min.x < 0.2 && gb.max.y - gb.min.y >= 0.0 && gb.max.y - gb.min.y < 0.2 && (gb.max.z - gb.min.z) < 0.3) {
        const V3 = scene.position.constructor
        const bb = new V3(1e9, 1e9, 1e9), mx = new V3(-1e9, -1e9, -1e9)
        for (const [dx, dy, dz] of [[0,0,0],[1,0,0],[0,1,0],[0,0,1],[1,1,1]]) {
          const c = new V3(dx ? gb.max.x : gb.min.x, dy ? gb.max.y : gb.min.y, dz ? gb.max.z : gb.min.z)
          c.applyMatrix4(m.matrixWorld)
          bb.min(c); mx.max(c)
        }
        // região do mouse (layout atual: x≈0.34..0.41, z≈0.27..0.38).
// ignora planos de sombra de contato (quase zero de espessura no mundo)
        if (bb.x > 0.25 && bb.x < 0.55 && bb.z > 0.15 && bb.z < 0.55 && mx.y > 0.03 && mx.y < 0.4 && mx.y - bb.y > 0.01) {
          if (!hit || bb.x < hit.min.x) hit = { min: [bb.x, bb.y, bb.z].map((q) => +q.toFixed(4)), max: [mx.x, mx.y, mx.z].map((q) => +q.toFixed(4)) }
        }
      }
    }
  })
  return hit
})
mouseVerts = sep
const kbCapsRight = world.wmax[0]
const kbChassisRight = dump.chassis ? dump.chassis.maxX : kbCapsRight
const mouseLeftWorld = mouseVerts ? mouseVerts.min[0] : 1e9
const gapCaps = mouseLeftWorld >= 1e9 ? -1 : +(mouseLeftWorld - kbCapsRight).toFixed(3)
const gapChassis = mouseLeftWorld >= 1e9 ? -1 : +(mouseLeftWorld - kbChassisRight).toFixed(3)
console.log('· mouse esquerda=', mouseLeftWorld, ' teclado: borda-caraca=', kbChassisRight, ' borda-cap=', kbCapsRight, ' gaps=', gapChassis, '/', gapCaps)
report('KB010', gapChassis >= 0.015 && gapChassis <= 0.07 && gapCaps > 0, `gap teclado(caixa)↔mouse = ${gapChassis}m · borda-tecla↔mouse = ${gapCaps}m`)

await page.screenshot({ path: SHOT })
const img = load(SHOT)
console.log('   screenshot', img.w, 'x', img.h)

function classify(r, g, b) {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (L > 240 && r > 235 && g > 235 && b > 235) return 'white'
  if (r > 90 && g > 78 && r - b >= 8 && Math.abs(r - g) < 48 && r < 238 && L > 60) return 'bege'
  if (L < 62) return 'dark'
  return 'mid'
}
function countTransitions(x0, x1, y) {
  let prev = null, t = 0
  for (let x = Math.max(0, x0); x < Math.min(img.w, x1); x += 2) {
    const [r, g, b] = at(img, x, y)
    const c = classify(r, g, b)
    if (c === 'bege' || c === 'dark') {
      if (prev !== null && prev !== c) t++
      prev = c
    }
  }
  return t
}
// caça a faixa do teclado: de baixo para cima (o teclado ocupa o plano frontal),
// linha-massa bege com vãos escuros entre teclas e repetição de fileiras
let band = null
for (let y = img.h - 4; y >= Math.round(img.h * 0.5) && !band; y -= 2) {
  let left = null, right = null
  for (let x = 0; x < img.w; x++) {
    const [r, g, b] = at(img, x, y)
    if (classify(r, g, b) === 'bege') { if (left === null) left = x; right = x }
  }
  if (!left || right - left < 350) continue
  const cut = (x0, x1, y0, y1) => {
    let nBege = 0, nDark = 0, n = 0
    for (let yy = y0; yy <= y1; yy += 2) for (let x = x0; x <= x1; x += 2) {
      const [r, g, b] = at(img, x, yy)
      n++
      const c = classify(r, g, b)
      if (c === 'bege') nBege++
      else if (c === 'dark') nDark++
    }
    return n ? { bege: nBege / n, dark: nDark / n } : null
  }
  const Kfull = cut(left + 30, right - 30, y - 55, y + 3)
  // repetição de fileiras: máx. de transições numa linha acima da fileira frontal
  let trans = 0
  for (let yy = y - 55; yy <= y - 12; yy += 12) trans = Math.max(trans, countTransitions(left + 60, right - 60, yy))
  if (Kfull && Kfull.bege > 0.3 && Kfull.dark > 0.02 && Kfull.dark < 0.35 && trans >= 5) {
    band = { y, left, right, w: right - left, K: Kfull, trans }
  }
}
if (!band) { console.log('FALHA: faixa do teclado não detectada'); await browser.close(); process.exit(2) }
console.log('· faixa teclado: y=', band.y, 'x=[', band.left, band.right, ']', 'bege=', (band.K.bege * 100) | 0, 'vãos=', (band.K.dark * 100).toFixed(1))
report('KB030', band.w > 350, `faixa do teclado no quadro (${band.w}px largura)`)
report('KB040', band.K.bege > 0.35, `bege dominante = ${(band.K.bege * 100) | 0}%`)
report('KB041', (() => { const px = at(img, Math.round((band.left + band.right) / 2), band.y - 10); const c = classify(px[0], px[1], px[2]); return c !== 'white' && c === 'bege' })(), `NÃO é um retângulo branco (centro = ${(() => { const px = at(img, Math.round((band.left + band.right) / 2), band.y - 10); return classify(px[0], px[1], px[2]) })()})`)
report('KB042', band.K.dark > 0.025, `vãos escuros entre teclas = ${(band.K.dark * 100).toFixed(1)}% (teclas reconhecíveis)`)

// numpad: as fileiras do bloco da direita criam vãos visíveis em varredura
// VERTICAL — transições cap↔vão (K↔não-K) ao descer por uma coluna
function isCap(r, g, b) {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return r > 90 && g > 78 && r - b >= 8 && Math.abs(r - g) < 48 && L > 60
}
function countTransitionsVert(x, y0, y1) {
  let prev = null, t = 0
  for (let y = y0; y <= y1; y += 2) {
    const [r, g, b] = at(img, x, y)
    const c = isCap(r, g, b)
    if (prev !== null && prev !== c) t++
    prev = c
  }
  return t
}
let npTrans = 0
for (let x = band.right - Math.round(band.w * 0.24); x <= band.right - 20; x += 3) npTrans = Math.max(npTrans, countTransitionsVert(x, band.y - 75, band.y + 2))
console.log('   numpad(direita): transições verticais do bloco =', npTrans)
report('KB043', npTrans >= 4 && band.K.bege > 0.3, `numpad à direita com vãos verticais (${npTrans} transições)`)

// interações não regrediram: pointer no mouse → computer → ESC
async function waitMode(want, ms = 60000) {
  const t0 = Date.now()
  while (Date.now() - t0 < ms) { if ((await mode(page)) === want) return true; await page.waitForTimeout(600) }
  return (await mode(page)) === want
}
let MOUSE = null
outer:
for (const p of [[925,650],[905,640],[950,660],[975,655],[915,665],[960,690],[935,670],[985,675],[945,635],[970,625]]) {
  await page.mouse.move(p[0], p[1]); await page.waitForTimeout(250)
  if ((await page.evaluate(() => document.querySelector('canvas')?.style.cursor || '')) === 'pointer') { MOUSE = { x: p[0], y: p[1] }; break outer }
}
if (MOUSE) {
  let entered = false
  for (let i = 0; i < 3 && !entered; i++) {
    await page.mouse.click(MOUSE.x, MOUSE.y)
    entered = await waitMode('computer', 8000)
  }
  report('KB050', entered, `clique no mouse → computer`)
  await page.keyboard.press('Escape')
  report('KB051', await waitMode('ambient', 30000), `ESC → ambient`)
} else {
  report('KB050', false, 'mouse físico não encontrado (interação quebrada?)')
}

if (errs.length) { console.log('· erros:'); for (const e of errs.slice(0, 8)) console.log('   ', e) }
console.log()
console.log(ok ? 'TODOS PASS' : 'HÁ FALHAS')
await browser.close()
process.exit(ok ? 0 : 2)