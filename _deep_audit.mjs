import { chromium } from 'playwright'

const URL = process.env.URL ?? 'http://localhost:5173/'
const viewports = [
  ['desktop', 1440, 900],
  ['tablet', 768, 1024],
  ['mobile390', 390, 844],
  ['mobile430', 430, 932],
]

const browser = await chromium.launch({ args: ['--disable-gpu'] })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const JS = `(async () => {
  const doc = document.documentElement
  const out = {
    viewport: { w: doc.clientWidth, h: doc.clientHeight },
    docOverflowX: doc.scrollWidth - doc.clientWidth,
    sections: [],
    overflowingEls: [],
    brokenImages: [],
    emptyText: [],
    lowContrast: [],
  }

  const lum = (rgb) => {
    const f = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
    return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2])
  }
  const parse = (c) => {
    const m = c.match(/[\\d.]+/g); return m ? m.slice(0, 4).map(Number) : null
  }
  // composite an element's effective bg to the root background
  function effectiveBg(el) {
    let node = el
    const stack = []
    while (node && node !== document.body) {
      const cs = getComputedStyle(node)
      const bg = cs.backgroundColor
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const p = parse(bg)
        if (p && p[3] !== 0) stack.push([p, getComputedStyle(node.parentElement || document.body).backgroundColor])
      }
      node = node.parentElement
    }
    let rgb = parse(getComputedStyle(document.body).backgroundColor) || [2, 8, 18]
    if (!rgb[3] || rgb[3] === 0) rgb = [2, 8, 18, 1]
    // simple: nearest nontransparent ancestor bg
    return { r: rgb[0], g: rgb[1], b: rgb[2] }
  }

  // per-element horizontal overflow (content bigger than its box)
  const tags = new Set(['DIV', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'CODE', 'A', 'BUTTON', 'LI', 'UL', 'OL', 'TABLE', 'FIGCAPTION', 'FIGCAPTION'])
  document.querySelectorAll('*').forEach((el) => {
    if (!tags.has(el.tagName)) return
    const cs = getComputedStyle(el)
    if (cs.position === 'fixed') return
    if (cs.overflowX === 'hidden' || cs.overflowX === 'clip') return
    if (el.scrollWidth > el.clientWidth + 1) {
      out.overflowingEls.push({
        tag: el.tagName.toLowerCase(),
        cls: (el.className && String(el.className).slice(0, 70)) || '',
        sw: el.scrollWidth, cw: el.clientWidth,
        text: (el.textContent || '').trim().slice(0, 40),
      })
    }
  })

  // broken images
  document.querySelectorAll('img').forEach((img) => {
    if (img.complete && img.naturalWidth === 0) {
      out.brokenImages.push({ src: img.getAttribute('src'), cls: (img.className || '').slice(0, 50) })
    }
  })

  // text elements that are empty/blank placeholders that render nothing
  document.querySelectorAll('.chapter-copy, .classified-block, .support-copy, .climax-copy').forEach((sec) => {
    const txt = (sec.textContent || '').replace(/\\s+/g, ' ').trim()
    if (txt.length < 5) out.emptyText.push({ cls: sec.className.slice(0, 60) })
  })

  // contrast of text over nearest solid ancestor (simpler, avoids rgba self-bg false positives)
  const TEXT_SELECTORS = [
    '.kicker', '.hero-sub', '.chapter-body', '.chapter-title', '.classified-word',
    '.climax-title', '.climax-sub', '.nav__link', '.footer__legal', '.pix-key__code',
    '.pix-key__label', '.progress-mission__stat-label', '.progress-mission__pct',
    '.photo-figure__caption', '.transparency-table th', '.transparency-table td',
    '.goal-number', '.goal-block__text', '.goal-block__footnote', '.crew-card__name',
    '.crew-card__role', '.timeline__text', '.timeline__date', '.chapter-date',
    '.countdown-digit__value', '.pending-content', '.progress-mission__note',
    '.progress-mission__meta', '.pix-key__hint', '.pix-key__note', '.footer__brand-tag',
    '.hero-headline', '.nav__brand-name', '.footer__link', '.btn--gold', '.btn--ghost',
    '.climax-sub', '.share-feedback', '.funding-use__label', '.funding-use__note',
  ]
  for (const sel of TEXT_SELECTORS) {
    const els = document.querySelectorAll(sel)
    if (!els.length) continue
    for (const el of els) {
      const cs = getComputedStyle(el)
      const fgp = parse(cs.color)
      if (!fgp) continue
      const bg = effectiveBg(el)
      const ratio = (Math.max(lum(fgp), lum([bg.r, bg.g, bg.b])) + 0.05) / (Math.min(lum(fgp), lum([bg.r, bg.g, bg.b])) + 0.05)
      out.lowContrast.push({ sel, cls: sel, color: cs.color, fontSize: cs.fontSize, contrast: Math.round(ratio * 100) / 100, text: (el.textContent||'').trim().slice(0,24) })
    }
  }

  // per-section info incl. photo rows
  document.querySelectorAll('.chapter').forEach((sec) => {
    const kind = [...sec.classList].find((c) => c.startsWith('chapter--')) ?? ''
    out.sections.push({ id: sec.id, kind, scrollH: sec.scrollHeight, rectH: Math.round(sec.getBoundingClientRect().height) })
  })

  return out
})()`

const report = {}
for (const [name, w, h] of viewports) {
  await page.setViewportSize({ width: w, height: h })
  await page.goto(URL, { waitUntil: 'load', timeout: 30000 }).catch(() => {})
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.fonts ? document.fonts.ready : Promise.resolve())).catch(() => {})
  report[name] = await page.evaluate(JS)
}

for (const [vp, d] of Object.entries(report)) {
  console.log(`\n===== ${vp} =====`)
  console.log(`doc overflowX: ${d.docOverflowX}px  brokenImages: ${d.brokenImages.length}  emptySections: ${d.emptyText.length}`)
  const over = d.overflowingEls.slice(0, 14)
  if (over.length) {
    console.log('-- element horiz overflow (first 14):')
    for (const o of over) console.log(`   <${o.tag} .${o.cls}> sw=${o.sw} cw=${o.cw} "${o.text}"`)
  }
  const lo = d.lowContrast.filter((x) => x.contrast < 4.5 && parseFloat(x.fontSize) < 24)
  if (lo.length) {
    console.log('-- LOW CONTRAST (<4.5, small text):')
    for (const l of lo) console.log(`   ${l.sel} ${l.color} ${l.fontSize} => ${l.contrast}:1 "${l.text}"`)
  }
  const bigLo = d.lowContrast.filter((x) => x.contrast < 3 && parseFloat(x.fontSize) >= 24)
  if (bigLo.length) {
    console.log('-- LOW CONTRAST (large text <3):')
    for (const l of bigLo) console.log(`   ${l.sel} ${l.fontSize} => ${l.contrast}:1`)
  }
  console.log('-- sections:')
  for (const s of d.sections) console.log(`   ${s.id.padEnd(16)} ${s.kind.padEnd(22)} scrollH=${s.scrollH}`)
}

await browser.close()