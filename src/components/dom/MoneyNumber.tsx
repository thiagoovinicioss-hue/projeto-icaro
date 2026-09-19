import { useEffect, useRef } from 'react'
import { formatBRL } from '../../utils/money'
import { quality } from '../../utils/sim'
import { registerScrollMotion, registerStoryMotion } from '../../utils/scrollMotion'

/**
 * Contagem de dinheiro dirigida pela narrativa — a mesma posição de scroll
 * produz sempre o mesmo número (reversível, sobe e desce com a história),
 * convergindo sempre ao valor verdadeiro e nunca indo além dele. A janela
 * pode ser de relógio de mundo (`window`) para antecipar o número junto com
 * a câmera. A escrita acontece direto no DOM (o span não tem filhos JSX).
 */
export function MoneyNumber({
  cents,
  suffix,
  fromT,
  toT,
}: {
  cents: number
  suffix?: string
  fromT?: number
  toT?: number
}) {
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const write = (_p: number, s: number) => {
      const v = Math.round(cents * s)
      el.textContent = `${formatBRL(v)}${suffix ? ` ${suffix}` : ''}`
    }
    if (quality.reducedMotion) {
      write(1, 1)
      return
    }
    write(0, 0)
    if (fromT !== undefined && toT !== undefined) {
      return registerStoryMotion(el, { fromT, toT, onProgress: write })
    }
    return registerScrollMotion(el, { from: 0.05, to: 0.62, onProgress: write })
  }, [cents, suffix, fromT, toT])

  return <span ref={ref} />
}