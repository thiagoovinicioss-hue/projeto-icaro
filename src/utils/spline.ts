export type Vec3Tuple = [number, number, number]

export type CHRKey = { t: number; value: number }
export type SplineKey = { t: number; p: Vec3Tuple }

/** Piecewise linear sampler over explicit (t, value) knots. Clamped at ends. */
export function samplePiecewise(keys: CHRKey[], t: number): number {
  if (keys.length === 0) return 0
  if (t <= keys[0].t) return keys[0].value
  const last = keys[keys.length - 1]
  if (t >= last.t) return last.value
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      return span === 0 ? a.value : a.value + (b.value - a.value) * ((t - a.t) / span)
    }
  }
  return last.value
}

function dist(a: Vec3Tuple, b: Vec3Tuple): number {
  const dx = a[0] - b[0]
  const dy = a[1] - b[1]
  const dz = a[2] - b[2]
  return Math.sqrt(dx * dx + dy * dy + dz * dz)
}

function mix(a: Vec3Tuple, b: Vec3Tuple, u: number): Vec3Tuple {
  return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]
}

/**
 * Non-uniform centripetal Catmull–Rom spline.
 * Each key carries an authored `t` deciding which segment is active (world
 * time -> story). Within the segment the parametrization is geometric
 * (alpha = 0.5), producing cinematic easing without cusps.
 */
export function sampleSpline(keys: SplineKey[], t: number, alpha = 0.5): Vec3Tuple {
  const n = keys.length
  if (n === 0) return [0, 0, 0]
  if (n === 1) return keys[0].p
  if (t <= keys[0].t) return keys[0].p
  if (t >= keys[n - 1].t) return keys[n - 1].p

  let seg = 0
  while (seg < n - 2 && t > keys[seg + 1].t) seg++
  seg = Math.min(seg, n - 2)

  const p0 = keys[Math.max(0, seg - 1)].p
  const p1 = keys[seg].p
  const p2 = keys[seg + 1].p
  const p3 = keys[Math.min(n - 1, seg + 2)].p

  const t0 = 0
  const t1 = Math.pow(dist(p0, p1), alpha)
  const t2 = t1 + Math.pow(dist(p1, p2), alpha)
  const t3 = t2 + Math.pow(dist(p2, p3), alpha)

  const span = keys[seg + 1].t - keys[seg].t
  const u = span <= 0 ? 0.5 : Math.min(1, Math.max(0, (t - keys[seg].t) / span))
  const tt = t1 + u * (t2 - t1)

  const A1 = mix(p0, p1, (tt - t0) / (t1 - t0 || 1e-6))
  const A2 = mix(p1, p2, (tt - t1) / (t2 - t1 || 1e-6))
  const A3 = mix(p2, p3, (tt - t2) / (t3 - t2 || 1e-6))
  const B1 = mix(A1, A2, (tt - t1) / (t2 - t1 || 1e-6))
  const B2 = mix(A2, A3, (tt - t2) / (t3 - t2 || 1e-6))
  return mix(B1, B2, (tt - t1) / (t2 - t1 || 1e-6))
}

export function clamp01(x: number): number {
  return Math.min(1, Math.max(0, x))
}

export function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt))
}

export function smoothstep(a: number, b: number, x: number): number {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}