import { chromium } from 'playwright'

const browser = await chromium.launch()

async function capture(query, prefix) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 760 } })
  page.on('pageerror', (e) => console.log('PAGE-EXC:', e.message))
  page.on('console', (m) => {
    if (m.type() === 'error') console.log('CONSOLE-ERR:', m.text())
  })

  await page.goto(`http://localhost:5173/${query}`, { waitUntil: 'networkidle' })
  const btn = page.locator('.office-launch__button')
  await btn.waitFor({ state: 'attached', timeout: 20000 })
  await btn.scrollIntoViewIfNeeded()
  await btn.click({ timeout: 10000 })
  await page.locator('.office-experience').waitFor({ state: 'visible', timeout: 12000 })
  await page.waitForTimeout(2000)

  const hasHook = await page.evaluate(() => !!window.paperOffice)
  console.log(prefix, 'hook:', hasHook)
  if (!hasHook) {
    await browser.newPage
    await page.close()
    return
  }

  // congela e força o estado de impressão para posicionar o relógio à mão
  await page.evaluate(() => {
    const o = window.paperOffice
    o.paperPaused = true
    o.paperOnDesk = false
    o.printer.paperOnDesk = false
    o.printer.state = 'printing'
    o.printer.t = 0
    o.mode = 'printing'
  })
  await page.waitForTimeout(200)

  const setT = async (state, t) => {
    await page.evaluate(
      ({ state, t }) => {
        const o = window.paperOffice
        o.printer.state = state
        o.printer.t = t
        o.mode = state === 'paper-fall' ? 'paper-fall' : 'printing'
      },
      { state, t },
    )
    await page.waitForTimeout(160)
  }

  const dbg = async () => {
    try {
      return (await page.locator('.office-debug code').textContent({ timeout: 1200 })) ?? ''
    } catch {
      return 'NO-DEBUG'
    }
  }

  const shot = async (name) => {
    await page.screenshot({ path: `/tmp/opencode/${prefix}-${name}.png` })
    const d = await dbg()
    const pick = (re) => ((d.match(re) || [])[1] || '').replace(/\s+/g, ' ').trim()
    console.log(
      prefix,
      name.padEnd(12),
      '|',
      pick(/PAPERPHASE([\s\S]*?)PAPERPROG/),
      '|',
      pick(/PAPERLOC([\s\S]*?)PAPERWORLD/),
      '|',
      pick(/PAPERBOX([\s\S]*?)QR/),
    )
  }

  // --- fase de saída (printing) ---
  await setT('printing', 0)
  await shot('00-start')
  await setT('printing', 0.125)
  await shot('01-exit10')
  await setT('printing', 0.3125)
  await shot('02-exit25')
  await setT('printing', 0.625)
  await shot('03-exit50')
  await setT('printing', 0.9375)
  await shot('04-exit75')
  await setT('printing', 1.25)
  await shot('05-exit100')
  await setT('printing', 1.35)
  await shot('06-pause')

  // --- gatilho da queda (release + reparent) ---
  await setT('printing', 1.46)
  await page.waitForTimeout(200)

  await setT('paper-fall', 0)
  await shot('07-fallstart')
  await setT('paper-fall', 0.31)
  await shot('08-fallmid')
  await setT('paper-fall', 0.62)
  await shot('09-contact')
  await setT('paper-fall', 0.77)
  await shot('10-settle')
  await setT('paper-fall', 0.92)
  await shot('11-settled')

  await page.close()
}

await capture('?debugPaper=1', 'dbg')
await capture('?debugOffice=1', 'clean')
await browser.close()
console.log('done')
