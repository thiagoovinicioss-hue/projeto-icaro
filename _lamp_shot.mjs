import { chromium } from 'playwright'

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 })
page.on('pageerror', (e) => console.log('PAGE-EXC:', e.message))
page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text()) })

await page.goto('http://localhost:5173/?lampTest=1&lampShot=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
const btn = page.locator('.office-launch__button')
await btn.waitFor({ state: 'attached', timeout: 20000 })
await btn.scrollIntoViewIfNeeded()
await btn.click({ timeout: 10000 })
try { await page.locator('.office-experience').waitFor({ state: 'visible', timeout: 15000 }) } catch (e) { console.log('no office:', e.message.split('\n')[0]) }
await page.waitForTimeout(5000)
await page.screenshot({ path: '/tmp/opencode/lamp-isolated.png' })
console.log('saved /tmp/opencode/lamp-isolated.png')
await browser.close()
