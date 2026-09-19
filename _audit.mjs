import { chromium } from 'playwright'

const URL = process.env.URL ?? 'http://localhost:5173/'
const viewports = [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile390', 390, 844],
  ['mobile430', 430, 932],
]

function luminance(r, g, b) {
  const f = (c) => {
    c /= 255
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
  }
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
}

async function contrast(fg, bg) {
  const a = luminance(...fg)
  const b = luminance(...bg)
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
}

const browser = await chromium.launch({ args: ['--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const TEXT_SELECTORS = [
  '.kicker', '.hero-sub', '.chapter-body', '.chapter-title', '.classified-word',
  '.climax-title', '.climax-sub', '.nav__link', '.nav__link--cta', '.footer__legal',
  '.pix-key__code', '.pix-key__label', '.progress-mission__stat-label',
  '.progress-mission__pct', '.photo-figure__caption', '.transparency-table th',
  '.transparency-table td', '.goal-number', '.goal-block__footnote', '.crew-card__name',
  '.crew-card__role', '.timeline__text', '.timeline__date', '.muted', '.pending-content',
  '.chapter-date', '.countdown-digit__value', '.share-feedback',
]

const report = {}

for (const [name, w, h] of viewports) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(700)

  const data = await page.evaluate(async (selectors) => {
    const doc = document.documentElement
    const out = {
      viewport: { w: doc.clientWidth, h: doc.clientHeight },
      horizontalOverflow: doc.scrollWidth - doc.clientWidth,
      sections: [],
      text: {},
    }

    document.querySelectorAll('.chapter').forEach((sec) => {
      const rect = sec.getBoundingClientRect()
      const kind = [...sec.classList].find((c) => c.startsWith('chapter--')) ?? ''
      out.sections.push({
        id: sec.id,
        kind,
        scrollHeight: sec.scrollHeight,
        rectHeight: Math.round(rect.height),
        viewportH: doc.clientHeight,
        overflowsViewport: sec.scrollHeight > doc.clientHeight + 2,
      })
    })

    function effectiveBg(el) {
      let node = el
      while (node && node !== document.body) {
        const bg = getComputedStyle(node).backgroundColor
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent' && !bg.startsWith('rgba(0,0,0,0)')) {
          return bg
        }
        node = node.parentElement
      }
      return getComputedStyle(document.body).backgroundColor
    }
    function lum(rgb) {
      const f = (c) => {
        c /= 255
        return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
      }
      return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2])
    }
    function rgba(c) {
      const m = c.match(/[\d.]+/g)
      return m ? m.slice(0, 3).map(Number) : [0, 0, 0]
    }

    for (const sel of selectors) {
      const els = document.querySelectorAll(sel)
      if (els.length === 0) continue
      const el = els[0]
      const cs = getComputedStyle(el)
      const fg = rgba(cs.color)
      const bgColor = effectiveBg(el)
      const bg = rgba(bgColor)
      const ratio = (Math.max(lum(fg), lum(bg)) + 0.05) / (Math.min(lum(fg), lum(bg)) + 0.05)
      out.text[sel] = {
        color: cs.color,
        bg: bgColor,
        fontSize: cs.fontSize,
        contrast: Math.round(ratio * 100) / 100,
        visible: Math.round(parseFloat(cs.opacity) * 100),
      }
    }
    return out
  }, TEXT_SELECTORS)

  report[name] = data
}

const browserH = report.desktop?.viewport?.h
for (const [vp, d] of Object.entries(report)) {
  console.log(`\n=== ${vp} ===`)
  console.log('viewport', JSON.stringify(d.viewport), 'h-overflow px:', d.horizontalOverflow)
  const badSections = d.sections.filter((s) => s.overflowsViewport)
  console.log('sections overflowing 100vh:', badSections.map((s) => `${s.id}(${s.scrollHeight}px vs ${browserH})`).join(', ') || 'none')
  const badText = Object.entries(d.text).filter(([, t]) => t.contrast < 4 && t.visible > 50)
  console.log('LOW CONTRAST (<4:1):')
  for (const [sel, t] of badText) console.log(`  ${sel} ${t.color} on ${t.bg} => ${t.contrast}:1 (${t.fontSize})`)
  const tiny = Object.entries(d.text).filter(([, t]) => parseFloat(t.fontSize) < 12)
  console.log('TINY TEXT (<12px):', tiny.map(([s, t]) => `${s}(${t.fontSize})`).join(', ') || 'none')
}

await browser.close()