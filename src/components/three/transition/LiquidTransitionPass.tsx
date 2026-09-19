import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { transitionState as state } from '../../../story/transition/stageState'
import { sampleEmission, type EmitterHistory } from '../../../story/transition/emissionHistory'

const vertex = `varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`
const fragment = `
precision highp float;
uniform float uCoverage; uniform float uProgress; uniform float uAspect;
uniform vec2 uOrigins[12]; varying vec2 vUv;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
float fbm(vec2 p){float n=0.,a=.5;for(int i=0;i<4;i++){n+=noise(p)*a;p=mat2(.8,.6,-.6,.8)*p*2.03+3.1;a*=.5;}return n;}
float smin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;}
float field(vec2 q){
 float time=uProgress*3.6;
 vec2 warp=vec2(fbm(q*1.7+time),fbm(q*1.7-time+7.));
 vec2 w=q*1.9+warp*1.5+vec2(time*.7,-time);
 float ripple=sin(w.x*5.+sin(w.y*3.1))*0.16+sin(w.y*7.+w.x*2.)*.065;
 return fbm(w)*.65+ripple;
}
void main(){
 vec2 q=vUv*vec2(uAspect,1.);
 float time=uProgress*3.6;
 float breakup=fbm(q*8.+vec2(time,-time*1.4));
 float d=10.;
 float screenScale=min(1.,uAspect);
 float growth=pow(uCoverage,1.25)*.88*screenScale;
 for(int i=0;i<12;i++){
   float seed=float(i);
   vec2 center=uOrigins[i]*vec2(uAspect,1.);
   center+=vec2(sin(seed*2.7+time),cos(seed*3.4-time))*.026*uCoverage;
   vec2 delta=q-center;
   float radius=growth*(.64+.24*sin(seed*4.13))+.012*screenScale;
   float blob=length(delta*vec2(1.,.82+sin(seed)*.14))-radius;
   d=smin(d,blob,.11*screenScale);
 }
 d+=(breakup-.48)*.135*(.25+uCoverage)*screenScale;
 d-=smoothstep(.92,1.,uCoverage)*1.5;
 float alpha=1.-smoothstep(-.003,.003,d);
 // An explicit opaque hold, not an almost-full noisy mask with pinholes.
 alpha=mix(alpha,1.,step(.999,uCoverage));
 alpha*=smoothstep(0.,.025,uCoverage);
 if(alpha<.001) discard;
 float h=field(q);
 vec2 slope=vec2(field(q+vec2(.003,0))-h,field(q+vec2(0,.003))-h)/.003;
 vec3 normal=normalize(vec3(-slope*.25,1.));
 float spec=pow(max(0.,dot(normal,normalize(vec3(-.5,.7,1.2)))),14.);
 float reflection=pow(1.-abs(normal.z),2.);
 float folds=pow(1.-abs(sin(h*17.+q.x*1.8)),12.);
 vec3 deep=vec3(.045,.085,.115);
 vec3 silver=vec3(.40,.51,.55);
 vec3 water=mix(deep,silver,clamp(h*.9+.12+reflection*.55,0.,1.));
 water+=vec3(.55,.64,.67)*spec*.72;
 water+=vec3(.30,.40,.43)*folds*.12;
 // Fresnel on the advancing meniscus, with a narrow dark underside.
 float rim=exp(-abs(d+.005)*125.);
 water=mix(water,vec3(.72,.82,.85),rim*.72);
 water*=1.-exp(-abs(d+.025)*95.)*.22;
 vec2 cell=q*33.; vec2 id=floor(cell); vec2 local=fract(cell)-.5;
 float radius=.035+hash(id)*.13;
 float bubble=exp(-abs(length(local)-radius)*100.)*step(.88,hash(id+7.));
 water+=bubble*vec3(.20,.25,.26);
 gl_FragColor=vec4(water,alpha);
}`
/** A screen-space liquid sheet, deliberately opaque during the content handoff. */
export function LiquidTransitionPass({ history }: { history: EmitterHistory }) {
  const mesh = useRef<THREE.Mesh>(null)
  const data = useMemo(() => ({
    point: new THREE.Vector3(), direction: new THREE.Vector3(),
    material: new THREE.ShaderMaterial({ vertexShader: vertex, fragmentShader: fragment, transparent: true, depthTest: false, depthWrite: false, uniforms: {
      uCoverage: { value: 0 }, uProgress: { value: 0 }, uAspect: { value: 1 },
      uOrigins: { value: Array.from({ length: 12 }, () => new THREE.Vector2()) },
    } }),
  }), [])
  useEffect(() => () => data.material.dispose(), [data])
  useFrame(({ camera, size }) => {
    const live = state.debugStep >= 4 && state.visual.coverage > 0
    if (mesh.current) mesh.current.visible = live
    if (!live) return
    const u = data.material.uniforms
    u.uCoverage.value = state.visual.coverage
    u.uProgress.value = state.visual.p
    u.uAspect.value = size.width / size.height
    for (let i = 0; i < 12; i++) {
      sampleEmission(history, 0.30 + i / 11 * 0.25, data.point, data.direction)
      data.point.project(camera)
      u.uOrigins.value[i].set((data.point.x + 1) / 2, (data.point.y + 1) / 2)
    }
  })
  return <mesh ref={mesh} material={data.material} frustumCulled={false} renderOrder={40} name="LiquidTransitionPass"><planeGeometry args={[2, 2]} /></mesh>
}
