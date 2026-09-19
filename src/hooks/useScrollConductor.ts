import { useEffect } from 'react'
import { sim, quality } from '../utils/sim'
import { CHAPTERS } from '../story/chapters'
import {
  activeChapterIndex,
  measureSections,
  scrollFraction,
  worldTimeAtFraction,
} from '../story/scheduler'
import { clamp01 } from '../utils/spline'

/**
 * DOM-side damping for the scroll-driven world clock.
 *
 * While the Three.js conductor is disabled (visual layer reconstruction) this
 * keeps [sim].smooth alive so scroll-based DOM animations (countdown, reveals)
 * behave exactly like the cinematic clock. It converges the same value, so it
 * is harmless once the 3D conductor returns.
 */
const CLOCK_DAMPING = 3.4
const MAX_FRAME_STEP = 1 / 24

/**
 * The reversible scroll conductor.
 * Native scroll is the single source of truth: same scroll position it
 * produces the same world time and the same chapter, no matter the input.
 */
export function useScrollConductor() {
  useEffect(() => {
    let raf = 0

    const update = () => {
      const centers = measureSections()
      const sf = scrollFraction()
      sim.scrollFraction = sf
      sim.target = worldTimeAtFraction(sf, centers)
      const ci = activeChapterIndex(sf, centers)
      if (ci !== sim.chapterIndex) {
        sim.chapterIndex = ci
        const id = CHAPTERS[ci]?.id
        if (id) {
          try {
            window.history.replaceState(null, '', `#${id}`)
          } catch {
            /* private mode */
          }
        }
      }
    }

    const onScroll = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }
    const onResize = () => update()

    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    let last = performance.now()

    const dampClock = () => {
      const now = performance.now()
      const dt = Math.min((now - last) / 1000, MAX_FRAME_STEP)
      last = now
      if (quality.reducedMotion) {
        sim.smooth = sim.target
      } else {
        sim.smooth = clamp01(sim.smooth + (sim.target - sim.smooth) * (1 - Math.exp(-CLOCK_DAMPING * dt)))
      }
      raf = requestAnimationFrame(dampClock)
    }
    raf = requestAnimationFrame(dampClock)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    quality.reducedMotion = reduced
    if (reduced) {
      sim.smooth = sim.target
    }
  }, [])
}