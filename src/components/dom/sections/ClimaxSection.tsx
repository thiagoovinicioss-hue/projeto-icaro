import { useEffect, useRef } from 'react'
import type { Chapter } from '../../../story/chapters'
import { chapterIndexById } from '../../../story/chapters'
import { campaign } from '../../../data/campaign'
import { formatBRL, remainingCents } from '../../../utils/money'
import { scrollToChapter } from '../../../utils/navigation'
import { Countdown } from '../Countdown'
import { ShareButton } from '../ShareButton'
import { MotionTitle } from '../motion/MotionTitle'
import { registerScrollMotion } from '../../../utils/scrollMotion'
import { quality } from '../../../utils/sim'

export function ClimaxSection({ chapter }: { chapter: Chapter }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (quality.reducedMotion) {
      el.style.setProperty('--rv', '1')
      el.style.setProperty('--rvs', '1')
      return
    }
    return registerScrollMotion(el, { to: 0.58 })
  }, [])

  return (
    <div ref={ref} className="climax-copy mt">
      <Countdown />
      <MotionTitle as="h2" id={`title-${chapter.id}`} className="climax-title" fromT={0.942} toT={0.99}>
        Nos ajude a tirar o Projeto Ícaro <span className="text-gold">do chão.</span>
      </MotionTitle>
      <p className="climax-sub mt-body">
        Falta {formatBRL(remainingCents(campaign.raisedCents, campaign.goalCents))} para a
        contagem terminar em lançamento.
      </p>
      <div className="climax-actions mt-body">
        <button
          type="button"
          className="btn btn--gold"
          onClick={() => scrollToChapter(chapterIndexById('apoio'))}
        >
          APOIAR O PROJETO
        </button>
        <ShareButton />
      </div>
    </div>
  )
}