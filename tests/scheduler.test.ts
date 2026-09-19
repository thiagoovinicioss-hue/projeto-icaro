import { describe, expect, it } from 'vitest'
import { worldTimeAtFraction, activeChapterIndex } from '../src/story/scheduler'
import { CHAPTERS } from '../src/story/chapters'

describe('scheduler', () => {
  const keys = CHAPTERS.map((c) => c.id)
  // Synthetic measured centers, evenly spread across scroll space.
  const centers = Object.fromEntries(keys.map((id, i) => [id, { center: i / (keys.length - 1) }]))
  const midpoints = CHAPTERS.map((c) => (c.tStart + c.tEnd) / 2)

  it('maps each measured center to its authored world-time center', () => {
    for (let i = 0; i < keys.length; i++) {
      const sf = i / (keys.length - 1)
      expect(worldTimeAtFraction(sf, centers)).toBeCloseTo(midpoints[i], 6)
    }
  })

  it('clamps at the edges of scroll space', () => {
    expect(worldTimeAtFraction(0, centers)).toBe(midpoints[0])
    expect(worldTimeAtFraction(1, centers)).toBe(midpoints[keys.length - 1])
  })

  it('interpolates linearly between centers (reversible mapping)', () => {
    const a = centers[keys[0]]!.center
    const b = centers[keys[1]]!.center
    const mid = (a + b) / 2
    const expected = midpoints[0] + (midpoints[1] - midpoints[0]) * 0.5
    expect(worldTimeAtFraction(mid, centers)).toBeCloseTo(expected, 5)
  })

  it('picks the nearest chapter', () => {
    for (let i = 0; i < keys.length; i++) {
      const sf = i / (keys.length - 1)
      expect(activeChapterIndex(sf, centers)).toBe(i)
    }
    expect(activeChapterIndex(-1, centers)).toBe(0)
    expect(activeChapterIndex(2, centers)).toBe(keys.length - 1)
  })
})