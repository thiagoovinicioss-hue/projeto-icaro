import { describe, expect, it } from 'vitest'
import { Vector3, Quaternion } from 'three'
import { makeFinGeometry } from '../src/components/three/rocket/finGeometry'
import { rocketAt, rocketSpinAt, jetAt } from '../src/story/cinema'

const makeOut = () => ({ position: new Vector3(), quaternion: new Quaternion() })

describe('cinema rocket (foguete de água)', () => {
  it('rocketSpinAt é sempre 0 — não rola no próprio eixo', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) expect(rocketSpinAt(t)).toBe(0)
  })

  it('jetAt fica em [0, 1]', () => {
    const samples = Array.from({ length: 40 }, (_, i) => i / 39).map((t) => jetAt(t))
    for (const v of samples) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(1)
    }
  })

  it('posição/direção finitas e quaternion normalizado nos momentos-chave', () => {
    const out = makeOut()
    for (const t of [0, 0.13, 0.42, 0.6, 0.9, 1]) {
      rocketAt(t, false, 0, out)
      expect(Number.isFinite(out.position.x) && Number.isFinite(out.position.y) && Number.isFinite(out.position.z)).toBe(true)
      expect(out.quaternion.length()).toBeCloseTo(1, 4)
    }
  })
})

describe('makeFinGeometry (aletras trapezoidais)', () => {
  it('gera um objeto fechado, plano, com 36 vértices (12 tris)', () => {
    const geo = makeFinGeometry(Math.PI / 4)
    const pos = geo.getAttribute('position') as unknown as { count: number }
    expect(pos.count).toBe(36)
    expect(geo.attributes.normal).toBeDefined()
  })

  it('as 4 aletas apoiam a garrafa sem se interceptar pelo centro', () => {
    const fins = [45, 135, 225, 315].map((deg) => makeFinGeometry((deg * Math.PI) / 180))
    for (const geo of fins) {
      const pos = geo.attributes.position
      const centerDist2 = pos.getX(0) ** 2 + pos.getZ(0) ** 2
      expect(centerDist2).toBeGreaterThan(0.09)
    }
  })
})