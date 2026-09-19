import { quality } from './sim'

/**
 * Parallax de pointer extremamente discreto (desktop). Grava `--px`/`--py`
 * (0..1, centro = 0.5) no root — as camadas DOM derivam deslocamentos de
 * poucos pixels por CSS. Não substitui cursor, não segue o mouse: apenas dá
 * micro-vida a planos profundos. Desligado em touch/mobile/reduced-motion.
 */

export function initPointerParallax(): () => void {
  if (typeof window === 'undefined') return () => {}
  const root = document.documentElement
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!fine || quality.isMobile || quality.reducedMotion) return () => {}

  let raf = 0
  let x = 0.5
  let y = 0.5
  let tx = 0.5
  let ty = 0.5

  const write = () => {
    raf = 0
    // Muito suave: deriva ~60% para o alvo a cada 90ms — imperceptível.
    x += (tx - x) * 0.6
    y += (ty - y) * 0.6
    root.style.setProperty('--px', x.toFixed(3))
    root.style.setProperty('--py', y.toFixed(3))
  }

  const onMove = (e: PointerEvent) => {
    tx = e.clientX / window.innerWidth
    ty = e.clientY / window.innerHeight
    if (raf === 0) raf = window.setTimeout(write, 90)
  }
  const onLeave = () => {
    tx = 0.5
    ty = 0.5
    if (raf === 0) raf = window.setTimeout(write, 90)
  }

  root.style.setProperty('--px', '0.5')
  root.style.setProperty('--py', '0.5')
  window.addEventListener('pointermove', onMove, { passive: true })
  document.documentElement.addEventListener('pointerleave', onLeave)

  return () => {
    window.removeEventListener('pointermove', onMove)
    document.documentElement.removeEventListener('pointerleave', onLeave)
    if (raf) window.clearTimeout(raf)
  }
}