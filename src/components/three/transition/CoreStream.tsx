import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { transitionConfig as config } from '../../../story/transition/config'
import { transitionState as state, ease } from '../../../story/transition/stageState'
import { sampleEmission, type EmitterHistory } from '../../../story/transition/emissionHistory'

const vertex = `
attribute float strand;
varying vec2 vUv; varying float vStrand;
void main(){vUv=uv;vStrand=strand;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`
const fragment = `
uniform float uProgress; uniform float uOpacity;
varying vec2 vUv; varying float vStrand;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
void main(){
 float age=vUv.y, flow=age*31.-uProgress*140.+vStrand*3.9;
 float n=noise(vec2(flow,vStrand*9.));
 float crossSection=(vUv.x-.5)*2.;
 float edge=abs(crossSection + sin(flow*1.7)*.11*age);
 float silhouette=1.-smoothstep(.64+n*.18,1.,edge);
 // A refractive cylinder: dark underside, clear center, narrow grazing reflection.
 float glint=exp(-pow((crossSection+.42+sin(flow)*.12)*13.,2.));
 float rim=exp(-pow((edge-.82)*19.,2.));
 float fracture=smoothstep(age*.52,age*.52+.18,n);
 float thin=1.-smoothstep(.68,1.,age);
 vec3 col=mix(vec3(.28,.39,.43),vec3(.82,.91,.94),clamp(glint+rim*.53,0.,1.));
 float alpha=(.28+glint*.62+rim*.27)*silhouette*thin;
 alpha*=mix(1.,fracture,smoothstep(.08,.7,age))*uOpacity;
 gl_FragColor=vec4(col,alpha);
}`

/** Several bounded, soft-edged filaments, reconstructed from nozzle history.
 * No static cone, stretched triangle or frame-rate-dependent particle integration.
 */
export function CoreStream({ history }: { history: EmitterHistory }) {
  const mesh = useRef<THREE.Mesh>(null)
  const data = useMemo(() => {
    const count = config.trailSamples, strands = config.trailStrands
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(count * strands * 6)
    const uv = new Float32Array(count * strands * 4), ids = new Float32Array(count * strands * 2)
    const indices: number[] = []
    for (let s = 0; s < strands; s++) for (let i = 0; i < count; i++) {
      const v = (s * count + i) * 2
      uv.set([0, i / (count - 1), 1, i / (count - 1)], v * 2)
      ids.set([s, s], v)
      if (i < count - 1) indices.push(v, v + 1, v + 2, v + 1, v + 3, v + 2)
    }
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage))
    geometry.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    geometry.setAttribute('strand', new THREE.BufferAttribute(ids, 1)); geometry.setIndex(indices)
    const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, side: THREE.DoubleSide, uniforms: { uProgress: { value: 0 }, uOpacity: { value: 0 } } })
    return { geometry, material, point: new THREE.Vector3(), direction: new THREE.Vector3(), side: new THREE.Vector3() }
  }, [])
  useEffect(() => () => { data.geometry.dispose(); data.material.dispose() }, [data])
  useFrame(() => {
    const p = state.visual.p
    const live = state.debugStep >= 2 && state.visual.water > 0 && history.samples.length > 0
    if (mesh.current) mesh.current.visible = live
    if (!live) return
    const { geometry, material, point, direction, side } = data
    const attr = geometry.attributes.position as THREE.BufferAttribute
    const head = Math.min(p, config.emissionRange[1])
    const opening = ease(.38, .60, p)
    for (let s = 0; s < config.trailStrands; s++) for (let i = 0; i < config.trailSamples; i++) {
      const age = i / (config.trailSamples - 1)
      const birth = Math.max(config.emissionRange[0], head - age * config.trailDuration)
      const elapsed = p - birth
      sampleEmission(history, birth, point, direction)
      point.addScaledVector(direction, elapsed * config.stream.exhaustSpeed)
      point.y -= elapsed * elapsed * config.stream.gravity
      side.set(-direction.y, direction.x, 0).normalize()
      const filament = (s - (config.trailStrands - 1) / 2) / config.trailStrands
      const spread = age ** 1.5 * config.stream.spread * (1 + opening * 3)
      point.addScaledVector(side, spread * (filament + Math.sin(age * 18 - p * 70 + s * 2) * .17))
      point.z += Math.sin(age * 11 + s * 2) * spread * .12
      const width = config.trailWidth * (.45 + age * (1.1 + opening)) * (.8 + Math.sin(age * 53 - p * 110 + s) * .2)
      const index = (s * config.trailSamples + i) * 2
      for (let j = 0; j < 2; j++) attr.setXYZ(index + j, point.x + side.x * width * (j * 2 - 1), point.y + side.y * width * (j * 2 - 1), point.z)
    }
    attr.needsUpdate = true
    material.uniforms.uProgress.value = p
    material.uniforms.uOpacity.value = state.visual.water * config.stream.opacity
  }, -1)
  return <mesh ref={mesh} name="water-core-filaments" geometry={data.geometry} material={data.material} frustumCulled={false} renderOrder={30} />
}
