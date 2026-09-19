import { lazy, Suspense, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { ChapterSection } from '../ChapterSection'
import { CHAPTERS } from '../../../story/chapters'
import { transitionConfig as config } from '../../../story/transition/config'
import { clamp, stageVisual, transitionState as state } from '../../../story/transition/stageState'
import './transition.css'
import { WetLensOverlay } from './WetLensOverlay'

const Scene = lazy(() => import('../../three/transition/TransitionScene').then(m => ({ default: m.TransitionScene })))
export function TransitionStage({ webglAvailable }: { webglAvailable: boolean }) {
  const stage = useRef<HTMLDivElement>(null)
  const preview = useRef<HTMLDivElement>(null)
  const hero = useRef<HTMLDivElement>(null)
  const hud = useRef<HTMLOutputElement>(null)
  const [renderScene, setRenderScene] = useState(true)
  const [debug] = useState(() => new URLSearchParams(location.search).get('debugWaterTransition') === '1')
  const [reduced, setReduced] = useState(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduced(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])
  useLayoutEffect(() => {
    const source = document.getElementById('quem-somos')
    const host = preview.current
    if (!source || !host) return
    // One semantic, interactive crew section. Its inert visual double has no IDs,
    // observers or independent reveal timelines, and matches the handoff exactly.
    const clone = source.cloneNode(true) as HTMLElement
    clone.removeAttribute('id')
    clone.removeAttribute('aria-labelledby')
    clone.querySelectorAll('[id]').forEach(el => el.removeAttribute('id'))
    clone.querySelectorAll('img').forEach(el => { el.loading = 'eager' })
    host.replaceChildren(clone)
    host.inert = true
    return () => host.replaceChildren()
  }, [])
  useEffect(() => {
    const el = stage.current
    if (!el) return
    let raf = 0, last = performance.now(), top = 0, runway = 1, inRange = true
    const measure = () => {
      top = el.getBoundingClientRect().top + window.scrollY
      runway = el.offsetHeight - (el.firstElementChild as HTMLElement).offsetHeight
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    window.addEventListener('resize', measure)
    if (debug) {
      state.debugStep = Number(new URLSearchParams(location.search).get('waterStep') ?? 8)
      Object.assign(window, { __waterTransition: state })
    }
    const frame = (now: number) => {
      const elapsed = (now - last) / 1000
      const dt = Math.min(0.1, elapsed)
      last = now
      const target = clamp((window.scrollY - top) / runway)
      state.transitionProgress = target
      state.transitionTarget = target
      const previous = state.transitionSmooth
      state.transitionSmooth += (target - state.transitionSmooth) * (1 - Math.exp(-config.damping * dt))
      if (Math.abs(target - state.transitionSmooth) < 0.0001 || target === 1 || target === 0 || reduced) state.transitionSmooth = target
      const v = stageVisual(state.transitionSmooth, window.innerWidth < 768)
      state.visual = v
      state.transitionRocketState = v.p >= config.rocketRelease ? 'released' : v.p <= config.flightRange[0] ? 'offscreen' : 'flight'
      state.active = target < 1
      state.fps += ((elapsed > 0 ? 1 / elapsed : 60) - state.fps) * 0.08
      if (previous !== v.p) state.invalidate?.()
      el.style.setProperty('--intro-hero', `${v.hero}`)
      el.style.setProperty('--intro-next', `${state.debugStep >= 5 ? v.next : 0}`)
      el.style.setProperty('--intro-blur', `${state.debugStep >= 7 ? v.blur : 0}px`)
      el.style.setProperty('--intro-focus-scale', `${1 + (state.debugStep >= 7 ? v.blur / config.blurMax : 0) * 0.015}`)
      el.style.setProperty('--intro-coverage', `${v.coverage}`)
      el.dataset.phase = v.phase
      document.documentElement.style.setProperty('--intro-nav', `${v.nav}`)
      document.documentElement.dataset.introActive = target < 1 ? 'true' : 'false'
      document.documentElement.dataset.introCovered = v.nav < 0.01 ? 'true' : 'false'
      if (hero.current) hero.current.inert = v.hero < 0.05
      const next = document.getElementById('quem-somos')
      if (next) next.inert = target < 1
      const shouldRender = target < 1 && !reduced
      if (shouldRender !== inRange) { inRange = shouldRender; setRenderScene(shouldRender) }
      if (hud.current) hud.current.textContent = [
        `p ${target.toFixed(3)} / smooth ${v.p.toFixed(3)} · ${v.phase}`,
        `rocket t ${v.rocketT.toFixed(3)} · ${state.transitionRocketState}`,
        `rocket xy ${state.rocketScreen.x.toFixed(3)}, ${state.rocketScreen.y.toFixed(3)}`,
        `waterOrigin xy ${state.waterOriginScreen.x.toFixed(3)}, ${state.waterOriginScreen.y.toFixed(3)}`,
        `coverage ${v.coverage.toFixed(3)} · hero ${v.hero.toFixed(2)} · next ${v.next.toFixed(2)}`,
        `blur ${v.blur.toFixed(1)}px · drops ${v.droplets.toFixed(2)} · FPS ${state.fps.toFixed(0)}`,
      ].join('\n')
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); window.removeEventListener('resize', measure)
      document.documentElement.style.removeProperty('--intro-nav')
      delete document.documentElement.dataset.introActive
      delete document.documentElement.dataset.introCovered
    }
  }, [debug, reduced])
  return <div ref={stage} id={CHAPTERS[0].id} className="intro-transition" style={{ '--intro-runway': `${config.runwayVh}svh` } as CSSProperties}>
    <div className="intro-transition__sticky">
      <div className="intro-transition__background" />
      <div ref={hero} className="intro-transition__hero"><ChapterSection chapter={CHAPTERS[0]} index={0} omitId /></div>
      <div ref={preview} className="intro-transition__next" aria-hidden="true" />
      <div className="intro-transition__rocket" aria-hidden="true">
        {webglAvailable && renderScene && <Suspense fallback={null}><Scene debug={debug && new URLSearchParams(location.search).get('waterGuides') !== '0'} /></Suspense>}
      </div>
      {(!webglAvailable || reduced) && <div className="intro-transition__liquid intro-transition__fallback" aria-hidden="true" />}
      <WetLensOverlay />
      {debug && <output className="intro-transition__debug" ref={hud} />}
    </div>
  </div>
}
