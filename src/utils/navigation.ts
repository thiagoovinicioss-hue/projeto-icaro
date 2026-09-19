import { CHAPTERS } from '../story/chapters'
import { quality } from './sim'

/**
 * Smoothly scrolls to a chapter by index or id, honouring reduced-motion
 * preferences, and mirrors the anchor in the URL (no history entry).
 */
export function scrollToChapter(index: number | string) {
  const id = typeof index === 'string' ? index : CHAPTERS[index]?.id
  if (!id) return
  const el = document.getElementById(id)
  if (!el) return
  const reduced =
    quality.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' })
  try {
    window.history.replaceState(null, '', `#${id}`)
  } catch {
    /* ignore */
  }
}