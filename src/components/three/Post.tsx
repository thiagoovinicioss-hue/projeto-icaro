import { EffectComposer, Bloom, Vignette, SMAA } from '@react-three/postprocessing'
import { quality } from '../../utils/sim'

/**
 * Pós-leve: bloom só no que brilha (o dólar/arco no clímax), vinheta discreta
 * e SMAA. O resultado tem que ser "fotografia", não "demo de shader".
 */
export function Post() {
  if (!quality.post) return null
  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={0.45}
        luminanceThreshold={0.95}
        luminanceSmoothing={0.35}
        mipmapBlur
        radius={0.8}
      />
      <Vignette offset={0.28} darkness={0.34} />
      <SMAA />
    </EffectComposer>
  )
}