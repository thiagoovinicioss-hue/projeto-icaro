import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
page.on('pageerror', (e) => console.log('PAGE-EXC:', e.message))

await page.goto('http://localhost:5173/?debugOffice=1', { waitUntil: 'networkidle' })
console.log('loaded')

const btn = page.locator('.office-launch__button')
await btn.waitFor({ state: 'attached', timeout: 20000 })
await btn.scrollIntoViewIfNeeded()
await btn.click({ timeout: 10000 })
console.log('clicked launch')

try { await page.locator('.office-experience').waitFor({ state: 'visible', timeout: 12000 }) } catch (e) { console.log('no office:', e.message.split('\n')[0]) }
await page.waitForTimeout(2500)
console.log('office-experience:', await page.locator('.office-experience').count())

const debug = async () => {
  try { return (await page.locator('.office-debug code').textContent({ timeout: 1500 })) ?? '' } catch { return 'NO-DEBUG' }
}

const callout = page.locator('.office-callout--printer').first()
let cb = null
try { await callout.waitFor({ state: 'visible', timeout: 8000 }); cb = await callout.boundingBox() } catch { console.log('no printer callout') }
if (cb) {
  console.log('BEFORE:', await debug())
  await page.mouse.click(cb.x + cb.width / 2, cb.y + cb.height / 2)
  await page.waitForTimeout(600)
  console.log('DURING:', await debug())
  await page.waitForTimeout(2000)
  console.log('AFTER-PRINT:', await debug())
  await page.screenshot({ path: '/tmp/opencode/p-afterprint.png' })
  console.log('preview sheets:', await page.locator('.office-qr-preview').count())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
  console.log('AFTER-CLOSE:', await debug())
  console.log('preview sheets:', await page.locator('.office-qr-preview').count())
  console.log('office still open:', await page.locator('.office-experience').count())
  await page.screenshot({ path: '/tmp/opencode/p-afterclose.png' })
}
await browser.close()