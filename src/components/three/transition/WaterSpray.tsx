import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { transitionConfig as config } from '../../../story/transition/config'
import { seededRandom, transitionState as state, ease } from '../../../story/transition/stageState'
import { sampleEmission, type EmitterHistory } from '../../../story/transition/emissionHistory'

const vertex = `
attribute vec3 origin; attribute vec3 velocity;
attribute float birth; attribute float lifetime; attribute float radius; attribute float seed;
uniform float uProgress; uniform float uOpacity; uniform float uGravity; uniform float uMist;
varying vec2 vUv; varying float vAlpha; varying float vSeed;
void main(){
 float age=max(0.,uProgress-birth), life=clamp(age/lifetime,0.,1.);
 vec3 center=origin+velocity*age; center.y-=age*age*uGravity;
 vec4 mv=modelViewMatrix*vec4(center,1.);
 vec2 direction=normalize((modelViewMatrix*vec4(velocity,0.)).xy+vec2(.0001));
 vec2 side=vec2(direction.y,-direction.x);
 float stretch=mix(1.12+seed*.65,1.,uMist);
 mv.xy+=(side*position.x+direction*position.y*stretch)*radius;
 gl_Position=projectionMatrix*mv;
 vUv=uv;vSeed=seed;
 vAlpha=step(birth,uProgress)*(1.-step(lifetime,age))*smoothstep(0.,.06,life)*(1.-smoothstep(.40,1.,life))*uOpacity;
}`
const fragment = `
uniform float uMist; varying vec2 vUv; varying float vAlpha; varying float vSeed;
void main(){
 vec2 q=vUv*2.-1.; float r2=dot(q,q); if(r2>1.) discard;
 float z=sqrt(1.-r2);
 float fresnel=pow(1.-z,3.);
 float light=pow(max(0.,dot(vec3(q,z),normalize(vec3(-.45,.65,1.)))),28.);
 float rim=exp(-pow((sqrt(r2)-.84)*18.,2.));
 float alpha=(.08+rim*.36+light*.87)*(1.-smoothstep(.90,1.,r2));
 vec3 col=mix(vec3(.24,.36,.42),vec3(.91,.97,.99),clamp(light+fresnel*.7,0.,1.));
 if(uMist>.5){alpha=exp(-r2*4.5)*.085;col=vec3(.64,.77,.81);}
 gl_FragColor=vec4(col,alpha*vAlpha);
}`

/** Ballistic, seeded droplets. Quads have a bounded aspect, never spear geometry.
 * Spray and micro-mist share births, but have distinct scale/dispersion/opacity.
 */
export function WaterSpray({ history, mist = false }: { history: EmitterHistory; mist?: boolean }) {
  const mesh = useRef<THREE.Mesh>(null)
  const lastHistory = useRef<EmitterHistory['samples'] | null>(null)
  const data = useMemo(() => {
    const count = mist ? config.mistDensity : config.sprayDensity
    const base = new THREE.PlaneGeometry(2, 2)
    const geometry = new THREE.InstancedBufferGeometry()
    geometry.index = base.index
    geometry.setAttribute('position', base.attributes.position)
    geometry.setAttribute('uv', base.attributes.uv)
    for (const [name, size] of [['origin', 3], ['velocity', 3], ['birth', 1], ['lifetime', 1], ['radius', 1], ['seed', 1]] as const) geometry.setAttribute(name, new THREE.InstancedBufferAttribute(new Float32Array(count * size), size))
    geometry.instanceCount = count
    const material = new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthWrite: false, uniforms: { uProgress: { value: 0 }, uOpacity: { value: 0 }, uGravity: { value: config.spray.gravity }, uMist: { value: mist ? 1 : 0 } } })
    return { geometry, base, material, count }
  }, [mist])
  useEffect(() => () => { data.geometry.dispose(); data.base.dispose(); data.material.dispose() }, [data])
  useFrame(() => {
    if (history.samples !== lastHistory.current && history.samples.length) {
      lastHistory.current = history.samples
      const random = seededRandom(config.seed + (mist ? 31 : 0))
      const position = new THREE.Vector3(), direction = new THREE.Vector3(), side = new THREE.Vector3()
      const a = data.geometry.attributes, tuning = config.spray
      for (let i = 0; i < data.count; i++) {
        const fraction = (i + random()) / data.count
        const birth = config.emissionRange[0] + (.35 * fraction + .65 * Math.sqrt(fraction)) * (config.emissionRange[1] - config.emissionRange[0])
        const opening = ease(.34, .59, birth)
        sampleEmission(history, birth, position, direction)
        side.set(-direction.y, direction.x, 0).normalize()
        const spread = (random() * 2 - 1) * (tuning.spread[0] + opening * tuning.spread[1])
        direction.multiplyScalar(tuning.speed[0] + random() * tuning.speed[1]).addScaledVector(side, spread * (mist ? 1.25 : 1))
        direction.z += (random() - .35) * (4 + opening * 22)
        a.origin.setXYZ(i, position.x, position.y, position.z)
        a.velocity.setXYZ(i, direction.x, direction.y, direction.z)
        a.birth.setX(i, birth)
        a.lifetime.setX(i, tuning.lifetime[0] + random() * tuning.lifetime[1])
        a.radius.setX(i, mist ? .065 + random() * .19 : tuning.radius[0] + random() ** 3 * tuning.radius[1])
        a.seed.setX(i, random())
      }
      Object.values(a).forEach(attr => { attr.needsUpdate = true })
    }
    if (mesh.current) mesh.current.visible = state.debugStep >= 3 && state.visual.water > 0
    data.material.uniforms.uProgress.value = state.visual.p
    data.material.uniforms.uOpacity.value = state.visual.water
  })
  return <mesh ref={mesh} name={mist ? 'water-micro-mist' : 'water-secondary-spray'} geometry={data.geometry} material={data.material} frustumCulled={false} renderOrder={mist ? 29 : 31} />
}
