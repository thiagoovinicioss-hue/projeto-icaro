export type Vec3 = [number, number, number]
export type CHRKey = { t: number; value: number }
export type ColorKey = { t: number; c: string }

export type CameraKnot = { t: number; pos: Vec3; target: Vec3; fov: number }
export type RocketKnot = { t: number; pos: Vec3; yaw: number; pitch: number }

export type DeviceTier = 'desktop' | 'tablet' | 'mobile'

export type CompositionStage = {
  id: string
  label: string
  t: number
  /** banda NDC esperada para o centro do foguete em X (ex.: +0.35 = terço direito) */
  xBand: [number, number]
}