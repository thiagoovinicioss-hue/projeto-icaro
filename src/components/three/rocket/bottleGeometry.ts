import * as THREE from 'three'
import { ROCKET_DIMENSIONS } from './dimensions'

const PROFILE = ROCKET_DIMENSIONS.bottleProfile
const MIN_Y = PROFILE[0][1]
const MAX_Y = PROFILE[PROFILE.length - 1][1]

/** Raio da superfície do corpo PET na altura y (eixo normalizado). */
export function bottleRadiusAt(y: number): number {
  if (y <= PROFILE[0][1] - MIN_Y) return PROFILE[0][0]
  if (y >= MAX_Y - MIN_Y) return PROFILE[PROFILE.length - 1][0]
  for (let i = 0; i < PROFILE.length - 1; i++) {
    const a = PROFILE[i]
    const b = PROFILE[i + 1]
    const ay = a[1] - MIN_Y
    const by = b[1] - MIN_Y
    if (y >= ay && y <= by) {
      const span = by - ay
      const u = span <= 0 ? 0 : (y - ay) / span
      return a[0] + (b[0] - a[0]) * u
    }
  }
  return PROFILE[PROFILE.length - 1][0]
}

function latheFrom(absY0: number, absY1: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  for (const [radius, y] of PROFILE) {
    if (y >= absY0 && y <= absY1) pts.push(new THREE.Vector2(radius, y - MIN_Y))
  }
  return new THREE.LatheGeometry(pts, 40)
}

/**
 * Corpo PET = UMA superfície de revolução (LatheGeometry): boca→pescoço→ombro→
 * barriga paralela→fundo plano (assento do cone). Sem costura, já normalizada.
 */
export function makeBottleGeometry(): THREE.LatheGeometry {
  return latheFrom(MIN_Y, MAX_Y)
}

/**
 * Saia azul inferior: luva fina que segue o mesmo contorno do corpo (raio + 8mm),
 * da boca até a fita — leitura de "região pintada de azul", sem alterar a silhueta.
 */
export function makeBlueSleeveGeometry(): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = []
  const topAbs = ROCKET_DIMENSIONS.blue.topY + MIN_Y
  for (const [radius, y] of PROFILE) {
    if (y >= MIN_Y && y <= topAbs) pts.push(new THREE.Vector2(radius + 0.008, y - MIN_Y))
  }
  return new THREE.LatheGeometry(pts, 40)
}

/** Disco do fundo (sela o topo aberto do lathe, sob o cone). */
export function makeBottleBottom(): THREE.CylinderGeometry {
  const bottomR = PROFILE[PROFILE.length - 1][0]
  return new THREE.CylinderGeometry(bottomR, bottomR, 0.02, 40)
}

export { MIN_Y, MAX_Y }