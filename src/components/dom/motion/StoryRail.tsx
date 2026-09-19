import { useRef } from 'react'
import { CHAPTERS } from '../../../story/chapters'
import { sim } from '../../../utils/sim'
import { useSimFrame } from '../../../hooks/useSimFrame'
import { useSimValue } from '../../../hooks/useSimValue'

/**
 * Indicador discreto da narrativa no lado direito (desktop): uma linha
 * vertical preenchida pela progressão do próprio relógio do mundo e o rótulo
 * do capítulo ativo. Fonte única de verdade — sem animação própria.
 */
export function StoryRail() {
  const fillRef = useRef<HTMLSpanElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)
  const active = useSimValue(() => sim.chapterIndex)

  useSimFrame((_smooth, target) => {
    const v = Math.min(1, Math.max(0, target)) * 100
    if (fillRef.current) fillRef.current.style.transform = `scaleY(${(v / 100).toFixed(4)})`
    if (dotRef.current) dotRef.current.style.top = `${v.toFixed(3)}%`
  })

  const chapter = CHAPTERS[active]
  const num = String(active + 1).padStart(2, '0')
  const total = String(CHAPTERS.length).padStart(2, '0')

  return (
    <div className="story-rail" aria-hidden="true">
      <span className="story-rail__num">{num}</span>
      <span className="story-rail__track">
        <span ref={fillRef} className="story-rail__fill" />
        <span ref={dotRef} className="story-rail__dot" />
      </span>
      <span className="story-rail__num">{total}</span>
      <span key={active} className="story-rail__label">
        {chapter?.navLabel ?? chapter?.id ?? ''}
      </span>
    </div>
  )
}