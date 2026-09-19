import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'

const URL = process.env.URL ?? 'http://localhost:4173/'
const SHOTS = '/tmp/opencode/shots-3d'
mkdirSync(SHOTS, { recursive: true })

// Times e bandas NDC alvo do foguete (espelho de src/story/cinema/knots.ts)
const COMPOSITIONS = [
  { id: 'hero', t: 0.07, xBand: [0.16, 0.5], chapter: '#intro' },
  { id: 'historia', t: 0.285, xBand: [-0.5, 0.5], chapter: '#origem' },
  { id: 'classificacao', t: 0.465, xBand: [-0.56, -0.05], chapter: '#qualificacao' },
  { id: 'meta', t: 0.79, xBand: [-0.58, -0.12], chapter: '#meta' },
  { id: 'lancamento', t: 0.985, xBand: [-0.2, 0.2], chapter: '#climax' },
]

const VIEWPORTS = [
  { name: 'desktop', w: 1440, h: 900, tier: 'desktop' },
  { name: 'tablet', w: 820, h: 1180, tier: 'tablet' },
  { name: 'mobile', w: 390, h: 844, tier: 'mobile' },
  { name: 'mobile430', w: 430, h: 932, tier: 'mobile' },
]

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader'] })
const results = []
const consoleErrors = []

function ok(name, cond, extra = '') {
  results.push({ ok: !!cond, name, extra })
  return !!cond
}

function fin(v) {
  return Number.isFinite(v)
}

for (const vp of VIEWPORTS) {
  for (const comp of COMPOSITIONS) {
    const page = await browser.newPage({ viewport: { width: vp.w, height: vp.h } })
    page.on('pageerror', (e) => consoleErrors.push(`[${vp.name}/${comp.id}] ${e.message}`))
    const url = `${URL}?debug3d=1&stage3d=${comp.t}`
    try {
      await page.goto(url, { waitUntil: 'load', timeout: 45000 })
      await page.waitForTimeout(1600)

      const canvas = await page.$('canvas')
      ok(`canvas present ${vp.name}/${comp.id}`, !!canvas)

      const data = await page.evaluate(() => {
        const w = globalThis
        const ic = (w.__icaro ?? {})
        const probe = ic.probe ?? {}
        const quality = ic.quality ?? {}
        const rect = document.querySelector('.chapter')?.getBoundingClientRect()
        return {
          probe,
          quality,
          hasOverflow: document.documentElement.scrollWidth - document.documentElement.clientWidth > 2,
        }
      })
      const p = data.probe

      ok(`finite probe ${vp.name}/${comp.id}`, fin(p.camera?.x) && fin(p.rocket?.y) && fin(p.rocketScreen?.x))
      ok(`stage match ${vp.name}/${comp.id}`, p.stageId === comp.id, `got ${p.stageId}`)
      ok(`rocket visible ${vp.name}/${comp.id}`, p.rocketScreen?.visible === 1)
      ok(`rocket xBand ${vp.name}/${comp.id}`, p.rocketScreen?.x >= comp.xBand[0] && p.rocketScreen?.x <= comp.xBand[1],
        `x=${p.rocketScreen?.x?.toFixed(3)} band=${comp.xBand.toString()}`)
      ok(`rocket on screen-y ${vp.name}/${comp.id}`, Math.abs(p.rocketScreen?.bottomY ?? 9) < 1.3 && Math.abs(p.rocketScreen?.topY ?? 9) < 1.3,
        `y=${p.rocketScreen?.bottomY?.toFixed(3)}..${p.rocketScreen?.topY?.toFixed(3)}`)
      ok(`fov in [30,70] ${vp.name}/${comp.id}`, p.camera?.fov >= 30 && p.camera?.fov <= 70, `fov=${p.camera?.fov}`)
      ok(`camera never behind rocket z>2 ${vp.name}/${comp.id}`, p.camera?.z > 2, `z=${p.camera?.z?.toFixed(2)}`)
      ok(`tier ${vp.name}/${comp.id}`, (data.quality.deviceTier ?? 'desktop') === vp.tier, `tier=${data.quality.deviceTier}`)
      ok(`cost budget ${vp.name}/${comp.id}`, (p.objectCount ?? 999) < 400 && (p.sceneTriangles ?? 999999) < 60000,
        `objects=${p.objectCount} tris=${p.sceneTriangles}`)
      ok(`no h-overflow ${vp.name}/${comp.id}`, !data.hasOverflow)

      await page.screenshot({ path: `${SHOTS}/${vp.name}-${comp.id}.png` })
    } catch (err) {
      ok(`runtime ${vp.name}/${comp.id}`, false, err.message)
    } finally {
      await page.close()
    }
  }
}

// reduced-motion: faz scroll e o foguete/câmera não podem "voar"
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto(`${URL}?debug3d=1`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(1000)
  const a = await page.evaluate(() => ((globalThis.__icaro ?? {}).probe ?? {}).rocketScreen?.y ?? null)
  const scrollTarget = await page.evaluate(() => {
    const y = document.documentElement.scrollHeight - window.innerHeight
    window.scrollTo(0, Math.round(y * 0.94))
    return y * 0.94
  })
  await page.waitForTimeout(900)
  const info = await page.evaluate(() => {
    const ic = globalThis.__icaro ?? {}
    return { probe: ic.probe ?? {}, sim: ic.sim ?? {}, scrollY: window.scrollY }
  })
  ok('reduced-motion destino alcançado', Math.abs(info.scrollY - scrollTarget) < 10, `y=${info.scrollY} alvo=${scrollTarget.toFixed(0)}`)
  ok('reduced-motion still no clímax', info.sim.target > 0.8 && Math.abs(info.probe?.t - info.sim?.target) < 0.001,
    `target=${info.sim.target} t=${info.probe?.t}`)
  ok('reduced-motion rocketeiro em still (x estável)', fin(a) && fin(info.probe?.rocketScreen?.y), `a=${a} b=${info.probe?.rocketScreen?.y}`)
  ok('reduced-motion camera móvel, cena viva (fov/screen ok)',
    fin(info.probe?.camera?.fov) && Math.abs(info.probe?.rocketScreen?.y) < 1.3, `fov=${info.probe?.camera?.fov}`)
  await page.close()
}

// scroll rápido de topo a fundo não pode travar/crash a cena
{
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errs = []
  page.on('pageerror', (e) => errs.push(e.message))
  await page.goto(`${URL}?debug3d=1`, { waitUntil: 'load', timeout: 45000 })
  await page.waitForTimeout(800)
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
  await page.waitForTimeout(250)
  await page.evaluate(() => window.scrollTo(0, 0))
  await page.waitForTimeout(500)
  const p = await page.evaluate(() => ((globalThis.__icaro ?? {}).probe ?? {}))
  ok('fast scroll finito', fin(p.rocket?.y) && fin(p.camera?.y), `rocket.y=${p.rocket?.y} cam.y=${p.camera?.y}`)
  ok('fast scroll sem pageerror', errs.length === 0, errs.join(' | '))
  await page.close()
}

await browser.close()

const failed = results.filter((r) => !r.ok)
console.log(`\nCINEMA AUDIT — ${results.length} checks, ${failed.length} failed`)
const failCount = failed.length
for (const r of results) {
  const icon = r.ok ? 'PASS' : 'FAIL'
  const pad = icon.length
  console.log(`${icon}${' '.repeat(5 - pad)} ${r.name}${r.extra ? `   ${r.extra}` : ''}`)
}
console.log('console/page errors:', consoleErrors.length === 0 ? 'none' : '\n' + consoleErrors.join('\n'))
process.exit(failCount === 0 ? 0 : 1)