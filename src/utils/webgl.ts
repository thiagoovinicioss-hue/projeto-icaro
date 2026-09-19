/** True when the browser exposes a usable WebGL context (2 → 1 fallback). */
export function supportsWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
    return Boolean(gl)
  } catch {
    return false
  }
}