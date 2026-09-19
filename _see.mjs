import { chromium } from 'playwright'

const URL = process.env.URL ?? 'http://localhost:4173/'
const t = process.argv[2] ?? '0.07'
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(`${URL}?debug3d=1&stage3d=${t}`, { waitUntil: 'load', timeout: 45000 })
await page.waitForTimeout(1600)
const zoom = process.argv[3] === 'zoom'
const stand = process.argv[3] === 'stand'
if (stand) {
  await page.evaluate(() => {
    ;(globalThis.__icaro ?? {}).inspectStand = true
  })
  await page.waitForTimeout(400)
}
if (zoom) {
  await page.evaluate(() => {
    ;(globalThis.__icaro ?? {}).zoomRocket = true
  })
  await page.waitForTimeout(400)
}
const probe = await page.evaluate(() => {
  const ic = (globalThis.__icaro ?? {})
  const p = ic.probe ?? {}
  return { rocket: p.rocket ?? {}, screen: p.rocketScreen ?? {} }
})
console.log(JSON.stringify(probe))
await page.screenshot({ path: `/tmp/opencode/shots-3d/see-${t}${zoom ? '-zoom' : stand ? '-stand' : ''}.png` })
await browser.close()