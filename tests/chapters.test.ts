import { describe, it, expect } from 'vitest'
import { Vector3, Quaternion } from 'three'
import { CHAPTERS, countdownAt } from '../src/story/chapters'
import {
  CAMERA_DESKTOP,
  CAMERA_MOBILE,
  CAMERA_TABLET,
  COMPOSITIONS,
  HELIX,
  rocketAt,
  rocketSpinAt,
  jetAt,
  fillAt,
  nearestStage,
} from '../src/story/cinema'

const makeOut = () => ({ position: new Vector3(), quaternion: new Quaternion() })

describe('chapters', () => {
  it('are in fixed order with unique ids and valid weights', () => {
    const ids = new Set(CHAPTERS.map((c) => c.id))
    expect(ids.size).toBe(CHAPTERS.length)
    expect(CHAPTERS).toHaveLength(10)
    for (const c of CHAPTERS) {
      expect(c.weight).toBeGreaterThanOrEqual(0.9)
      expect(c.weight).toBeLessThanOrEqual(1.5)
      expect(c.id).toMatch(/^[a-z0-9-]+$/)
      expect(['dark', 'scrim-left', 'scrim-right', 'scrim-center']).toContain(c.textContrastMode ?? 'dark')
    }
  })

  it('cover world time contiguously from 0 to 1', () => {
    expect(CHAPTERS[0].tStart).toBe(0)
    expect(CHAPTERS[CHAPTERS.length - 1].tEnd).toBe(1)
    for (let i = 1; i < CHAPTERS.length; i++) {
      expect(CHAPTERS[i].tStart).toBeCloseTo(CHAPTERS[i - 1].tEnd, 4)
    }
  })
})

describe('cinema: 5 composições', () => {
  it('têm tempos distintos dentro de [0,1]', () => {
    expect(COMPOSITIONS).toHaveLength(5)
    const times = COMPOSITIONS.map((c) => c.t)
    for (const t of times) {
      expect(t).toBeGreaterThanOrEqual(0)
      expect(t).toBeLessThanOrEqual(1)
    }
    expect(new Set(times).size).toBe(times.length)
  })

  it('nearestStage mapeia 0→hero e 1→lançamento', () => {
    expect(nearestStage(0).id).toBe('hero')
    expect(nearestStage(1).id).toBe('lancamento')
  })
})

describe('cinema: câmeras autorais', () => {
  for (const [label, keys] of [
    ['desktop', CAMERA_DESKTOP],
    ['tablet', CAMERA_TABLET],
    ['mobile', CAMERA_MOBILE],
  ] as const) {
    it(`${label}: t ordenado, coberto em 0..1, valores finitos`, () => {
      expect(keys[0].t).toBeGreaterThanOrEqual(0)
      expect(keys[keys.length - 1].t).toBeLessThanOrEqual(1)
      for (let i = 1; i < keys.length; i++) {
        expect(keys[i].t).toBeGreaterThan(keys[i - 1].t)
      }
      for (const k of keys) {
        for (const v of [...k.pos, ...k.target, k.fov]) expect(Number.isFinite(v)).toBe(true)
        expect(k.fov).toBeGreaterThan(30)
        expect(k.fov).toBeLessThan(70)
        expect(k.pos[2]).toBeGreaterThan(2) // nunca atravessa o foguete
      }
    })
  }
})

describe('cinema: foguete de água', () => {
  it('não rola sobre o próprio eixo (rocketSpinAt = 0)', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) expect(rocketSpinAt(t)).toBe(0)
  })

  it('jetAt e fillAt ficam em [0,1]', () => {
    const samples = Array.from({ length: 40 }, (_, i) => i / 39)
    for (const t of samples) {
      expect(jetAt(t)).toBeGreaterThanOrEqual(0)
      expect(jetAt(t)).toBeLessThanOrEqual(1)
      expect(fillAt(t)).toBeGreaterThanOrEqual(0)
      expect(fillAt(t)).toBeLessThanOrEqual(1)
    }
  })

  it('posição/quaternion finitos e normalizados; sobe sem teleporte', () => {
    const out = makeOut()
    let prevY = -Infinity
    for (let i = 0; i <= 80; i++) {
      const t = i / 80
      rocketAt(t, false, t * 10, out)
      expect(Number.isFinite(out.position.x)).toBe(true)
      expect(Number.isFinite(out.position.y)).toBe(true)
      expect(out.quaternion.length()).toBeCloseTo(1, 4)
      if (t < 0.93 && out.position.y < prevY) {
        expect(out.position.y).toBeGreaterThanOrEqual(prevY - 0.05)
      }
      prevY = out.position.y
    }
    rocketAt(0.07, false, 0, out)
    expect(out.position.y).toBeLessThan(1.5)
    expect(out.position.x).toBeGreaterThan(0.5) // hero: foguete à direita
    rocketAt(1, false, 0, out)
    expect(out.position.y).toBeGreaterThan(20)
  })
})

describe('helix da classificação', () => {
  it('fica dentro da janela do capítulo e gira no máximo 1/3 de volta', () => {
    expect(HELIX.startT).toBeGreaterThan(0.35)
    expect(HELIX.endT).toBeLessThan(0.6)
    expect(HELIX.turns).toBeGreaterThan(0)
    expect(HELIX.turns).toBeLessThanOrEqual(0.34)
  })
})

describe('countdown', () => {
  it('is silent before support, then counts 3,2,1,0', () => {
    expect(countdownAt(0.89)).toBeNull()
    expect(countdownAt(0.9)).toBe('3')
    expect(countdownAt(0.944)).toBe('3')
    expect(countdownAt(0.945)).toBe('2')
    expect(countdownAt(0.974)).toBe('2')
    expect(countdownAt(0.975)).toBe('1')
    expect(countdownAt(0.991)).toBe('1')
    expect(countdownAt(0.992)).toBe('0')
    expect(countdownAt(1)).toBe('0')
  })
})