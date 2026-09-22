import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import fs from 'fs'

const PIXKEY = '44988061945'

function loadPixels(file) {
  const png = PNG.sync.read(fs.readFileSync(file))
  return { w: png.width, h: png.height, px: png.data }
}

async function dbgLines(page) {
  try { return await page.locator('.office-debug code').innerText({ timeout: 3000 }) } catch { return '' }
}
async function debugMode(page) {
  const m = (await dbgLines(page)).match(/MODE\s+(\S+)/)
  return m ? m[1] : '?'
}
async function dbgCursor(page) {
  const m = (await dbgLines(page)).match(/CURSOR\s+([0-9.]+)\s*,\s*([0-9.]+)/)
  return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null
}
async function waitMode(page, want, timeoutMs = 60000) {
  const t0 = Date.now()
  while (Date.now() - t0 < timeoutMs) {
    if ((await debugMode(page)) === want) return true
    await page.waitForTimeout(2000)
  }
  return (await debugMode(page)) === want
}
async function sampleUV(page, x, y) {
  await page.mouse.move(x, y)
  await page.waitForTimeout(1800)
  return await dbgCursor(page)
}

function beigeRatio(img, x0, y0, x1, y1) {
  let beige = 0, total = 0, lum = 0
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const i = (y * img.w + x) * 4
      const r = img.px[i], g = img.px[i + 1], b = img.px[i + 2]
      lum += 0.2126 * r + 0.7152 * g + 0.0722 * b
      if (r > 95 && g > 85 && b < 240 && r > b) beige++
      total++
    }
  }
  return { beige, total, lum: lum / total }
}

const SCR_GUESS = { x0: 782, y0: 82, x1: 1154, y1: 384 }
const MOUSE = { x: 636, y: 628 }
const COPY_UV = { x: 0.25, y: 0.729 }

const browser = await chromium.launch()
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 800 },
  permissions: ['clipboard-read', 'clipboard-write'],
})
const page = await ctx.newPage()
page.on('pageerror', (e) => console.log('PAGE-EXC:', e.message))

console.log('· abrindo escritório')
await page.goto('http://localhost:5173/?debugOffice=1', { waitUntil: 'networkidle' })
await page.locator('.office-launch__button').waitFor({ state: 'attached', timeout: 20000 })
await page.locator('.office-launch__button').click()
try { await page.locator('.office-experience').waitFor({ state: 'visible', timeout: 15000 }) } catch (e) { console.log('no office:', e.message.split('\n')[0]) }
await page.waitForTimeout(7000)
await page.screenshot({ path: '/tmp/opencode/v3-crt.png' })
const img = loadPixels('/tmp/opencode/v3-crt.png')

let ok = true
const report = (id, pass, why) => {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${why}`)
  if (!pass) ok = false
}

// tela fósforo (média verde na área projetada)
let green = 0
for (let y = SCR_GUESS.y0; y <= SCR_GUESS.y1; y++) {
  for (let x = SCR_GUESS.x0; x <= SCR_GUESS.x1; x++) {
    const i = (y * img.w + x) * 4
    const r = img.px[i], g = img.px[i + 1], b = img.px[i + 2]
    if (g > 35 && g > r * 1.15 && g > b * 1.15) green++
  }
}
report('IV000', green > 600, `pixels fósforo na tela = ${green}`)

// moldura bege: faixas ao redor da tela
const bands = {
  totop: beigeRatio(img, 760, 8, 1180, 66),
  esqr: beigeRatio(img, 738, 82, 780, 384),
  dirr: beigeRatio(img, 1156, 82, 1190, 384),
  queixo: beigeRatio(img, 790, 386, 1150, 458),
}
for (const [k, v] of Object.entries(bands)) {
  const ratio = v.beige / v.total
  console.log(`   bezel[${k}]: ${((ratio * 100) | 0)}% bege, lum=${v.lum.toFixed(0)}`)
  report(`IV001_${k}`, ratio > 0.5, `faixa ${k} da moldura`)
}

// mouse
let mouseLum = 0, mouseBeige = 0
for (let y = MOUSE.y - 24; y <= MOUSE.y + 24; y++) {
  for (let x = MOUSE.x - 24; x <= MOUSE.x + 24; x++) {
    const i = (y * img.w + x) * 4
    const r = img.px[i], g = img.px[i + 1], b = img.px[i + 2]
    mouseLum += 0.2126 * r + 0.7152 * g + 0.0722 * b
    if (r > 95 && g > 85 && b < 240 && r > b) mouseBeige++
  }
}
mouseLum /= 49 * 49
report('IV003', mouseLum > 110, `mouse iluminado lum=${mouseLum.toFixed(0)} beige=${mouseBeige}`)

/* entrar no computador */
await page.mouse.move(MOUSE.x, MOUSE.y)
await page.waitForTimeout(1500)
const pointer = await page.evaluate(() => (document.querySelector('canvas')?.style.cursor) || '')
report('IV010', pointer === 'pointer', `cursor DOM pointer ("${pointer}")`)
await page.mouse.click(MOUSE.x, MOUSE.y)
report('IV020', await waitMode(page, 'computer', 60000), 'clique → modo computador')

/* ---- calibração empírica: coluna central + linha central ---- */
const COLX = 900
const ys = [95, 130, 165, 200, 235, 270, 305, 340, 375]
const usY = []
for (const y of ys) {
  const uv = await sampleUV(page, COLX, y)
  if (uv) usY.push({ p: y, u: uv.y })
}
const xs = [795, 830, 865, 900, 935, 970, 1005, 1040, 1075, 1110, 1145]
const usX = []
for (const x of xs) {
  const uv = await sampleUV(page, x, 230)
  if (uv) usX.push({ p: x, u: uv.x })
}
console.log('   calibração X:', usX.map((o) => `${o.p}=${o.u.toFixed(2)}`).join(' '))
console.log('   calibração Y:', usY.map((o) => `${o.p}=${o.u.toFixed(2)}`).join(' '))
const fit = (arr, want) => {
  if (arr.length < 2) return null
  let s1 = 0, sp = 0, su = 0, spp = 0
  for (const o of arr) { s1++; sp += o.p; su += o.u; spp += o.p * o.p }
  const a = (s1 * arr.reduce((s, o) => s + o.p * o.u, 0) - sp * su) / (s1 * spp - sp * sp)
  const b = (su - a * sp) / s1
  return (want - b) / a
}

/* ---- mirar no COPIAR (uv 0.25, 0.729) ---- */
let cx
if (fit(usX, COPY_UV.x) && fit(usY, COPY_UV.y)) {
  cx = Math.round(fit(usX, COPY_UV.x))
} else {
  const uv0 = await dbgCursor(page)
  cx = Math.round(COLX + (COPY_UV.x - (uv0?.x ?? 0.5)) * 340)
}
const cyX = Math.round(fit(usY, COPY_UV.y)) 
const cy = cyX || Math.round(230 + (COPY_UV.y - 0.5) * 290)
let near = null
for (let i = 0; i < 4; i++) {
  await page.mouse.move(cx, cy)
  await page.waitForTimeout(1100)
  near = await dbgCursor(page)
  if (near && Math.abs(near.y - COPY_UV.y) < 0.06) break
}
report('IV021', near && Math.abs(near.y - COPY_UV.y) < 0.06 && near.x > 0.05 && near.x < 0.45,
  `mirado em (${cx},${cy}) → uv(${near ? near.x.toFixed(3) + ',' + near.y.toFixed(3) : '?'})`)

/* seta virtual */
await page.screenshot({ path: '/tmp/opencode/v3-cursor.png' })
const cur = loadPixels('/tmp/opencode/v3-cursor.png')
let arrMax = 0
for (let y = Math.max(0, cy - 30); y <= Math.min(799, cy + 40); y++) {
  for (let x = Math.max(0, cx - 30); x <= Math.min(1279, cx + 40); x++) {
    const i = (y * cur.w + x) * 4
    arrMax = Math.max(arrMax, cur.px[i], cur.px[i + 1], cur.px[i + 2])
  }
}
report('IV030', arrMax > 118, `seta virtual na tela (máx. claro perto do cursor = ${arrMax})`)

/* copiar */
await page.mouse.click(cx, cy)
await page.waitForTimeout(3000)
let clip = ''
try { clip = await page.evaluate(() => navigator.clipboard.readText()) } catch (e) { console.log('  (clipboard:', e.message.split('\n')[0], ')') }
report('IV040', clip === PIXKEY, `COPIAR → clipboard "${clip}"`)

await page.keyboard.press('Escape')
report('IV050', await waitMode(page, 'ambient', 60000), 'ESC → ambiente')

console.log()
console.log(ok ? 'TODOS PASS' : 'HÁ FALHAS')
await browser.close()
process.exit(ok ? 0 : 2)