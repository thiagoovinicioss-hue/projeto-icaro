import type { DeviceTier } from '../story/cinema/types'

export type QualityMode = 'low' | 'medium' | 'high' | 'reduced'

export type Sim = {
  /** exact, mathematical scroll-driven world time 0..1 */
  target: number
  /** cinematic, damped world time used by camera/rocket/light */
  smooth: number
  /** chapter index currently closest to the scroll position */
  chapterIndex: number
  /** scroll fraction 0..1 (raw, before chapter mapping) */
  scrollFraction: number
  /** vertical viewport size in px at last measurement */
  viewportH: number
}

export const sim: Sim = {
  target: 0,
  smooth: 0,
  chapterIndex: 0,
  scrollFraction: 0,
  viewportH: typeof window !== 'undefined' ? window.innerHeight || 800 : 800,
}

export const quality = {
  dprCap: 2,
  shadows: true,
  post: true,
  particles: 1600,
  reducedMotion: false,
  mode: 'high' as QualityMode,
  isMobile: false,
  deviceTier: 'desktop' as DeviceTier,
}

/**
 * Estado de depuração/medição escrito pelo Conductor a cada frame (números,
 * sem strings) — o DebugHud e a auditoria (_cinema_audit.mjs) leem daqui.
 */
export const probe = {
  t: 0,
  stageId: 'hero',
  camera: { x: 0, y: 0, z: 0, tx: 0, ty: 0, tz: 0, fov: 45 },
  rocket: { x: 0, y: 0, z: 0 },
  rocketScreen: { x: 0, y: 0, topY: 0, bottomY: 0, visible: 1 },
  fps: 60,
  drawCalls: 0,
  triangles: 0,
  objectCount: 0,
  sceneTriangles: 0,
  jet: 0,
  fill: 0.5,
}

/**
 * Modo de captura de still ("?stage3d=0.465"). Ao definir, o mundo congela em
 * `t` exatamente — usado na auditoria das 5 composições e no reduced-motion.
 * null = fluxo normal (scroll é a fonte de verdade).
 */
export let stagePin: number | null = null

export function setStagePin(t: number | null): void {
  if (t !== null && Number.isFinite(t)) {
    stagePin = Math.min(1, Math.max(0, t))
  } else {
    stagePin = null
  }
}

export function setQuality(q: QualityMode) {
  quality.mode = q
  quality.reducedMotion = q === 'reduced'
  if (q === 'reduced') {
    quality.dprCap = Math.min(1.5, quality.dprCap)
    quality.shadows = false
  } else if (q === 'low') {
    quality.dprCap = 1.25
    quality.shadows = false
    quality.post = false
    quality.particles = 350
  } else if (q === 'medium') {
    quality.dprCap = Math.min(1.5, quality.dprCap)
    quality.shadows = false
    quality.particles = 900
  }
}

// Reduced-motion é detectado na inicialização do módulo (antes de qualquer
// efeito montar), para que o registro de motion já escreva o estado final e
// a contagem de dinheiro apareça correta desde o primeiro paint.
if (typeof window !== 'undefined' && typeof matchMedia !== 'undefined') {
  quality.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
