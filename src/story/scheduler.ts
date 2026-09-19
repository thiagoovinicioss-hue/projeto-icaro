import { CHAPTERS } from './chapters'
import { sim } from '../utils/sim'
import { clamp01 } from '../utils/spline'

export type SectionMeasure = { center: number }

/**
 * Maps every measured chapter center to its authored world-time center.
 * Used by both the world-time resolver and the active-chapter picker.
 */
function chapterCenterFractions(centers: Record<string, SectionMeasure>) {
  return CHAPTERS.map((ch) => ({ fr: centers[ch.id]?.center ?? 0, t: (ch.tStart + ch.tEnd) / 2 }))
}

export function measureSections(): Record<string, SectionMeasure> {
  if (typeof document === 'undefined') return {}
  const doc = document.documentElement
  const vh = sim.viewportH || window.innerHeight || 800
  const scrollable = Math.max(1, doc.scrollHeight - vh)
  sim.viewportH = vh

  const out: Record<string, SectionMeasure> = {}
  for (const ch of CHAPTERS) {
    const el = document.getElementById(ch.id)
    if (!el) continue
    const top = el.offsetTop
    const h = el.offsetHeight
    const center = clamp01((top + h / 2 - vh / 2) / scrollable)
    out[ch.id] = { center }
  }
  return out
}

export function scrollFraction(): number {
  if (typeof window === 'undefined') return 0
  const doc = document.documentElement
  const scrollable = Math.max(1, doc.scrollHeight - (sim.viewportH || window.innerHeight))
  return clamp01(window.scrollY / scrollable)
}

/**
 * Maps a measured chapter center to its authored world-time center.
 * Between chapters the mapping is linear -> deterministic and reversible.
 */
export function worldTimeAtFraction(
  sf: number,
  centers: Record<string, SectionMeasure>,
): number {
  const chapterCenters = chapterCenterFractions(centers)
  if (chapterCenters.length === 0) return 0
  if (sf <= chapterCenters[0].fr) return chapterCenters[0].t
  const last = chapterCenters[chapterCenters.length - 1]
  if (sf >= last.fr) return last.t
  for (let i = 0; i < chapterCenters.length - 1; i++) {
    const a = chapterCenters[i]
    const b = chapterCenters[i + 1]
    if (sf >= a.fr && sf <= b.fr) {
      const span = b.fr - a.fr
      const u = span <= 0 ? 0 : clamp01((sf - a.fr) / span)
      return a.t + (b.t - a.t) * u
    }
  }
  return last.t
}

export function activeChapterIndex(
  sf: number,
  centers: Record<string, SectionMeasure>,
): number {
  const chapterCenters = chapterCenterFractions(centers)
  let best = 0
  let bestDist = Infinity
  for (let i = 0; i < chapterCenters.length; i++) {
    const d = Math.abs(chapterCenters[i].fr - sf)
    if (d < bestDist) {
      bestDist = d
      best = i
    }
  }
  return best
}