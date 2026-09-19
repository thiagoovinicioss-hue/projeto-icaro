import { useEffect, useRef } from 'react'
import { registerScrollMotion, registerStoryMotion } from '../../../utils/scrollMotion'
import { quality } from '../../../utils/sim'

type MotionTitleProps = {
  children: React.ReactNode
  className?: string
  id?: string
  ariaLabel?: string
  as?: 'h1' | 'h2' | 'h3' | 'div' | 'span'
  /** Janela de revelação em relógio de mundo (overlap com capítulo anterior). */
  fromT?: number
  toT?: number
}

/**
 * Grande palavra da narrativa (CLASSIFICADOS, R$ 800, título do clímax):
 * máscara vertical + tracking que fecha ao revelar. Mesmo motor do resto da
 * página — reversível e neutralizado em reduced-motion pelo CSS. Aceita uma
 * janela de relógio de mundo para antecipar/atrasar junto com a câmera.
 */
export function MotionTitle({ children, className = '', id, ariaLabel, as: Tag = 'h2', fromT, toT }: MotionTitleProps) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.setProperty('--rv', '0')
    el.style.setProperty('--rvs', '0')
    if (quality.reducedMotion) {
      el.style.setProperty('--rv', '1')
      el.style.setProperty('--rvs', '1')
      return
    }
    if (fromT !== undefined && toT !== undefined) {
      return registerStoryMotion(el, { fromT, toT })
    }
    return registerScrollMotion(el, { from: 0.02, to: 0.52 })
  }, [fromT, toT])

  return (
    <Tag ref={ref as never} id={id} aria-label={ariaLabel} className={`mt mt-word ${className}`}>
      <span className="mt-mask">
        <span className="mt-line">{children}</span>
      </span>
    </Tag>
  )
}