import { useEffect, useRef } from 'react'
import { registerStoryMotion } from '../../../utils/scrollMotion'
import { quality } from '../../../utils/sim'
import type { Chapter } from '../../../story/chapters'

/**
 * The repeated editorial header (kicker + title). Some sections tint the
 * kicker gold; the accessible anchor id is always derived from the chapter.
 * Entrada dirigida pelo RELÓGIO DO MUNDO (mesmo t da câmera no Three.js): a
 * linha dourada se desenha e o título é revelado por máscara exatamente quando
 * o capítulo assenta — contínua com o anterior, nunca um corte seco.
 */
export function SectionHeader({ chapter, gold = false }: { chapter: Chapter; gold?: boolean }) {
  const ref = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (quality.reducedMotion) {
      el.style.setProperty('--rv', '1')
      el.style.setProperty('--rvs', '1')
      return
    }
    const t = chapter.tStart
    return registerStoryMotion(el, { fromT: t - 0.006, toT: t + 0.05 })
  }, [chapter.tStart])

  return (
    <header ref={ref} className="section-head mt">
      <span className="section-head__line" aria-hidden="true" />
      <p className={gold ? 'kicker kicker--gold mt-kicker' : 'kicker mt-kicker'}>{chapter.kicker}</p>
      <div className="mt-mask">
        <h2 id={`title-${chapter.id}`} className="chapter-title mt-line">
          {chapter.title}
        </h2>
      </div>
    </header>
  )
}