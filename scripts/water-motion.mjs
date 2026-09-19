import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'

const mobile = process.env.MOBILE === '1'
const dir = `/tmp/opencode/water-motion${mobile ? '-mobile' : ''}`
mkdirSync(dir, { recursive: true })
const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport, recordVideo: { dir, size: viewport } })
await page.goto('http://localhost:5173/?debugWaterTransition=1&waterGuides=0', { waitUntil: 'networkidle' })
await page.addStyleTag({ content: '.intro-transition__debug { display:none }' })
await page.waitForTimeout(1500)
const samples = await page.evaluate(async () => {
  const el = document.querySelector('.intro-transition')
  const runway = el.offsetHeight - el.firstElementChild.offsetHeight
  const samples = []
  const start = performance.now()
  await new Promise(resolve => {
    function frame(now) {
      const p = Math.min(1, (now - start) / 9000)
      window.scrollTo({ top: p * runway, behavior: 'instant' })
      const s = window.__waterTransition
      samples.push({ ms: now - start, p: s.visual.p, x: s.rocketScreen.x, y: s.rocketScreen.y, coverage: s.visual.coverage, blur: s.visual.blur })
      if (p < 1) requestAnimationFrame(frame); else resolve()
    }
    requestAnimationFrame(frame)
  })
  return samples
})
await page.waitForTimeout(1400)
const video = page.video()
await page.close()
await video.saveAs(`${dir}/transition.webm`)
writeFileSync(`${dir}/motion.json`, JSON.stringify(samples, null, 2))
await browser.close()
console.log(`${dir}/transition.webm — ${samples.length} observed motion frames`)
