import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { drawCrtUi } from './crtUi'
import {
  CRT_FACE_CY,
  CRT_FACE_Z,
  CRT_FOOT_H,
  CRT_OPEN_CX,
  CRT_OPEN_CY,
  CRT_OPEN_H,
  CRT_OPEN_R,
  CRT_OPEN_W,
  CRT_PANEL_CX,
  CRT_PANEL_CY,
  CRT_PANEL_H,
  CRT_PANEL_W,
  CRT_POS,
  CRT_SCREEN_H,
  CRT_SCREEN_W,
  CRT_SHELL_H,
  CRT_SHELL_W,
  makeCrtScreenGeometry,
} from './officeGeometry'
import { CRT_H, CRT_W, office, registerScreenMesh } from './officeState'
import {
  makeCrtBackTexture,
  makeGraphiteTexture,
  makeObafogStickerTexture,
  makePrinterPlasticTexture,
} from './officeTextures'

/* ------------------------------------------------------------- CRT shader
 *
 * Estética analógica: estática granular, scanlines finas, perda de
 * sincronismo horizontal esporádica e "vertical hold" raro. Totalmente
 * procedural — nenhuma textura externa de estática.
 */

const CRT_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const CRT_FRAG = /* glsl */ `
precision highp float;
varying vec2 vUv;
uniform sampler2D uMap;
uniform float uTime;
uniform float uBarrel;
uniform float uVignette;
uniform float uScan;
uniform float uFlicker;
uniform float uNoise;
uniform float uGlitch;
uniform float uGlitchShift;
uniform float uSync;
uniform float uSyncY;
uniform float uSyncW;
uniform float uRoll;
uniform float uPower;
uniform float uGlow;
uniform vec2 uRes;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

void main() {
  vec2 uv = vUv;
  vec2 c = uv - 0.5;

  // barril — malha já é curva; aqui a distorção final do vidro
  float r2 = dot(c, c);
  uv = c * (1.0 + uBarrel * r2) + 0.5;

  // VERTICAL HOLD — a imagem inteira desliza em Y e sofre leve wrap (raro)
  vec2 sUV = uv;
  if (abs(uRoll) > 0.0001) {
    sUV.y = fract(uv.y + uRoll);
  }

  // SYNC LOSS — faixa horizontal que atravessa a tela deslocando em X
  float band = smoothstep(uSyncW, uSyncW * 0.35, abs(sUV.y - uSyncY)) * uSync;
  vec2 gUV = sUV;
  gUV.x = fract(sUV.x * 0.9 + 0.1 + band * (0.16 + 0.08 * hash(vec2(sUV.y, 0.5))));
  gUV.y = mix(sUV.y, (sUV.y + 0.12) * 0.86, band);

  vec2 baseUV = mix(sUV, gUV, band);
  vec4 col = texture2D(uMap, baseUV);

  // GLITCH — faixa horizontal fina com deslocamento + cromatismo
  float gband = step(0.5, fract(uv.y * 46.0 + uGlitchShift));
  vec4 g = col;
  if (gband < 0.5) {
    g = texture2D(uMap, vec2(fract(baseUV.x + uGlitch), baseUV.y));
    g.r = texture2D(uMap, vec2(fract(baseUV.x + uGlitch * 1.6), baseUV.y)).r;
    g.b = texture2D(uMap, vec2(fract(baseUV.x - uGlitch * 0.6), baseUV.y)).b;
  }
  col = mix(col, g, clamp(uGlitch * 3.0, 0.0, 1.0) * (1.0 - gband));

  // scanlines
  float scan = 0.86 + 0.14 * sin(uv.y * uScan * 3.1415926 * 2.0);

  // vinheta
  float d = distance(vUv, vec2(0.5));
  float vig = 1.0 - uVignette * smoothstep(0.35, 0.86, d);

  // cintilação (fósforo) + estática PIXELADA (células ~2px)
  float flick = 1.0 - uFlicker * 0.04;
  vec2 cells = floor(vUv * (uRes / 2.0));
  float n = hash(cells + floor(uTime * 10.0));
  float noiseAmt = uNoise * (n - 0.5) * 0.24;
  noiseAmt += (hash(vUv * 137.0 + floor(uTime * 24.0)) - 0.5) * uNoise * 0.05;

  float boot = uPower;
  float gost = pow(uPower, 3.0);

  vec3 outC = col.rgb * scan * vig * flick * (0.55 + 0.5 * gost);
  outC += vec3(noiseAmt);

  // pulso de sync nas bordas da faixa de sync-loss
  float pulse = band * (smoothstep(uSyncW, 0.0, abs(sUV.y - uSyncY)));
  outC += pulse * 0.10 * mix(vec3(0.9, 0.95, 1.0), vec3(0.4), band);

  // boot: linha horizontal expandindo
  float lineY = (1.0 - uPower) * 2.0 - 0.5;
  float lineW = 0.012 + (1.0 - uPower) * 0.004;
  float lineOn = step(uPower, 1.0) * step(abs(vUv.y - lineY), lineW) * (1.0 - step(1.0 - uPower, 0.0));
  outC = mix(outC, vec3(0.9), lineOn * (1.0 - boot));

  // fosforescência leve (sem bloom exagerado)
  outC *= 1.0 + (col.r * 0.9 + col.g * 0.3 + col.b * 0.5) * 0.05;

  // modo computador: pequena elevação de presença da tela (sem estourar)
  outC *= 1.0 + uGlow * 0.12;

  gl_FragColor = vec4(outC, 1.0);
}
`

function useCrtShader() {
  const material = useMemo(() => {
    const uniforms = {
      uMap: { value: null as THREE.CanvasTexture | null },
      uTime: { value: 0 },
      uBarrel: { value: 0.07 },
      uVignette: { value: 0.9 },
      uScan: { value: 320 },
      uFlicker: { value: 0.5 },
      uNoise: { value: 0.5 },
      uGlitch: { value: 0 },
      uGlitchShift: { value: 0 },
      uSync: { value: 0 },
      uSyncY: { value: 0.5 },
      uSyncW: { value: 0.06 },
      uRoll: { value: 0 },
      uPower: { value: 0 },
      uGlow: { value: 0 },
      uRes: { value: new THREE.Vector2(CRT_W, CRT_H) },
    }
    return new THREE.ShaderMaterial({
      vertexShader: CRT_VERT,
      fragmentShader: CRT_FRAG,
      uniforms,
      depthWrite: true,
      depthTest: true,
    })
  }, [])
  return material
}

/** Pré-desenho do fundo "montando" enquanto power-on não acabou. */
function bootOverlay(ctx: CanvasRenderingContext2D) {
  ctx.save()
  ctx.fillStyle = '#05120a'
  ctx.fillRect(0, 0, CRT_W, CRT_H)
  ctx.restore()
}

/* ---------------------------------- geometria da carcaça ---------------------------------- */

/** Retângulo arredondado em sentido anti-horário (contorno externo). */
function roundedRectPath(
  path: THREE.Shape | THREE.Path,
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
): void {
  const x0 = cx - w / 2
  const y0 = cy - h / 2
  path.moveTo(x0 + r, y0)
  path.lineTo(x0 + w - r, y0)
  path.quadraticCurveTo(x0 + w, y0, x0 + w, y0 + r)
  path.lineTo(x0 + w, y0 + h - r)
  path.quadraticCurveTo(x0 + w, y0 + h, x0 + w - r, y0 + h)
  path.lineTo(x0 + r, y0 + h)
  path.quadraticCurveTo(x0, y0 + h, x0, y0 + h - r)
  path.lineTo(x0, y0 + r)
  path.quadraticCurveTo(x0, y0, x0 + r, y0)
}

/** Mesmo retângulo, em sentido horário (furo). */
function roundedRectHole(
  hole: THREE.Path,
  cx: number,
  cy: number,
  w: number,
  h: number,
  r: number,
): void {
  const x0 = cx - w / 2
  const y0 = cy - h / 2
  hole.moveTo(x0 + r, y0 + h)
  hole.lineTo(x0 + w - r, y0 + h)
  hole.quadraticCurveTo(x0 + w, y0 + h, x0 + w, y0 + h - r)
  hole.lineTo(x0 + w, y0 + r)
  hole.quadraticCurveTo(x0 + w, y0, x0 + w - r, y0)
  hole.lineTo(x0 + r, y0)
  hole.quadraticCurveTo(x0, y0, x0, y0 + r)
  hole.lineTo(x0, y0 + h - r)
  hole.quadraticCurveTo(x0, y0 + h, x0 + r, y0 + h)
}

type FrameOpts = {
  outerW: number
  outerH: number
  outerR: number
  holeW: number
  holeH: number
  holeR: number
  holeCx?: number
  holeCy?: number
  depth: number
  bevel?: number
}

/**
 * Moldura extrudada com furo real (round-trip de profundidade): é o que dá o
 * "degrau" da carcaça → borda escura → moldura grafite → vidro (§7/§8).
 */
function extrudeFrame(o: FrameOpts): THREE.BufferGeometry {
  const outer = new THREE.Shape()
  roundedRectPath(outer, 0, 0, o.outerW, o.outerH, o.outerR)
  const hole = new THREE.Path()
  roundedRectHole(hole, o.holeCx ?? 0, o.holeCy ?? 0, o.holeW, o.holeH, o.holeR)
  outer.holes.push(hole)
  const bevel = o.bevel ?? 0.003
  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: o.depth,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 1,
    curveSegments: 12,
  })
  geo.translate(0, 0, -o.depth / 2)
  geo.computeVertexNormals()
  return geo
}

/* ------------------------------------------------------------- monitor */

export function CrtMonitor() {
  const shader = useCrtShader()
  const screenGeo = useMemo(
    () => makeCrtScreenGeometry(CRT_SCREEN_W, CRT_SCREEN_H, 0.05),
    [],
  )

  /* geometrias da carcaça */
  const frontFrameGeo = useMemo(
    () =>
      extrudeFrame({
        outerW: CRT_SHELL_W,
        outerH: CRT_SHELL_H,
        outerR: 0.07,
        holeW: CRT_OPEN_W,
        holeH: CRT_OPEN_H,
        holeR: CRT_OPEN_R,
        holeCx: CRT_OPEN_CX,
        holeCy: CRT_OPEN_CY - CRT_FACE_CY,
        depth: 0.055,
        bevel: 0.006,
      }),
    [],
  )
  const midShellGeo = useMemo(
    () =>
      extrudeFrame({
        outerW: CRT_SHELL_W - 0.012,
        outerH: CRT_SHELL_H - 0.034,
        outerR: 0.065,
        holeW: CRT_OPEN_W,
        holeH: CRT_OPEN_H,
        holeR: CRT_OPEN_R,
        holeCx: CRT_OPEN_CX,
        holeCy: CRT_OPEN_CY - CRT_FACE_CY,
        depth: 0.32,
        bevel: 0.004,
      }),
    [],
  )
  const darkTrimGeo = useMemo(
    () =>
      extrudeFrame({
        outerW: CRT_OPEN_W,
        outerH: CRT_OPEN_H,
        outerR: CRT_OPEN_R,
        holeW: CRT_OPEN_W - 0.02,
        holeH: CRT_OPEN_H - 0.02,
        holeR: CRT_OPEN_R - 0.006,
        depth: 0.02,
        bevel: 0.002,
      }),
    [],
  )
  const bezelGeo = useMemo(
    () =>
      extrudeFrame({
        outerW: CRT_OPEN_W - 0.018,
        outerH: CRT_OPEN_H - 0.018,
        outerR: CRT_OPEN_R - 0.005,
        holeW: CRT_SCREEN_W + 0.032,
        holeH: CRT_SCREEN_H + 0.032,
        holeR: 0.02,
        depth: 0.05,
        bevel: 0.003,
      }),
    [],
  )
  const glowRingGeo = useMemo(
    () =>
      extrudeFrame({
        outerW: CRT_SCREEN_W + 0.034,
        outerH: CRT_SCREEN_H + 0.034,
        outerR: 0.018,
        holeW: CRT_SCREEN_W + 0.024,
        holeH: CRT_SCREEN_H + 0.024,
        holeR: 0.016,
        depth: 0.004,
        bevel: 0,
      }),
    [],
  )

  /* texturas/materiais */
  const shellTex = useMemo(() => makePrinterPlasticTexture('base'), [])
  const shellLightTex = useMemo(() => makePrinterPlasticTexture('light'), [])
  const backTex = useMemo(() => makeCrtBackTexture(), [])
  const graphite = useMemo(() => makeGraphiteTexture(), [])
  const stickerTex = useMemo(() => makeObafogStickerTexture(), [])

  const shellMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: shellTex, roughness: 0.74, metalness: 0 }),
    [shellTex],
  )
  const shellTopMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: shellLightTex, roughness: 0.68, metalness: 0 }),
    [shellLightTex],
  )
  const backMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: backTex, roughness: 0.82, metalness: 0 }),
    [backTex],
  )
  const trimMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#131316', roughness: 0.52, metalness: 0.08 }),
    [],
  )
  const bezelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#2b2b2e', roughness: 0.55, metalness: 0.06 }),
    [],
  )
  const cavityMat = useMemo(
    () => new THREE.MeshStandardMaterial({ map: graphite, roughness: 0.85, metalness: 0 }),
    [graphite],
  )
  const panelMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#303033', roughness: 0.55, metalness: 0.06 }),
    [],
  )
  const chromeMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#c2c6cc', roughness: 0.3, metalness: 0.82 }),
    [],
  )
  const knobMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3a3a3d',
        roughness: 0.45,
        metalness: 0.16,
        flatShading: true,
      }),
    [],
  )
  const knobCapMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#26262a', roughness: 0.5, metalness: 0.12 }),
    [],
  )
  const grilleMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#3d3d40', roughness: 0.6, metalness: 0.12 }),
    [],
  )
  const leverMat = useMemo(
    () => new THREE.MeshStandardMaterial({ color: '#1c1c1e', roughness: 0.5, metalness: 0.05 }),
    [],
  )
  const ledMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#3a0f06',
        emissive: '#ff5e2a',
        emissiveIntensity: 0.9,
        toneMapped: false,
      }),
    [],
  )
  const glassMat = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        transparent: true,
        opacity: 0.09,
        roughness: 0.18,
        metalness: 0,
        color: '#cfe8e0',
        clearcoat: 1,
        clearcoatRoughness: 0.12,
        side: THREE.FrontSide,
      }),
    [],
  )
  const stickerMat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: stickerTex,
        transparent: true,
        roughness: 0.5,
        metalness: 0,
        depthWrite: true,
        alphaTest: 0.02,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    [stickerTex],
  )
  const ringMat = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: '#aaffe0',
        transparent: true,
        opacity: 0,
        toneMapped: false,
      }),
    [],
  )
  const shadowMat = useMemo(
    () => new THREE.MeshBasicMaterial({ map: makeContactShadowBlob(), transparent: true, depthWrite: false }),
    [],
  )

  // canvas + textura do sistema (480×360 → NearestFilter)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const texRef = useRef<THREE.CanvasTexture | null>(null)
  const powerRef = useRef(0)
  const powerDone = useRef(false)
  const glitchRemain = useRef(0)
  const glowRef = useRef(0)

  // schedulers da interferência
  const syncRemain = useRef(0)
  const syncTimer = useRef(6 + Math.random() * 8)
  const syncT = useRef(0)
  const rollRemain = useRef(0)
  const rollTimer = useRef(16 + Math.random() * 18)
  const rollRef = useRef(0)

  useFrame((_state, delta) => {
    const dt = Math.min(delta, 0.1)
    office.crtTime += dt

    if (!canvasRef.current) {
      const cv = document.createElement('canvas')
      cv.width = CRT_W
      cv.height = CRT_H
      canvasRef.current = cv
      const tex = new THREE.CanvasTexture(cv)
      tex.magFilter = THREE.NearestFilter
      tex.minFilter = THREE.NearestFilter
      tex.colorSpace = THREE.SRGBColorSpace
      tex.needsUpdate = true
      texRef.current = tex
      shader.uniforms.uMap.value = tex
    }
    const ctx = canvasRef.current.getContext('2d')
    if (!ctx) return

    // power-on: uma vez por visita
    if (!powerDone.current) {
      powerRef.current = Math.min(1, powerRef.current + dt * 1.55)
      office.crtPower = powerRef.current
      if (powerRef.current >= 1) {
        powerDone.current = true
        office.crtReady = true
      }
    }

    const interferencePaused = office.mode === 'qr-preview'

    // glitch fino (raro, nunca interrompe interações)
    if (interferencePaused) glitchRemain.current = 0
    if (glitchRemain.current > 0) {
      glitchRemain.current -= dt
      if (glitchRemain.current <= 0) {
        office.glitch = 0
        glitchRemain.current = 0
        office.glitchTimer = 8 + Math.random() * 10
      } else {
        shader.uniforms.uGlitch.value = 0.01 + Math.random() * 0.05
        shader.uniforms.uGlitchShift.value = Math.random()
      }
    } else {
      office.glitchTimer -= dt
      if (office.glitchTimer <= 0) {
        glitchRemain.current = 0.08 + Math.random() * 0.27
        office.glitch = 1
      } else {
        office.glitch = 0
      }
    }
    shader.uniforms.uGlitch.value = office.glitch > 0 ? shader.uniforms.uGlitch.value : 0

    // SYNC LOSS
    if (interferencePaused) syncRemain.current = 0
    if (syncRemain.current > 0) {
      syncRemain.current -= dt
      syncT.current += dt
      if (syncRemain.current <= 0) {
        shader.uniforms.uSync.value = 0
        syncRemain.current = 0
        syncTimer.current = 7 + Math.random() * 9
      } else {
        shader.uniforms.uSyncY.value = 0.12 + (syncT.current % 0.9) * 0.85
        shader.uniforms.uSync.value = 1
        shader.uniforms.uSyncW.value = 0.05 + Math.random() * 0.03
      }
    } else {
      syncTimer.current -= dt
      if (syncTimer.current <= 0) {
        syncRemain.current = 0.1 + Math.random() * 0.24
        syncT.current = 0
        syncTimer.current = 7 + Math.random() * 9
        shader.uniforms.uSync.value = 0
      } else {
        shader.uniforms.uSync.value = 0
      }
    }

    // VERTICAL HOLD
    if (interferencePaused) rollRemain.current = 0
    if (rollRemain.current > 0) {
      rollRemain.current -= dt
      if (rollRemain.current <= 0) {
        rollRef.current = 0
        rollRemain.current = 0
        rollTimer.current = 18 + Math.random() * 22
      } else {
        const cycle = Math.min(1, (1 - rollRemain.current / 0.5) * 1.2)
        const ease = cycle < 0.25 ? cycle / 0.25 : cycle < 0.75 ? 1 : (1 - cycle) / 0.25
        rollRef.current = 0.05 * ease * (rollRef.current < 0 ? -1 : 1) * (0.8 + Math.random() * 0.2)
        if (Math.random() < 0.4) rollRef.current *= -1
      }
      shader.uniforms.uRoll.value = rollRef.current
    } else {
      shader.uniforms.uRoll.value = 0
      rollTimer.current -= dt
      if (rollTimer.current <= 0) {
        rollRemain.current = 0.4 + Math.random() * 0.5
        rollRef.current = 0.04 + Math.random() * 0.05
        rollTimer.current = 18 + Math.random() * 22
      }
    }

    // cursor em pixels do CRT (vem do UV 0..1)
    const cursorPx =
      office.mode === 'computer'
        ? {
            x: Math.min(CRT_W - 2, Math.max(0, office.cursorUV.x * CRT_W)),
            y: Math.min(CRT_H - 2, Math.max(0, office.cursorUV.y * CRT_H)),
          }
        : null

    ctx.clearRect(0, 0, CRT_W, CRT_H)
    if (powerRef.current >= 1) {
      drawCrtUi(ctx, cursorPx, office.mousePressing)
    } else {
      bootOverlay(ctx)
    }
    if (texRef.current) texRef.current.needsUpdate = true

    shader.uniforms.uTime.value = office.crtTime
    shader.uniforms.uPower.value = easePower(powerRef.current, dt)
    shader.uniforms.uFlicker.value = flickerForMode()
    shader.uniforms.uNoise.value = noiseForMode()

    // realce do modo computador: o anel e o glow interno sobem juntos
    const targetGlow = office.mode === 'computer' ? 1 : 0
    glowRef.current += (targetGlow - glowRef.current) * clamp01(dt * 5)
    shader.uniforms.uGlow.value = glowRef.current
    ringMat.opacity = glowRef.current * 0.4
  })

  const zFace = CRT_FACE_Z
  const screenZ = zFace - 0.07
  const shellBottom = CRT_FOOT_H
  const shellTop = CRT_FOOT_H + CRT_SHELL_H

  /* knobs (chamado como função pura: sem remount por render) */
  const knob = (x: number, y: number, r: number, angle: number) => (
    <group position={[x, y, 0]}>
      {/* aro metálico */}
      <mesh position={[0, 0, zFace + 0.012]} rotation={[Math.PI / 2, 0, 0]} material={chromeMat} castShadow>
        <cylinderGeometry args={[r + 0.007, r + 0.007, 0.016, 24]} />
      </mesh>
      {/* corpo do knob, facetado (serrilhado mecânico) */}
      <mesh position={[0, 0, zFace + 0.026]} rotation={[Math.PI / 2, 0, 0]} material={knobMat} castShadow>
        <cylinderGeometry args={[r, r, 0.026, 18]} />
      </mesh>
      {/* centro escuro */}
      <mesh position={[0, 0, zFace + 0.042]} rotation={[Math.PI / 2, 0, 0]} material={knobCapMat}>
        <cylinderGeometry args={[r * 0.6, r * 0.6, 0.01, 20]} />
      </mesh>
      {/* indicador */}
      <mesh
        position={[0, r * 0.34, zFace + 0.048]}
        rotation={[0, 0, angle]}
        material={shellTopMat}
      >
        <boxGeometry args={[0.005, r * 0.7, 0.005]} />
      </mesh>
    </group>
  )

  return (
    <group position={[CRT_POS[0], office.deskTopY, CRT_POS[2]]}>
      {/* ===== carcaça frontal (creme, com furo real da tela) ===== */}
      <mesh geometry={frontFrameGeo} position={[0, CRT_FACE_CY, zFace - 0.0275]} castShadow receiveShadow material={shellMat} />
      {/* ===== paredes/topo/fundo da carcaça (creme) ===== */}
      <mesh geometry={midShellGeo} position={[0, CRT_FACE_CY, 0.035]} castShadow receiveShadow material={shellMat} />

      {/* ===== traseira volumosa e afunilada (silhueta de tubo) ===== */}
      <RoundedBox
        args={[CRT_SHELL_W - 0.16, CRT_SHELL_H - 0.16, 0.13]}
        radius={0.05}
        smoothness={4}
        position={[0, CRT_FACE_CY - 0.012, -0.19]}
        castShadow
        receiveShadow
        material={shellMat}
      />
      <mesh position={[0, CRT_FACE_CY - 0.012, -0.256]} material={backMat}>
        <planeGeometry args={[0.5, 0.34]} />
      </mesh>

      {/* ===== peça/handle superior discreta ===== */}
      <RoundedBox
        args={[0.24, 0.014, 0.05]}
        radius={0.006}
        smoothness={3}
        position={[0, shellTop + 0.004, 0.02]}
        castShadow
        material={shellTopMat}
      />
      {/* ===== ranhuras de ventilação no topo (traseira) ===== */}
      {[0, 1, 2, 3, 4].map((i) => (
        <mesh key={i} position={[0, shellTop - 0.016, -0.03 - i * 0.022]} material={trimMat}>
          <boxGeometry args={[0.12, 0.004, 0.008]} />
        </mesh>
      ))}

      {/* ===== montagem da tela: degraus carcaça → borda escura → grafite → vidro ===== */}
      <mesh geometry={darkTrimGeo} position={[CRT_OPEN_CX, CRT_OPEN_CY, 0.186]} material={trimMat} />
      <mesh geometry={bezelGeo} position={[CRT_OPEN_CX, CRT_OPEN_CY, 0.159]} castShadow material={bezelMat} />
      {/* cavidade interna escura (fecha o túnel do tubo) */}
      <mesh position={[CRT_OPEN_CX, CRT_OPEN_CY, 0.103]} material={cavityMat}>
        <boxGeometry args={[CRT_OPEN_W - 0.01, CRT_OPEN_H - 0.01, 0.05]} />
      </mesh>

      {/* ===== TELA — vidro de tubo convexo ===== */}
      <mesh
        geometry={screenGeo}
        material={shader}
        position={[CRT_OPEN_CX, CRT_OPEN_CY, screenZ]}
        ref={(m) => {
          if (m) registerScreenMesh(m)
        }}
      />
      {/* vidro: brilho sutil que acompanha a curvatura */}
      <mesh geometry={screenGeo} position={[CRT_OPEN_CX, CRT_OPEN_CY, screenZ + 0.004]} material={glassMat} />
      <mesh geometry={glowRingGeo} position={[CRT_OPEN_CX, CRT_OPEN_CY, screenZ + 0.01]} material={ringMat} />

      {/* ===== painel de controles (direita, grafite) ===== */}
      <RoundedBox
        args={[CRT_PANEL_W, CRT_PANEL_H, 0.03]}
        radius={0.012}
        smoothness={4}
        position={[CRT_PANEL_CX, CRT_PANEL_CY, zFace + 0.004]}
        castShadow
        material={panelMat}
      />

      {/* seletor superior (maior) */}
      {knob(CRT_PANEL_CX, CRT_PANEL_CY + 0.15, 0.04, -0.5)}
      {/* seletor inferior (menor) */}
      {knob(CRT_PANEL_CX, CRT_PANEL_CY + 0.005, 0.031, 0.9)}

      {/* grade de alto-falante (ripas horizontais) */}
      <mesh position={[CRT_PANEL_CX, CRT_PANEL_CY - 0.155, zFace + 0.016]} material={trimMat}>
        <boxGeometry args={[0.105, 0.18, 0.012]} />
      </mesh>
      {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
        <mesh
          key={i}
          position={[CRT_PANEL_CX, CRT_PANEL_CY - 0.155 + i * 0.019, zFace + 0.024]}
          material={grilleMat}
        >
          <boxGeometry args={[0.098, 0.006, 0.008]} />
        </mesh>
      ))}

      {/* indicador físico discreto */}
      <mesh position={[CRT_PANEL_CX, CRT_PANEL_CY - 0.058, zFace + 0.020]} material={leverMat}>
        <cylinderGeometry args={[0.007, 0.007, 0.006, 12]} />
      </mesh>
      <mesh
        position={[CRT_PANEL_CX, CRT_PANEL_CY - 0.058, zFace + 0.024]}
        rotation={[Math.PI / 2, 0, 0]}
        material={ledMat}
      >
        <circleGeometry args={[0.0034, 12]} />
      </mesh>

      {/* ===== controles mecânicos inferiores (pequenos sliders) ===== */}
      {[-0.24, -0.19, -0.14, -0.09].map((x, i) => (
        <group key={i} position={[x, shellBottom + 0.045, zFace + 0.002]}>
          <mesh material={trimMat}>
            <boxGeometry args={[0.013, 0.05, 0.008]} />
          </mesh>
          <mesh position={[0, (i - 1.5) * 0.012, 0.006]} material={leverMat}>
            <boxGeometry args={[0.019, 0.011, 0.012]} />
          </mesh>
        </group>
      ))}

      {/* ===== adesivo OBAFOG (frontal, canto inferior esquerdo) ===== */}
      <mesh position={[-0.325, shellBottom + 0.046, zFace + 0.008]} material={stickerMat}>
        <planeGeometry args={[0.15, 0.075]} />
      </mesh>

      {/* ===== base/plinto que fecha a carcaça até os pés ===== */}
      <RoundedBox
        args={[0.74, 0.024, 0.4]}
        radius={0.008}
        smoothness={2}
        position={[0, 0.027, -0.01]}
        castShadow
        material={shellMat}
      />

      {/* ===== pés (separação da mesa + contact shadow) ===== */}
      <RoundedBox
        args={[0.62, CRT_FOOT_H, 0.06]}
        radius={0.007}
        smoothness={2}
        position={[0, CRT_FOOT_H / 2, 0.15]}
        castShadow
        material={trimMat}
      />
      <RoundedBox
        args={[0.62, CRT_FOOT_H, 0.06]}
        radius={0.007}
        smoothness={2}
        position={[0, CRT_FOOT_H / 2, -0.15]}
        castShadow
        material={trimMat}
      />
      <mesh position={[0, 0.001, 0]} rotation={[-Math.PI / 2, 0, 0]} material={shadowMat}>
        <planeGeometry args={[0.82, 0.54]} />
      </mesh>
    </group>
  )
}

function easePower(p: number, _dt: number): number {
  return Math.min(1, p * (1.6 - 0.6 * p))
}

function flickerForMode(): number {
  if (office.mode !== 'computer') return 0.55
  return 0.25
}

function noiseForMode(): number {
  let n = 0.4
  if (office.glitch > 0 || office.crtPower < 1) n = 0.62
  if (office.mode !== 'computer') n += 0.12
  return Math.min(0.85, n)
}

function clamp01(x: number): number {
  return x < 0 ? 0 : x > 1 ? 1 : x
}

/** Blob de sombra de contato — cache estático (só o material leva a textura). */
let _shadowTex: THREE.CanvasTexture | null = null
function makeContactShadowBlob(): THREE.CanvasTexture {
  if (_shadowTex) return _shadowTex
  const size = 64
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.1, size / 2, size / 2, size * 0.5)
  g.addColorStop(0, 'rgba(10,6,3,0.55)')
  g.addColorStop(0.45, 'rgba(10,6,3,0.28)')
  g.addColorStop(0.8, 'rgba(10,6,3,0.1)')
  g.addColorStop(1, 'rgba(10,6,3,0)')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  const tex = new THREE.CanvasTexture(c)
  _shadowTex = tex
  return tex
}
