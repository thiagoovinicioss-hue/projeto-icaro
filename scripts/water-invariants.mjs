import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import sharp from 'sharp'

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', e => errors.push(e.message))
async function settle(p) {
  await page.evaluate(p => {
    const el = document.querySelector('.intro-transition')
    window.scrollTo({ top: p * (el.offsetHeight - el.firstElementChild.offsetHeight), behavior: 'instant' })
  }, p)
  await page.waitForFunction(p => Math.abs(window.__waterTransition.visual.p - p) < .001, p)
  await page.waitForTimeout(250)
}
await page.goto('http://localhost:5173/?debugWaterTransition=1&waterGuides=0', { waitUntil: 'networkidle' })
await page.addStyleTag({ content: '.intro-transition__debug { display:none }' })
await settle(.75)
const before = await sharp(await page.screenshot()).raw().toBuffer()
await page.addStyleTag({ content: '.intro-transition__hero,.intro-transition__next { opacity:1 !important; background:magenta !important; }' })
const after = await sharp(await page.screenshot()).raw().toBuffer()
assert.deepEqual(after, before, '100% of the viewport must occlude the underlying content swap')
console.log('PASS full coverage: changing both DOM scenes cannot change a single captured pixel')
await page.reload({ waitUntil: 'networkidle' })
await settle(.9)
assert.ok(await page.locator('.intro-transition__next').evaluate(el => parseFloat(getComputedStyle(el).filter.match(/[\d.]+/)[0]) > 8))
await settle(1)
const end = await page.evaluate(() => ({
  state: window.__waterTransition.visual,
  canvas: document.querySelectorAll('.intro-transition canvas').length,
  inert: document.getElementById('quem-somos').inert,
  visibility: getComputedStyle(document.getElementById('quem-somos')).visibility,
  blur: getComputedStyle(document.querySelector('#quem-somos .chapter__frame')).filter,
  lens: getComputedStyle(document.querySelector('.intro-transition__lens')).visibility,
}))
assert.equal(end.canvas, 0)
assert.equal(end.inert, false)
assert.equal(end.visibility, 'visible')
assert.equal(end.blur, 'none')
assert.equal(end.lens, 'hidden')
assert.equal(end.state.coverage + end.state.water + end.state.droplets + end.state.blur, 0)
console.log('PASS final release: no canvas, no residual blur/water/lens; crew is interactive')
await settle(.45)
const forward = await page.evaluate(() => window.__waterTransition.rocketScreen)
await settle(.85)
await settle(.45)
const reverse = await page.evaluate(() => window.__waterTransition.rocketScreen)
assert.ok(Math.hypot(forward.x - reverse.x, forward.y - reverse.y) < .002)
await settle(0)
await page.getByRole('button', { name: /CONHEÇA A MISSÃO/ }).click()
await page.waitForFunction(() => window.__waterTransition.visual.p === 1)
await page.getByRole('button', { name: 'A missão', exact: true }).click()
await page.waitForFunction(() => window.__waterTransition.visual.p === 0)
console.log('PASS reverse seek and chapter navigation restore exact endpoint states')
await page.setViewportSize({ width: 390, height: 844 })
await settle(.45)
const mobile = await page.evaluate(() => window.__waterTransition.rocketScreen)
assert.ok(Math.abs(mobile.x - reverse.x) > .02)
assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
console.log('PASS resize reconstructs the mobile trajectory with no horizontal overflow')
for (const mode of ['reduced', 'no-webgl']) {
  const fallback = await browser.newPage({ viewport: { width: 390, height: 844 } })
  if (mode === 'reduced') await fallback.emulateMedia({ reducedMotion: 'reduce' })
  else await fallback.addInitScript(() => {
    const original = HTMLCanvasElement.prototype.getContext
    HTMLCanvasElement.prototype.getContext = function(type, ...args) { return type.includes('webgl') ? null : original.call(this, type, ...args) }
  })
  await fallback.goto('http://localhost:5173/?debugWaterTransition=1', { waitUntil: 'networkidle' })
  await fallback.evaluate(() => document.getElementById('quem-somos').scrollIntoView())
  await fallback.waitForFunction(() => window.__waterTransition.visual.p === 1)
  assert.equal(await fallback.locator('.intro-transition canvas').count(), 0)
  assert.equal(await fallback.locator('#quem-somos').evaluate(el => el.inert), false)
  await fallback.close()
  console.log(`PASS ${mode}: accessible final section without transition WebGL`)
}
assert.deepEqual(errors, [])
await browser.close()
