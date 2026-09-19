import { useEffect, useRef } from 'react'
import { registerStoryMotion } from '../../../utils/scrollMotion'
import type { Chapter } from '../../../story/chapters'

type ChapterDividerProps = {
  chapter: Chapter
  reduced?: boolean
}

/**
 * Batida de transição entre capítulos — uma linha fina dourada que se desenha
 * no instante em que o relógio do mundo cruza o início do capítulo, com um nó
 * de marcação. Usa a MESMA janela de tempo do 3D (sim.smooth), então a linha
 * "assenta" junto com a câmera — continuação do capítulo anterior, anúncio do
 * próximo. Depois recede para hairline quieta (máscara de saída).
 */
export function ChapterDivider({ chapter, reduced = false }: ChapterDividerProps) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el || reduced) return
    const tStart = chapter.tStart
    return registerStoryMotion(el, {
      fromT: tStart - 0.012,
      toT: tStart + 0.026,
      exitFromT: tStart + 0.09,
      exitToT: tStart + 0.2,
    })
  }, [chapter.tStart, reduced])

  return (
    <div
      ref={ref}
      className={`chapter-divider chapter-divider--${chapter.align}${reduced ? ' is-reduced' : ''}`}
      aria-hidden="true"
    >
      <span className="chapter-divider__line" />
      <span className="chapter-divider__node" />
    </div>
  )
}