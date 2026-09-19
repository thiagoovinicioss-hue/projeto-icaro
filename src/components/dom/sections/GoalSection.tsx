import { useEffect, useRef } from 'react'
import { registerScrollMotion } from '../../../utils/scrollMotion'
import { quality } from '../../../utils/sim'
import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { campaign } from '../../../data/campaign'
import { MoneyNumber } from '../MoneyNumber'
import { SectionHeader } from './SectionHeader'
import { MotionTitle } from '../motion/MotionTitle'

export function GoalSection({ chapter }: { chapter: Chapter }) {
  const goalCents = campaign.goalCents
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (quality.reducedMotion) {
      el.style.setProperty('--rvs', '1')
      el.style.setProperty('--rv', '1')
      return
    }
    return registerScrollMotion(el, { from: 0.02, to: 0.58 })
  }, [])

  return (
    <div className="chapter-copy">
      <SectionHeader chapter={chapter} gold />
      <div ref={ref} className="goal-block mt">
        <MotionTitle
          as="div"
          className="goal-number"
          ariaLabel={`Meta de R$ ${(goalCents / 100).toFixed(2)}`}
          fromT={0.545}
          toT={0.695}
        >
          <MoneyNumber cents={goalCents} fromT={0.545} toT={0.695} />
        </MotionTitle>
        <p className="goal-block__text mt-body">
          é a meta fechada para a <strong>base</strong> e o <strong>foguete</strong> da próxima etapa.
        </p>
        <ul className="funding-use">
          {project.fundingUse.map((part, i) => (
            <li key={i} className="funding-use__row mt-body">
              <span className="funding-use__label">{part.label}</span>
              <span className="funding-use__note">{part.note}</span>
            </li>
          ))}
        </ul>
        <p className="goal-block__footnote mt-body">
          Quando fecharmos o detalhamento exato de cada material, publicamos aqui. Preferimos números
          certos a números bonitos.
        </p>
      </div>
    </div>
  )
}