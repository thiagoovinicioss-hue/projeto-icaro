import * as THREE from 'three'

/**
 * Desmontagem real da experiência 3D (§12): varre a cena e libera geometrias,
 * materiais, texturas (incluindo as que vivem em uniforms de ShaderMaterial),
 * os targets da textura do CRT e o próprio renderer. Chamado apenas em
 * produção — no dev, o React StrictMode remonta o Canvas e a limpeza
 * antecipada quebraria a cena na segunda passada.
 */
export function disposeSceneDeep(scene: THREE.Scene, gl: THREE.WebGLRenderer): void {
  const geometries = new Set<THREE.BufferGeometry>()
  const materials = new Set<THREE.Material>()
  const textures = new Set<THREE.Texture>()

  scene.traverse((obj) => {
    const mesh = obj as THREE.Mesh
    if (mesh.geometry) geometries.add(mesh.geometry)
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => materials.add(m))
    } else if (mesh.material) {
      materials.add(mesh.material)
    }
  })

  materials.forEach((mat) => {
    const m = mat as THREE.MeshStandardMaterial & { uniforms?: Record<string, { value: unknown }> }
    if (m.map) textures.add(m.map)
    if (m.emissiveMap) textures.add(m.emissiveMap)
    if (m.normalMap) textures.add(m.normalMap)
    if (m.roughnessMap) textures.add(m.roughnessMap)
    if (m.metalnessMap) textures.add(m.metalnessMap)
    if (m.aoMap) textures.add(m.aoMap)
    if (m.alphaMap) textures.add(m.alphaMap)
    if (m.bumpMap) textures.add(m.bumpMap)
    if (m.displacementMap) textures.add(m.displacementMap)
    // ShaderMaterial: texturas em uniforms (ex.: CanvasTexture do CRT)
    if (m.uniforms) {
      for (const key of Object.keys(m.uniforms)) {
        const value = m.uniforms[key].value
        if (value instanceof THREE.Texture) textures.add(value)
      }
    }
    mat.dispose()
  })

  geometries.forEach((g) => g.dispose())
  textures.forEach((t) => t.dispose())

  try {
    gl.dispose()
    gl.forceContextLoss()
  } catch {
    /* contexto já perdido em outro lugar — sem problema */
  }
}