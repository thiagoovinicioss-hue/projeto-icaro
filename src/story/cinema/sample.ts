import * as THREE from 'three'
import type { CameraKnot, RocketKnot, CHRKey, ColorKey, DeviceTier, CompositionStage } from './types'
import { CAMERA_BY_TIER, COMPOSITIONS, HELIX, IDLE_KEYS, JET_KEYS, FILL_KEYS, ROCKET_KNOTS } from './knots'
import { clamp01, smoothstep } from '../../utils/spline'

/**
 * Amostras de cinema. Regra de ouro: NADA é alocado por frame aqui —
 * resultados são escritos nos objetos `out` fornecidos pelo chamador;
 * quats/eulers de apoio são singletons do módulo.
 */

const _qA = new THREE.Quaternion()
const _qB = new THREE.Quaternion()
const _qBob = new THREE.Quaternion()
const _e = new THREE.Euler()
const _zAxis = new THREE.Vector3(0, 0, 1)
const _helix = new THREE.Vector3()
const _cA = new THREE.Color()
const _cB = new THREE.Color()

const _rocketQuats: THREE.Quaternion[] = ROCKET_KNOTS.map((k) =>
  new THREE.Quaternion().setFromEuler(_e.set(k.pitch, k.yaw, 0, 'YXZ')),
)

export function clampT(t: number): number {
  return clamp01(Number.isFinite(t) ? t : 0)
}

function easeU(u: number): number {
  return u * u * (3 - 2 * u)
}

function findSegment<K extends { t: number }>(keys: K[], t: number): { a: K; b: K; u: number; i: number } {
  const last = keys.length - 1
  if (t <= keys[0].t) return { a: keys[0], b: keys[0], u: 0, i: 0 }
  if (t >= keys[last].t) return { a: keys[last], b: keys[last], u: 0, i: last }
  let i = 0
  while (i < last && t > keys[i + 1].t) i++
  const a = keys[i]
  const b = keys[i + 1]
  const span = b.t - a.t
  return { a, b, u: span <= 0 ? 1 : easeU((t - a.t) / span), i }
}

/** Canal escalar com easing de repouso (safe, clampado). */
export function channelAt(keys: readonly CHRKey[], t: number, reduced = false): number {
  const { a, b, u } = findSegment(keys as CHRKey[], reduced ? nearestStage(t).t : t)
  return a.value + (b.value - a.value) * u
}

/** Cor de fundo com easing. */
export function colorAt(keys: readonly ColorKey[], t: number, out: THREE.Color, reduced = false): THREE.Color {
  const tt = reduced ? nearestStage(t).t : t
  const list = keys as ColorKey[]
  if (tt <= list[0].t) return out.set(list[0].c)
  const last = list[list.length - 1]
  if (tt >= last.t) return out.set(last.c)
  let i = 0
  while (i < list.length - 1 && tt > list[i + 1].t) i++
  const a = list[i]
  const b = list[i + 1]
  const span = b.t - a.t
  return out.copy(_cA.set(a.c)).lerp(_cB.set(b.c), span <= 0 ? 1 : easeU((tt - a.t) / span))
}

export type CameraSample = { pos: THREE.Vector3; target: THREE.Vector3; fov: number }

export function cameraAt(
  t: number,
  tier: DeviceTier,
  reduced: boolean,
  out: CameraSample,
): CameraSample {
  const tt = reduced ? nearestStage(t).t : t
  const keys = CAMERA_BY_TIER[tier]
  const { a, b, u } = findSegment(keys as CameraKnot[], tt)
  out.pos.set(
    a.pos[0] + (b.pos[0] - a.pos[0]) * u,
    a.pos[1] + (b.pos[1] - a.pos[1]) * u,
    a.pos[2] + (b.pos[2] - a.pos[2]) * u,
  )
  out.target.set(
    a.target[0] + (b.target[0] - a.target[0]) * u,
    a.target[1] + (b.target[1] - a.target[1]) * u,
    a.target[2] + (b.target[2] - a.target[2]) * u,
  )
  out.fov = a.fov + (b.fov - a.fov) * u
  return out
}

export type RocketSample = { position: THREE.Vector3; quaternion: THREE.Quaternion }

export function rocketAt(
  t: number,
  reduced: boolean,
  clock: number,
  out: RocketSample,
): RocketSample {
  const tt = reduced ? nearestStage(t).t : t
  const keys = ROCKET_KNOTS as RocketKnot[]
  const { a, b, u, i } = findSegment(keys, tt)

  out.position.set(
    a.pos[0] + (b.pos[0] - a.pos[0]) * u,
    a.pos[1] + (b.pos[1] - a.pos[1]) * u,
    a.pos[2] + (b.pos[2] - a.pos[2]) * u,
  )
  _qA.copy(_rocketQuats[i])
  _qB.copy(_rocketQuats[Math.min(i + 1, _rocketQuats.length - 1)])
  out.quaternion.copy(_qA.slerp(_qB, u))

  if (reduced) return out

  // Helix de classificação — no máximo 1/3 de volta, controle profissional.
  const hw = smoothstep(HELIX.startT, HELIX.endT, tt)
  if (hw > 0.001 && hw < 0.999) {
    const amp = Math.sin(hw * Math.PI) * HELIX.radius
    const phi = hw * HELIX.turns * Math.PI * 2
    _helix.set(amp * Math.cos(phi), 0, amp * Math.sin(phi))
    out.position.add(_helix)
  }

  // Flutuação idle: delicada, proporcional ao repouso do capítulo.
  const idle = channelAt(IDLE_KEYS, tt)
  if (idle > 0.001) {
    out.position.y += Math.sin(clock * 1.1) * 0.014 * idle
    const lean = Math.sin(clock * 0.82 + 1.3) * 0.005 * idle
    _qBob.setFromAxisAngle(_zAxis, lean)
    out.quaternion.multiply(_qBob)
  }
  return out
}

/** Foguete de água não rola sobre o próprio eixo — sempre 0 (contrato de verdade). */
export function rocketSpinAt(_t: number): number {
  return 0
}

/** Intensidade do jato de água (liberaçao de ar pressurizado), 0..1. */
export function jetAt(t: number, reduced = false): number {
  return channelAt(JET_KEYS, t, reduced)
}

/** Fração de água dentro da garrafa, 0..1 (drena no lançamento). */
export function fillAt(t: number, reduced = false): number {
  return channelAt(FILL_KEYS, t, reduced)
}

export function nearestStage(t: number): CompositionStage {
  let best = COMPOSITIONS[0]
  let bestD = Infinity
  for (const c of COMPOSITIONS) {
    const d = Math.abs(c.t - t)
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return best
}

export { COMPOSITIONS }