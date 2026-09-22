import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('PAGE-EXC:', e.message))

await page.goto('http://localhost:5173/?debugOffice=1', { waitUntil: 'networkidle' })
console.log('loaded')

const btn = page.locator('.office-launch__button')
await btn.waitFor({ state: 'attached', timeout: 20000 })
await btn.scrollIntoViewIfNeeded()
await btn.click({ timeout: 10000 })
console.log('clicked launch')

try { await page.locator('.office-experience').waitFor({ state: 'visible', timeout: 12000 }) } catch (e) { console.log('no office:', e.message.split('\n')[0]) }
await page.waitForTimeout(3500)
console.log('office-experience:', await page.locator('.office-experience').count())

await page.screenshot({ path: '/tmp/opencode/comp-baseline.png' })

const callout = page.locator('.office-callout--printer').first()
let cb = null
try { await callout.waitFor({ state: 'visible', timeout: 8000 }); cb = await callout.boundingBox() } catch { console.log('no printer callout') }
if (cb) {
  await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2)
  await page.waitForTimeout(4000)
  await page.screenshot({ path: '/tmp/opencode/comp-afterprint.png' })
}
await browser.close()