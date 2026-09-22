import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import fs from 'fs'

const PIXKEY = '44988061945'
const SHOT = '/tmp/opencode/qa-crt.png'
const load = (f) => { const p = PNG.sync.read(fs.readFileSync(f)); return { w: p.width, h: p.height, px: p.data } }
const at = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.px[i], img.px[i + 1], img.px[i + 2]] }
async function dbg(page) { try { return await page.locator('.office-debug code').innerText({ timeout: 2000 }) } catch { return '' } }
async function mode(page) { const m = (await dbg(page)).match(/MODE\s+(\S+)/); return m ? m[1] : '?' }
async function cursor(page) { const m = (await dbg(page)).match(/CURSOR\s+([0-9.]+)\s*,\s*([0-9.]+)/); return m ? { x: +m[1], y: +m[2] } : null }
async function waitMode(page, want, ms = 60000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { if ((await mode(page)) === want) return true; await page.waitForTimeout(1500) } return (await mode(page)) === want }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, permissions: ['clipboard-read', 'clipboard-write'] })
const page = await ctx.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
page.on('console', (m) => { if (m.type() === 'error') errs.push('console: ' + m.text()) })

console.log('· abrindo escritório')
await page.goto('http://localhost:5173/?debugOffice=1', { waitUntil: 'networkidle' })
await page.locator('.office-launch__button').click()
await page.waitForTimeout(7000)

let MOUSE = null
outer:
for (const p of [[925,650],[950,660],[960,690],[935,670],[915,665]]) {
  await page.mouse.move(p[0], p[1]); await page.waitForTimeout(900)
  if ((await page.evaluate(() => document.querySelector('canvas')?.style.cursor || '')) === 'pointer') { MOUSE = { x: p[0], y: p[1] }; break outer }
}
console.log('· mouse físico:', MOUSE)
if (!MOUSE) { console.log('FALHA: mouse não encontrado'); await browser.close(); process.exit(2) }
await page.mouse.click(MOUSE.x, MOUSE.y)
console.log('· modo computador:', await waitMode(page, 'computer', 60000))

const q = await page.evaluate(() => {
  const cam = window.__officeCam, m = window.paperOffice && window.paperOffice.screenMesh
  if (!cam || !m) return null
  cam.updateMatrixWorld()
  const V = m.position.constructor
  const proj = (x, y, z) => { const v = new V(x, y, z); v.applyMatrix4(m.matrixWorld); v.project(cam); return { x: (v.x + 1) / 2 * innerWidth, y: (1 - v.y) / 2 * innerHeight } }
  m.geometry.computeBoundingBox(); const bb = m.geometry.boundingBox
  return { tl: proj(bb.min.x, bb.max.y, 0), tr: proj(bb.max.x, bb.max.y, 0), bl: proj(bb.min.x, bb.min.y, 0), br: proj(bb.max.x, bb.min.y, 0) }
})
if (!q) { console.log('FALHA: sem câmera/mesh'); await browser.close(); process.exit(2) }
const P = (u, v) => ({
  x: (1 - u) * (1 - v) * q.tl.x + u * (1 - v) * q.tr.x + (1 - u) * v * q.bl.x + u * v * q.br.x,
  y: (1 - u) * (1 - v) * q.tl.y + u * (1 - v) * q.tr.y + (1 - u) * v * q.bl.y + u * v * q.br.y,
})
console.log('· tela UV(0,0)=', P(0, 0).x | 0, P(0, 0).y | 0, ' UV(1,1)=', P(1, 1).x | 0, P(1, 1).y | 0)

await page.mouse.move(Math.round(P(0.5, 0.5).x), Math.round(P(0.5, 0.5).y)); await page.waitForTimeout(1500)
await page.screenshot({ path: SHOT })
const img = load(SHOT)

let ok = true
const report = (id, pass, why) => { console.log(`${pass ? 'PASS' : 'FAIL'}  ${id}  ${why}`); if (!pass) ok = false }

// amostra uma faixa em espaço UV e devolve frações por classe
function bandPixels(u0, u1, v0, v1, nu = 24, nv = 10) {
  const px = []
  for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
    const p = P(u0 + (u1 - u0) * i / nu, v0 + (v1 - v0) * j / nv)
    const x = Math.round(p.x), y = Math.round(p.y)
    if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue
    px.push(at(img, x, y))
  }
  let green = 0, beige = 0, dark = 0, bright = 0, blue = 0, orange = 0, lum = 0
  for (const [r, g, b] of px) {
    const L = 0.2126 * r + 0.7152 * g + 0.0722 * b; lum += L
    if (g > 20 && g - r >= 5 && g - b >= 5) green++
    if (r > 90 && g > 78 && r - b >= 12 && Math.abs(r - g) < 42) beige++
    if (b > 60 && b - r >= 15 && b - g >= 8) blue++
    if (r > 110 && r - b >= 45 && g - b >= 15 && r - g >= 18) orange++
    if (L < 55) dark++
    if (L > 150) bright++
  }
  const n = px.length || 1
  return { n, green: green / n, beige: beige / n, dark: dark / n, bright: bright / n, blue: blue / n, orange: orange / n, lum: lum / n }
}

// fósforo na tela (margem interna)
const scr = bandPixels(0.08, 0.92, 0.14, 0.86)
console.log('   tela:', JSON.stringify({ green: +scr.green.toFixed(2), dark: +scr.dark.toFixed(2), bright: +scr.bright.toFixed(2), lum: scr.lum | 0 }))
report('IV000', scr.green > 0.25 || (scr.dark > 0.5 && scr.bright > 0.03), `fósforo verde=${(scr.green * 100) | 0}% escuro=${(scr.dark * 100) | 0}% brilho=${(scr.bright * 100) | 0}%`)

// moldura bege em volta (topo/esquerda/baixo); direita é o painel grafite
const top = bandPixels(0.05, 0.95, -0.17, -0.03)
const left = bandPixels(-0.11, -0.02, 0.05, 0.95)
const bottom = bandPixels(0.05, 0.95, 1.03, 1.20)
const right = bandPixels(1.13, 1.42, 0.15, 0.85)
for (const [k, v] of Object.entries({ top, left, bottom, right })) console.log(`   moldura[${k}]: bege=${(v.beige * 100) | 0}% escuro=${(v.dark * 100) | 0}% lum=${v.lum | 0}`)
report('IV001_top', top.beige > 0.35, `bege topo=${(top.beige * 100) | 0}%`)
report('IV001_left', left.beige > 0.25, `bege esquerda=${(left.beige * 100) | 0}%`)
report('IV001_bottom', bottom.beige > 0.35, `bege base=${(bottom.beige * 100) | 0}%`)
report('IV002_panel', right.beige < 0.35, `painel (direita) bege=${(right.beige * 100) | 0}% escuro=${(right.dark * 100) | 0}%`)

// adesivo OBAFOG no canto frontal inferior esquerdo (uv ~ (0, 1.22))
{
  const sc = P(0.0, 1.22)
  let blue = 0, orange = 0, n = 0
  for (let y = Math.round(sc.y) - 32; y <= Math.round(sc.y) + 32; y++) {
    for (let x = Math.round(sc.x) - 70; x <= Math.round(sc.x) + 70; x++) {
      if (x < 0 || y < 0 || x >= img.w || y >= img.h) continue
      const [r, g, b] = at(img, x, y); n++
      if (b > 50 && b - r > 5 && b - g > 2) blue++
      if (r > 120 && r - b > 40 && r - g > 18) orange++
    }
  }
  report('IV005', blue > 30 && orange > 50, `adesivo: azul=${blue} laranja=${orange} (n=${n})`)
}

// interação: mirar COPIAR (uv 0.28, 0.767) e clicar
const c = P(0.28, 0.767)
const cx = Math.round(c.x), cy = Math.round(c.y)
await page.mouse.move(cx, cy)
let near = null
for (let i = 0; i < 10; i++) { await page.waitForTimeout(500); const cur = await cursor(page); if (cur && near && Math.abs(cur.x - near.x) < 1e-3 && Math.abs(cur.y - near.y) < 1e-3) break; near = cur }
report('IV020', !!near && Math.abs(near.y - 0.767) < 0.06, `mirar (${cx},${cy}) → uv(${near ? near.x.toFixed(2) + ',' + near.y.toFixed(2) : '?'})`)
await page.mouse.click(cx, cy); await page.waitForTimeout(2200)
let clip = ''
try { clip = await page.evaluate(() => navigator.clipboard.readText()) } catch (e) { clip = 'ERR ' + e.message.split('\n')[0] }
report('IV030', clip === PIXKEY, `COPIAR → "${clip}"`)

await page.keyboard.press('Escape')
report('IV040', await waitMode(page, 'ambient', 60000), 'ESC → ambiente')

if (errs.length) { console.log('· erros:'); for (const e of errs.slice(0, 10)) console.log('   ', e) }
console.log(); console.log(ok ? 'TODOS PASS' : 'HÁ FALHAS')
await browser.close()
process.exit(ok ? 0 : 2)
