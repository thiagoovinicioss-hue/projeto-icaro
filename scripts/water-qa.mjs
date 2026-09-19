import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'

const step = Number(process.env.STEP ?? 8)
const mobile = process.env.MOBILE === '1'
const clean = process.env.CLEAN === '1'
const dir = `/tmp/opencode/${process.env.TAKE ?? 'rebuild'}-${clean ? 'final' : `step${step}`}${mobile ? '-mobile' : ''}`
mkdirSync(dir, { recursive: true })
const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport, recordVideo: { dir, size: viewport } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()) })
await page.goto(`http://localhost:5173/?debugWaterTransition=1&waterStep=${step}${clean ? '&waterGuides=0' : ''}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.addStyleTag({ content: 'html { scroll-behavior: auto !important; }' })
if (clean) await page.addStyleTag({ content: '.intro-transition__debug { display: none; }' })
const runway = await page.locator('.intro-transition').evaluate(el => el.offsetHeight - el.firstElementChild.offsetHeight)
const frames = [0, .15, .25, .35, .45, .55, .65, .75, .82, .90, 1]
const states = []
for (const p of frames) {
  await page.evaluate(y => window.scrollTo(0, y), runway * p)
  await page.waitForTimeout(1100)
  await page.waitForFunction(() => Math.abs(window.__waterTransition.transitionTarget - window.__waterTransition.transitionSmooth) < .0001)
  states.push(await page.evaluate(() => JSON.parse(JSON.stringify(window.__waterTransition))))
  await page.screenshot({ path: `${dir}/${p.toFixed(2)}.png` })
}
// A continuous native-scroll take, forward and back, rather than progress pins.
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(600)
await page.evaluate(async runway => {
  const start = performance.now()
  await new Promise(resolve => {
    function tick(now) { const p = Math.min(1, (now - start) / 6500); window.scrollTo(0, runway * p); if (p < 1) requestAnimationFrame(tick); else resolve() }
    requestAnimationFrame(tick)
  })
}, runway)
await page.waitForTimeout(900)
await page.evaluate(y => window.scrollTo(0, y), runway * .55)
await page.waitForTimeout(900)
await page.screenshot({ path: `${dir}/reverse.png` })
await page.setViewportSize({ width: mobile ? 430 : 1024, height: mobile ? 932 : 768 })
await page.waitForTimeout(900)
await page.screenshot({ path: `${dir}/resize.png` })
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForTimeout(900)
states.push(await page.evaluate(() => ({ restored: window.__waterTransition.visual, overflow: document.documentElement.scrollWidth > innerWidth })))
writeFileSync(`${dir}/state.json`, JSON.stringify({ errors, states }, null, 2))
await page.close()
await browser.close()
const thumbW = mobile ? 260 : 480
const thumbH = Math.round(viewport.height / viewport.width * thumbW)
const tiles = await Promise.all(frames.map(async (p, i) => ({ input: await sharp(`${dir}/${p.toFixed(2)}.png`).resize(thumbW, thumbH).toBuffer(), left: (i % 3) * thumbW, top: Math.floor(i / 3) * thumbH })))
await sharp({ create: { width: thumbW * 3, height: thumbH * 4, channels: 3, background: '#030710' } }).composite(tiles).png().toFile(`${dir}/contact.png`)
console.log(JSON.stringify({ dir, errors: [...new Set(errors)], frames: states.length }, null, 2))
if (errors.length) process.exitCode = 1
