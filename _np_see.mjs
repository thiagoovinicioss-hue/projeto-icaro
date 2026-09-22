import { chromium } from 'playwright'
import { PNG } from 'pngjs'
import fs from 'fs'

const SHOT = '/tmp/opencode/np.png'
const load = (f) => { const p = PNG.sync.read(fs.readFileSync(f)); return { w: p.width, h: p.height, px: p.data } }
const at = (img, x, y) => { const i = (y * img.w + x) * 4; return [img.px[i], img.px[i + 1], img.px[i + 2]] }

const browser = await chromium.launch()
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } })
const page = await ctx.newPage()
await page.goto('http://localhost:5173/?debugOffice=1', { waitUntil: 'networkidle' })
const launchBtn = page.locator('.office-launch__button')
await launchBtn.waitFor({ state: 'attached', timeout: 20000 })
await launchBtn.evaluate((el) => el.scrollIntoView({ block: 'center' }))
for (let i = 0; i < 5 && !(await page.locator('.office-experience').count()); i++) {
  try { await launchBtn.click({ timeout: 5000 }) } catch (e) {}
  await page.waitForTimeout(1200)
}
await page.waitForTimeout(6000)
await page.screenshot({ path: SHOT })
const img = load(SHOT)
const cl = (r, g, b) => {
  const L = 0.2126 * r + 0.7152 * g + 0.0722 * b
  if (r > 90 && g > 78 && r - b >= 8 && Math.abs(r - g) < 48 && L > 60) return 'K'
  if (L < 62) return '.'
  if (L > 200) return 'W'
  return 'o'
}
const x0 = 400, x1 = 870, y0 = 585, y1 = 790
for (let y = y0; y <= y1; y += 3) {
  let line = ''
  for (let x = x0; x <= x1; x += 3) { const [r, g, b] = at(img, x, y); line += cl(r, g, b) }
  console.log(String(y).padStart(4) + ' ' + line)
}
await browser.close()