import { chromium } from 'playwright'
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } })
await page.goto('http://localhost:5173/?debugOffice=1', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
const btn = page.locator('.office-launch__button')
await btn.waitFor({ state: 'attached', timeout: 20000 })
await btn.scrollIntoViewIfNeeded()
await btn.click()
try { await page.locator('.office-experience').waitFor({ state: 'visible', timeout: 15000 }) } catch (e) { console.log('no office:', e.message.split('\n')[0]) }
await page.waitForTimeout(6000)
const r = await page.evaluate(() => {
  const cam = window.__officeCam
  const scene = window.__officeScene
  if (!cam || !scene) return { cam: !!cam, scene: !!scene }
  const V = cam.position.constructor
  const proj = (x,y,z) => { const v = new V(x,y,z); v.project(cam); return { x: (v.x+1)/2*innerWidth, y: (1-v.y)/2*innerHeight, z: v.z } }
  let found = null
  scene.traverse((o) => { if (!found && o.isGroup && o.position.x < -0.2 && o.position.z < -0.5 && o.children.length > 6) found = o })
  const b3 = new (found?.geometry?.boundingBox?.constructor || Object)()
  let cx=-0.26, cy=0.17, cz=-0.62, min=null, max=null
  if (found && b3.setFromObject) { b3.setFromObject(found); min=b3.min; max=b3.max; found.updateMatrixWorld(true); cx=(min.x+max.x)/2; cy=(min.y+max.y)/2; cz=(min.z+max.z)/2 }
  return { cam: !!cam, scene: !!scene, lampFound: !!found, center: proj(cx,cy,cz), min: min?proj(min.x,min.y,min.z):null, max: max?proj(max.x,max.y,max.z):null, camPos: cam.position.toArray() }
})
console.log(JSON.stringify(r, null, 1))
await browser.close()
