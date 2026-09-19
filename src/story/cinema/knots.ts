import type { CameraKnot, RocketKnot, Vec3, CHRKey, ColorKey, DeviceTier, CompositionStage } from './types'

/**
 * Direção artística da fase 3D — "cinema de scroll" em 5 composições.
 *
 * As 12 âncoras abaixo seguem os centros dos capítulos (world time). A câmera
 * e o foguete vivem nessas âncoras e só se movem de forma controlada entre
 * elas (easing com repouso), nunca em espiral ou perseguição constante.
 *
 * Números bons o suficiente para a primeira passada de composição — a auditoria
 * programática (_cinema_audit.mjs) mede a projeção do foguete na tela e afina
 * as bandas (rocketScreen.x por capítulo) até os enquadramentos passarem.
 */

export const COMPOSITIONS: CompositionStage[] = [
  { id: 'hero', label: 'Hero', t: 0.07, xBand: [0.16, 0.5] },
  { id: 'historia', label: 'História', t: 0.285, xBand: [-0.5, 0.5] },
  { id: 'classificacao', label: 'Classificação', t: 0.465, xBand: [-0.56, -0.05] },
  { id: 'meta', label: 'Meta / progresso', t: 0.79, xBand: [-0.58, -0.12] },
  { id: 'lancamento', label: 'Lançamento', t: 0.985, xBand: [-0.2, 0.2] },
]

export const CAMERA_DESKTOP: CameraKnot[] = [
  { t: 0.07, pos: [0.1, 1.55, 6.7], target: [-0.85, 1.9, 0.0], fov: 45 },
  { t: 0.205, pos: [-2.7, 1.6, 5.5], target: [0.75, 1.8, 0.0], fov: 45 },
  { t: 0.335, pos: [3.0, 1.4, 5.5], target: [-0.7, 1.85, 0.0], fov: 45 },
  { t: 0.465, pos: [3.0, 1.25, 6.4], target: [0.55, 2.95, 0.0], fov: 44 },
  { t: 0.585, pos: [3.2, 2.2, 6.5], target: [-0.75, 3.6, 0.0], fov: 46 },
  { t: 0.69, pos: [3.3, 3.1, 7.0], target: [0.55, 4.35, 0.0], fov: 47 },
  { t: 0.785, pos: [3.0, 3.15, 7.0], target: [0.15, 4.45, 0.0], fov: 47 },
  { t: 0.865, pos: [3.3, 3.05, 6.8], target: [0.7, 4.4, 0.0], fov: 47 },
  { t: 0.9275, pos: [3.0, 2.9, 6.7], target: [0.85, 5.0, 0.0], fov: 46 },
  { t: 0.965, pos: [0.25, 2.65, 7.9], target: [0.0, 6.3, 0.0], fov: 45 },
  { t: 0.985, pos: [0.0, 3.6, 9.6], target: [0.0, 15.0, 0.0], fov: 47 },
  { t: 1.0, pos: [0.0, 6.4, 15.0], target: [0.0, 20.0, -1.5], fov: 50 },
]

export const CAMERA_TABLET: CameraKnot[] = CAMERA_DESKTOP.map((k) =>
  k.t !== 0.07
    ? { t: k.t, pos: [k.pos[0], k.pos[1], k.pos[2] - 0.7] as Vec3, target: k.target, fov: k.fov + 3 }
    : { t: k.t, pos: [0.25, 1.5, 6.4] as Vec3, target: [0.15, 2.0, 0.0] as Vec3, fov: 50 },
)

export const CAMERA_MOBILE: CameraKnot[] = [
  { t: 0.07, pos: [0.55, 1.55, 8.8], target: [0.3, 2.0, 0.0], fov: 53 },
  { t: 0.205, pos: [-2.0, 1.6, 7.6], target: [0.75, 1.9, 0.0], fov: 53 },
  { t: 0.335, pos: [2.3, 1.5, 7.6], target: [-0.7, 1.9, 0.0], fov: 53 },
  { t: 0.465, pos: [2.3, 1.35, 8.4], target: [0.4, 3.0, 0.0], fov: 52 },
  { t: 0.585, pos: [2.5, 2.2, 8.6], target: [-0.6, 3.7, 0.0], fov: 53 },
  { t: 0.69, pos: [2.6, 3.0, 9.0], target: [0.5, 4.4, 0.0], fov: 53 },
  { t: 0.785, pos: [2.4, 3.0, 9.0], target: [0.15, 4.5, 0.0], fov: 53 },
  { t: 0.865, pos: [2.6, 2.95, 8.8], target: [0.55, 4.5, 0.0], fov: 53 },
  { t: 0.9275, pos: [2.4, 2.85, 8.8], target: [0.7, 5.0, 0.0], fov: 52 },
  { t: 0.965, pos: [0.1, 2.7, 10.4], target: [0.0, 6.4, 0.0], fov: 52 },
  { t: 0.985, pos: [0.0, 3.7, 12.2], target: [0.0, 15.0, 0.0], fov: 53 },
  { t: 1.0, pos: [0.0, 6.2, 18.0], target: [0.0, 19.0, -1.5], fov: 55 },
]

export const CAMERA_BY_TIER: Record<DeviceTier, CameraKnot[]> = {
  desktop: CAMERA_DESKTOP,
  tablet: CAMERA_TABLET,
  mobile: CAMERA_MOBILE,
}

export const ROCKET_KNOTS: RocketKnot[] = [
  { t: 0.07, pos: [1.15, 0.62, 0.0], yaw: 0, pitch: 0.0 },
  { t: 0.205, pos: [-0.85, 0.62, 0.0], yaw: 0, pitch: 0.05 },
  { t: 0.335, pos: [0.85, 0.68, 0.0], yaw: 0, pitch: -0.05 },
  { t: 0.465, pos: [-0.65, 2.6, 0.0], yaw: 0, pitch: 0.12 },
  { t: 0.585, pos: [0.45, 3.8, 0.0], yaw: 0, pitch: -0.09 },
  { t: 0.69, pos: [-1.15, 4.55, 0.0], yaw: 0, pitch: 0.06 },
  { t: 0.785, pos: [-1.1, 4.7, 0.0], yaw: 0, pitch: 0.04 },
  { t: 0.865, pos: [-1.0, 4.8, 0.1], yaw: 0, pitch: 0.02 },
  { t: 0.9275, pos: [-0.45, 5.3, 0.0], yaw: 0, pitch: 0.01 },
  { t: 0.965, pos: [0.0, 6.4, 0.0], yaw: 0, pitch: 0 },
  { t: 0.985, pos: [0.0, 15.0, 0.2], yaw: 0, pitch: 0 },
  { t: 1.0, pos: [0.0, 34.0, 0.0], yaw: 0, pitch: 0 },
]

/**
 * Helix durante a classificação: no máximo 1/3 de volta — "progresso em
 * espiral", não um passeio. Mantido propositalmente pequeno.
 */
export const HELIX = {
  startT: 0.4,
  endT: 0.53,
  radius: 0.22,
  turns: 0.33,
} as const

/** Peso da "flutuação idle": o foguete quase não se move nos repousos. */
export const IDLE_KEYS: CHRKey[] = [
  { t: 0.0, value: 1 },
  { t: 0.335, value: 1 },
  { t: 0.4, value: 0.05 },
  { t: 0.56, value: 0.05 },
  { t: 0.64, value: 1 },
  { t: 0.93, value: 1 },
  { t: 0.945, value: 0 },
  { t: 1.0, value: 0 },
]

/** Propulsão é AR + ÁGUA: jato frio, sem chama. */
export const JET_KEYS: CHRKey[] = [
  { t: 0.0, value: 0 },
  { t: 0.395, value: 0 },
  { t: 0.42, value: 0.28 },
  { t: 0.46, value: 0.12 },
  { t: 0.5, value: 0.05 },
  { t: 0.92, value: 0.02 },
  { t: 0.94, value: 0.05 },
  { t: 0.95, value: 0.1 },
  { t: 0.955, value: 0.16 },
  { t: 0.97, value: 0.55 },
  { t: 0.98, value: 0.88 },
  { t: 0.99, value: 1 },
  { t: 1.0, value: 0.93 },
]

/** Fração de água visível dentro da garrafa (drena no lançamento). */
export const FILL_KEYS: CHRKey[] = [
  { t: 0.0, value: 0.5 },
  { t: 0.93, value: 0.48 },
  { t: 0.955, value: 0.44 },
  { t: 0.985, value: 0.08 },
  { t: 1.0, value: 0.03 },
]

export const TRACKS = {
  exposure: [
    { t: 0.0, value: 0.9 },
    { t: 0.2, value: 0.94 },
    { t: 0.465, value: 1.0 },
    { t: 0.69, value: 1.04 },
    { t: 0.865, value: 1.0 },
    { t: 0.9275, value: 0.97 },
    { t: 0.97, value: 1.06 },
    { t: 0.985, value: 1.2 },
    { t: 1.0, value: 1.12 },
  ] satisfies CHRKey[],
  key: [
    { t: 0.0, value: 1.0 },
    { t: 0.2, value: 1.05 },
    { t: 0.465, value: 1.15 },
    { t: 0.69, value: 1.12 },
    { t: 0.865, value: 1.05 },
    { t: 0.9275, value: 0.98 },
    { t: 0.965, value: 1.25 },
    { t: 1.0, value: 1.5 },
  ] satisfies CHRKey[],
  rim: [
    { t: 0.0, value: 0.42 },
    { t: 0.465, value: 0.55 },
    { t: 0.69, value: 0.5 },
    { t: 0.9275, value: 0.45 },
    { t: 0.985, value: 0.8 },
    { t: 1.0, value: 1.0 },
  ] satisfies CHRKey[],
  hemi: [
    { t: 0.0, value: 0.16 },
    { t: 0.465, value: 0.22 },
    { t: 1.0, value: 0.28 },
  ] satisfies CHRKey[],
  fogNear: [
    { t: 0.0, value: 3.0 },
    { t: 0.465, value: 4.0 },
    { t: 0.69, value: 5.5 },
    { t: 0.9275, value: 6.0 },
    { t: 1.0, value: 10 },
  ] satisfies CHRKey[],
  fogFar: [
    { t: 0.0, value: 20 },
    { t: 0.465, value: 28 },
    { t: 0.69, value: 40 },
    { t: 0.9275, value: 46 },
    { t: 1.0, value: 70 },
  ] satisfies CHRKey[],
  bg: [
    { t: 0.0, c: '#050a14' },
    { t: 0.2, c: '#071426' },
    { t: 0.6, c: '#08182c' },
    { t: 0.93, c: '#061220' },
    { t: 1.0, c: '#04090f' },
  ] as ColorKey[],
  stars: [
    { t: 0.0, value: 0.33 },
    { t: 0.2, value: 0.6 },
    { t: 0.6, value: 0.62 },
    { t: 0.93, value: 0.3 },
    { t: 0.97, value: 0.14 },
    { t: 1.0, value: 0.06 },
  ] satisfies CHRKey[],
  ground: [
    { t: 0.0, value: 1 },
    { t: 0.335, value: 1 },
    { t: 0.5, value: 0.55 },
    { t: 0.69, value: 0.5 },
    { t: 0.9, value: 0.4 },
    { t: 1.0, value: 0.2 },
  ] satisfies CHRKey[],
  stand: [
    { t: 0.0, value: 1 },
    { t: 0.335, value: 1 },
    { t: 0.43, value: 0.9 },
    { t: 0.5, value: 0 },
    { t: 1.0, value: 0 },
  ] satisfies CHRKey[],
  arc: [
    { t: 0.93, value: 0 },
    { t: 0.955, value: 0 },
    { t: 0.975, value: 0.5 },
    { t: 0.99, value: 1 },
    { t: 1.0, value: 0.92 },
  ] satisfies CHRKey[],
  halo: [
    { t: 0.94, value: 0 },
    { t: 0.97, value: 1 },
    { t: 1.0, value: 0.8 },
  ] satisfies CHRKey[],
  /**
   * "Luz de capítulo" impressa na água interna da garrafa: fria nas passagens
   * neutras, dourada na classificação (o momento da marca), reservada no
   * progresso e incandescente na preparação do lançamento. Escurecida a
   * 0 na decolagem — o clamor visual é do jato, não desta luz.
   */
  warm: [
    { t: 0.0, value: 0.32 },
    { t: 0.2, value: 0.22 },
    { t: 0.335, value: 0.28 },
    { t: 0.43, value: 0.5 },
    { t: 0.485, value: 0.85 },
    { t: 0.535, value: 0.62 },
    { t: 0.6, value: 0.42 },
    { t: 0.79, value: 0.3 },
    { t: 0.865, value: 0.24 },
    { t: 0.925, value: 0.35 },
    { t: 0.965, value: 0.7 },
    { t: 0.985, value: 0 },
    { t: 1.0, value: 0 },
  ] satisfies CHRKey[],
} as const