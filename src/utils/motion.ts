export type DeviceProfile = {
  isMobile: boolean
  reducedMotion: boolean
  dprCap: number
  shadows: boolean
  post: boolean
  particles: number
  quality: 'low' | 'medium' | 'high'
}

const QUERIES = {
  reducedMotion: '(prefers-reduced-motion: reduce)',
  noFinePointer: '(hover: none), (pointer: coarse)',
}

function guessMobile(): boolean {
  if (typeof window === 'undefined') return false
  const ua = navigator.userAgent
  const coarse = window.matchMedia(QUERIES.noFinePointer).matches
  return coarse || /Android|iPhone|iPad|iPod|Mobile/i.test(ua)
}

function memoryLowerBound(): number {
  const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory
  return typeof mem === 'number' && mem > 0 ? mem : 4
}

function cores(): number {
  return Math.max(1, navigator.hardwareConcurrency || 4)
}

export function detectDeviceProfile(): DeviceProfile {
  const isMobile = guessMobile()
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia(QUERIES.reducedMotion).matches

  let quality: DeviceProfile['quality'] = 'high'
  if (isMobile || reducedMotion || memoryLowerBound() <= 2 || cores() <= 2) {
    quality = 'medium'
  }
  if (((isMobile && memoryLowerBound() <= 2)) || cores() <= 2) {
    quality = 'low'
  }

  const dpr =
    typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const dprCap = quality === 'high' ? 2 : quality === 'medium' ? 1.5 : 1.25

  return {
    isMobile,
    reducedMotion,
    dprCap: Math.min(dpr, dprCap),
    shadows: quality === 'high' && !isMobile,
    post: quality !== 'low',
    particles: quality === 'low' ? 350 : isMobile ? 900 : 1600,
    quality,
  }
}