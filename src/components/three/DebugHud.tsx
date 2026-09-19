import { useEffect, useRef } from 'react'
import { probe, quality, sim, setStagePin } from '../../utils/sim'

function findParam(key: string): string | null {
  if (typeof window === 'undefined') return null
  return new URLSearchParams(window.location.search).get(key)
}

/**
 * Overlay de depuração — só ativo com ?debug3d=1?stage3d=X. Mostra exact/
 * smooth progress, capítulo, câmera, foguete, FPS, draw calls e triângulos,
 * e congela o mundo num still (stage3d) para auditoria das 5 composições.
 * Nunca aparece em produção normal (sem o param nada monta).
 */
export function DebugHud() {
  const ref = useRef<HTMLPreElement>(null)

  useEffect(() => {
    ;(globalThis as unknown as { __icaro?: unknown }).__icaro = { probe, quality, sim }
  }, [])

  useEffect(() => {
    const param = findParam('stage3d')
    if (param !== null) {
      const v = parseFloat(param)
      setStagePin(Number.isFinite(v) ? v : 0)
    }
  }, [])

  useEffect(() => {
    let raf = 0
    const loop = () => {
      const el = ref.current
      if (el) {
        el.textContent = [
          `t   exact ${probe.t.toFixed(3)} stage ${probe.stageId}`,
          `cam ${probe.camera.x.toFixed(2)},${probe.camera.y.toFixed(2)},${probe.camera.z.toFixed(2)} fov ${probe.camera.fov.toFixed(1)}`,
          `tgt ${probe.camera.tx.toFixed(2)},${probe.camera.ty.toFixed(2)},${probe.camera.tz.toFixed(2)}`,
          `rkt ${probe.rocket.x.toFixed(2)},${probe.rocket.y.toFixed(2)},${probe.rocket.z.toFixed(2)}`,
          `scr ${probe.rocketScreen.x.toFixed(3)},${probe.rocketScreen.y.toFixed(3)} t${probe.rocketScreen.topY.toFixed(2)} b${probe.rocketScreen.bottomY.toFixed(2)}`,
          `fps ${probe.fps.toFixed(0)}  calls ${probe.drawCalls}  tris ${probe.triangles}`,
          `jet ${probe.jet.toFixed(2)}  fill ${probe.fill.toFixed(2)}`,
        ].join('\n')
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <pre
      ref={ref}
      style={{
        position: 'fixed',
        bottom: 12,
        left: 12,
        zIndex: 9999,
        margin: 0,
        padding: '8px 10px',
        background: 'rgba(2,8,18,0.82)',
        color: '#9ff0c8',
        font: '11px/1.45 "Space Mono", monospace',
        pointerEvents: 'none',
        border: '1px solid rgba(246,183,60,0.35)',
        borderRadius: 6,
        whiteSpace: 'pre',
      }}
    />
  )
}