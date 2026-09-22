import { chromium } from 'playwright'

const URL = process.env.URL ?? 'http://localhost:4173/'
const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(URL, { waitUntil: 'networkidle', timeout: 45000 })
await page.waitForTimeout(1500)

const { scrollable } = await page.evaluate(() => ({
  scrollable: Math.max(1, document.documentElement.scrollHeight - innerHeight),
}))

// For each chapter: measure scrollY when section top ENTERS viewport, and when kicker rvs>=0.6
const ids = ['quem-somos', 'comeco', 'classificacao', 'jornada', 'meta', 'progresso', 'apoio', 'lancamento']

async function measure(scrY) {
  return page.evaluate(() => {
    const ids = ['quem-somos', 'comeco', 'classificacao', 'jornada', 'meta', 'progresso', 'apoio', 'lancamento']
    const out = {}
    for (const id of ids) {
      const sec = document.getElementById(id)
      const head = sec?.querySelector('.section-head, .classified-block, .goal-block, .progress-mission, .support, .climax')
      // generic: first `.mt` within the chapter stage
      const mt = sec?.querySelector('.chapter__frame .mt, .chapter__frame [class*="mt-"]')
      let kicker = null
      const k = sec?.querySelector('.chapter__frame .kicker, .chapter__frame .mt-kicker')
      if (k) {
        const cs = getComputedStyle(k)
        kicker = { rvs: cs.getPropertyValue('--rvs').trim() }
      }
      const title = sec?.querySelector('.chapter__frame .mt-line, .chapter__frame h2, .chapter__frame .classified-word')
      let titleInfo = null
      if (title) {
        const cs = getComputedStyle(title)
        const r = title.getBoundingClientRect()
        titleInfo = {
          rvs: cs.getPropertyValue('--rvs').trim() || 'unset',
          top: Math.round(r.top),
          opacity: cs.opacity,
        }
      }
      const top = sec ? Math.round(sec.getBoundingClientRect().top) : null
      out[id] = { sectionTopFromTop: top, kicker, titleInfo }
    }
    return out
  })
}

// sweep fine-grained across each chapter zone
const report = {}
for (const id of ids) {
  const r = []
  for (let fr = 0; fr <= 1.0001; fr += 0.006) {
    const y = Math.round(scrollable * fr)
    await page.evaluate((yy) => window.scrollTo(0, yy), y)
    await page.waitForTimeout(90)
    const m = await measure(ids)
    const k = m[id].kicker
    const krvs = k ? parseFloat(k.rvs) : NaN
    if (!isNaN(krvs) && krvs >= 0.6 && r.length === 0) {
      r.push({ revealFr: fr, revealY: y, titleTop: m[id].titleInfo?.top ?? null, sectionTopFromTop: m[id].sectionTopFromTop })
    }
  }
  report[id] = r[0] ?? { msg: 'never reached 0.6' }
  console.log(id, JSON.stringify(report[id]))
}
await browser.close()