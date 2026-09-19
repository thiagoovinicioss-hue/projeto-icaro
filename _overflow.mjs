import { chromium } from 'playwright'

const URL = process.env.URL ?? 'http://localhost:5173/'
const viewports = [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile390', 390, 844],
]

const browser = await chromium.launch({ args: ['--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

for (const [name, w, hgt] of viewports) {
  await page.setViewportSize({ width: w, height: hgt })
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(700)

  const r = await page.evaluate(() => {
    const doc = document.documentElement
    const culprits = []
    const all = document.querySelectorAll('*')
    const vw = doc.clientWidth
    for (const el of all) {
      const r = el.getBoundingClientRect()
      const cs = getComputedStyle(el)
      if (r.width > 0 && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed') {
        culprits.push({
          tag: el.tagName.toLowerCase(),
          cls: (el.className && String(el.className).slice(0, 60)) || '',
          left: Math.round(r.left),
          right: Math.round(r.right),
          w: Math.round(r.width),
        })
      }
    }
    const stageInfo = [...document.querySelectorAll('.chapter')].map((sec) => {
      const stage = sec.querySelector('.chapter__stage')
      const frame = sec.querySelector('.chapter__frame')
      const stageR = stage ? stage.getBoundingClientRect() : null
      const frameH = frame ? frame.scrollHeight : 0
      return {
        id: sec.id,
        stageH: stageR ? Math.round(stageR.height) : null,
        frameScrollH: Math.round(frameH),
        frameOverflowsStage: frameH > (stageR ? stageR.height : 0) + 1,
      }
    })
    return { vw, culprits: culprits.slice(0, 12), stages: stageInfo }
  })

  console.log(`\n=== ${name} (vw ${r.vw}) ===`)
  console.log('overflow culprits:', JSON.stringify(r.culprits, null, 1))
  const over = r.stages.filter((s) => s.frameOverflowsStage)
  console.log('frame overflows stage (clipping risk):')
  for (const s of over) console.log(`  ${s.id}: frame ${s.frameScrollH}px vs stage ${s.stageH}px`)
}

await browser.close()