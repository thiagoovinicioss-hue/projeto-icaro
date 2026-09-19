import { useEffect, useMemo, useRef } from 'react'
import { transitionConfig as config } from '../../../story/transition/config'
import { seededRandom, transitionState as state, ease } from '../../../story/transition/stageState'

/** Lens-space droplets: clipped, magnified copies of the actual next composition.
 * No DOM rasterizer, world spheres or independent clocks. The copies are inert.
 */
export function WetLensOverlay() {
  const host = useRef<HTMLDivElement>(null)
  const droplets = useMemo(() => {
    const random = seededRandom(config.seed)
    const anchors = [[.15,.23],[.68,.19],[.88,.39],[.38,.49],[.74,.65],[.21,.79],[.56,.86]]
    return Array.from({ length: config.dropletCount + config.microDropletCount }, (_, i) => ({
      x: anchors[i]?.[0] ?? random(), y: anchors[i]?.[1] ?? random(),
      radius: i < config.dropletCount ? 18 + random() * 19 : 1.2 + random() * 3,
      aspect: 1.05 + random() * .45, seed: random(), slide: i === 2 || i === 5,
    }))
  }, [])
  useEffect(() => {
    const el = host.current
    const source = document.getElementById('quem-somos')
    if (!el || !source) return
    el.inert = true
    const drops = Array.from(el.children) as HTMLElement[]
    for (const drop of drops.slice(0, config.dropletCount)) {
      const content = source.cloneNode(true) as HTMLElement
      content.removeAttribute('id'); content.removeAttribute('aria-labelledby')
      content.querySelectorAll('[id]').forEach(node => node.removeAttribute('id'))
      content.querySelectorAll('img').forEach(image => { image.loading = 'eager' })
      drop.firstElementChild!.replaceChildren(content)
    }
    let raf = 0
    const frame = () => {
      const { p, droplets: amount, blur } = state.visual
      const live = state.debugStep >= 6 && amount > 0
      el.style.visibility = live ? 'visible' : 'hidden'
      if (live) {
        const w = el.clientWidth, h = el.clientHeight
        droplets.forEach((d, i) => {
          const drop = drops[i]
          const slide = ease(.85 + d.seed * .025, 1, p)
          const r = d.radius * (w < 768 ? .7 : 1) * (1 - (d.slide ? .04 : .36) * slide)
          const cx = w * d.x + (d.slide ? slide * slide * 5 : 0)
          const cy = h * d.y + (d.slide ? slide * slide * h * .3 : slide * 7)
          const aspect = d.aspect + (d.slide ? slide * .85 : 0)
          drop.style.width = `${r * 2}px`; drop.style.height = `${r * 2 * aspect}px`
          drop.style.left = `${cx - r}px`; drop.style.top = `${cy - r * aspect}px`
          drop.style.opacity = `${amount * (1 - ease(.93 + d.seed * .025, 1, p))}`
          const image = drop.firstElementChild as HTMLElement | null
          if (image) {
            image.style.width = `${w}px`; image.style.height = `${h}px`
            image.style.left = `${-cx + r}px`; image.style.top = `${-cy + r * aspect}px`
            image.style.transformOrigin = `${cx}px ${cy}px`
            image.style.transform = `scale(${1 + config.dropletRefraction / 100}) translate(${d.seed * 3}px, 2px)`
            image.style.filter = `blur(${blur * .72}px) brightness(1.2) contrast(1.12)`
          }
        })
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [droplets])
  return <div ref={host} className="intro-transition__lens" aria-hidden="true">
    {droplets.map((d, i) => <div key={i} className={`wet-drop ${i < config.dropletCount ? 'wet-drop--main' : 'wet-drop--micro'}`} style={{ borderRadius: `${43 + d.seed * 12}% ${52 - d.seed * 8}% 49% 46% / 57% 45% 51% 43%` }}>
      {i < config.dropletCount && <div className="wet-drop__refraction" />}
    </div>)}
  </div>
}
