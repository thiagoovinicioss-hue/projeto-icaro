import { useEffect, useRef } from 'react'
import { quality, sim } from '../utils/sim'

/**
 * Grava valores derivados do relógio do mundo direto no DOM a cada frame
 * (via ref, sem re-render). Para elementos contínuos como a linha de
 * progresso da narrativa — o estado visual segue sim.smooth/sim.target, a
 * mesma fonte de verdade do 3D. Em reduced-motion escreve uma só vez.
 */
export function useSimFrame(fn: (smooth: number, target: number, chapterIndex: number) => void): void {
  const ref = useRef(fn)
  ref.current = fn

  useEffect(() => {
    const write = () => ref.current(sim.smooth, sim.target, sim.chapterIndex)
    if (quality.reducedMotion) {
      write()
      return
    }
    let raf = 0
    const loop = () => {
      write()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])
}