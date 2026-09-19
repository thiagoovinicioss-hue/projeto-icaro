import { transitionConfig as config } from './config'

export const clamp = (x: number) => Math.max(0, Math.min(1, x))
export const ease = (a: number, b: number, p: number) => { const t = clamp((p - a) / (b - a)); return t * t * (3 - 2 * t) }
export function keyframes(keys: readonly (readonly [number, number])[], p: number) {
  for (let i = 1; i < keys.length; i++) {
    if (p <= keys[i][0]) return keys[i - 1][1] + (keys[i][1] - keys[i - 1][1]) * ease(keys[i - 1][0], keys[i][0], p)
  }
  return keys[keys.length - 1][1]
}
export function rocketT(p: number) {
  const t = clamp((p - config.flightRange[0]) / (config.flightRange[1] - config.flightRange[0]))
  // Monotone cubic Hermite speed track: acceleration without stops at anchors.
  const keys = config.flightSpeed
  for (let i = 1; i < keys.length; i++) {
    if (t > keys[i][0]) continue
    const [x0, y0] = keys[i - 1], [x1, y1] = keys[i]
    const before = keys[Math.max(0, i - 2)], after = keys[Math.min(keys.length - 1, i + 1)]
    const m0 = i === 1 ? 0 : (y1 - before[1]) / (x1 - before[0])
    const m1 = (after[1] - y0) / (after[0] - x0)
    const u = (t - x0) / (x1 - x0), u2 = u * u, u3 = u2 * u
    return (2 * u3 - 3 * u2 + 1) * y0 + (u3 - 2 * u2 + u) * (x1 - x0) * m0 + (-2 * u3 + 3 * u2) * y1 + (u3 - u2) * (x1 - x0) * m1
  }
  return 1
}
export function stageVisual(p: number, mobile = false) {
  p = clamp(p)
  const coverage = keyframes(config.coverageGrowth, p + (mobile && p < 0.70 ? 0.012 * ease(0.36, 0.48, p) : 0))
  return {
    p, rocketT: rocketT(p),
    phase: p === 1 ? 'complete' : p >= config.phaseRanges.focus[0] ? 'focus' : p >= config.phaseRanges.submerged[1] ? 'wet' : p >= config.phaseRanges.submerged[0] ? 'submerged' : p >= config.phaseRanges.takeover[0] ? 'takeover' : p >= config.phaseRanges.pass[0] ? 'pass' : p >= config.phaseRanges.entry[0] ? 'entry' : 'anticipation',
    hero: 1 - ease(...config.heroFade, p),
    next: ease(...config.nextReveal, p),
    coverage,
    blur: keyframes(config.focusKeys, p),
    droplets: ease(...config.dropletReveal, p) * (1 - coverage) * (1 - ease(...config.dropletDrain, p)),
    water: ease(config.emissionRange[0], 0.24, p) * (1 - ease(0.65, 0.735, p)),
    rocketVisible: p < config.rocketRelease,
    nav: 1 - ease(0.44, 0.63, p) * (1 - ease(0.92, 1, p)),
  }
}
export const transitionState = {
  transitionProgress: 0, transitionTarget: 0, transitionSmooth: 0,
  visual: stageVisual(0), active: true, fps: 60,
  transitionRocketState: 'offscreen' as 'offscreen' | 'flight' | 'released',
  storyRocketState: 'hidden' as 'hidden' | 'chapter',
  storyAllowed: false,
  rocketScreen: { x: 0, y: 0 }, waterOriginScreen: { x: 0, y: 0 },
  // Debug isolation gates are also used by the staged visual audit.
  debugStep: 8,
  invalidate: null as null | (() => void),
}
export function seededRandom(seed: number) {
  let n = seed >>> 0
  return () => { n = (Math.imul(1664525, n) + 1013904223) >>> 0; return n / 4294967296 }
}
