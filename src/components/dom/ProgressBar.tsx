import { useEffect, useRef } from 'react'
import { campaign } from '../../data/campaign'
import {
  formatBRL,
  formatBRLCompact,
  percentRaised,
  remainingCents,
} from '../../utils/money'
import { quality } from '../../utils/sim'
import { registerStoryMotion } from '../../utils/scrollMotion'
import { MoneyNumber } from './MoneyNumber'

/**
 * The mission's fuel gauge — a trajectory line that climbs from the pad to
 * R$ 800. Semantically correct (role="progressbar") and honest about the
 * numbers: it only ever shows the value present in campaign.ts.
 *
 * A entrada é dirigida pelo relógio do mundo (overlap com a meta): uma linha
 * dourada se estende acima do medidor — o "R$ 800" do capítulo anterior vira,
 * visualmente, a escala desta barra. Sem hard cut.
 */
export function ProgressBar() {
  const goal = campaign.goalCents
  const raised = campaign.raisedCents
  const pct = percentRaised(raised, goal)
  const remaining = remainingCents(raised, goal)

  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (quality.reducedMotion) {
      el.style.setProperty('--rv', '1')
      el.style.setProperty('--rvs', '1')
      return
    }
    return registerStoryMotion(el, { fromT: 0.708, toT: 0.775 })
  }, [])

  return (
    <div ref={ref} className="progress-mission mt" role="progressbar" aria-valuemin={0} aria-valuemax={goal} aria-valuenow={raised} aria-label="Arrecadação do Projeto Ícaro">
      <span className="progress-mission__enter" aria-hidden="true" />
      <div className="progress-mission__head">
        <span className="progress-mission__label">MISSÃO ÍCARO</span>
        <span className="progress-mission__pct">{pct}%</span>
      </div>

      <div className="progress-mission__track" aria-hidden="true">
        <svg viewBox="0 0 1000 90" preserveAspectRatio="none" className="progress-mission__svg">
          <path
            d="M 20 74 C 180 74, 260 60, 380 46 S 620 20, 700 30 S 880 46, 980 26"
            fill="none"
            stroke="#16283f"
            strokeWidth="3"
            strokeDasharray="1 0"
            vectorEffect="non-scaling-stroke"
          />
          <path
            className="progress-mission__path-fill"
            d="M 20 74 C 180 74, 260 60, 380 46 S 620 20, 700 30 S 880 46, 980 26"
            fill="none"
            stroke="url(#goldGrad)"
            strokeWidth="4"
            strokeLinecap="round"
            pathLength={1}
            style={{ strokeDasharray: `${pct / 100} 1` }}
          />
          <defs>
            <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor="#f6b73c" />
              <stop offset="1" stopColor="#ffd975" />
            </linearGradient>
          </defs>
        </svg>

        <div
          className="progress-mission__marker"
          style={{ left: `calc(2% + ${pct * 0.96}% )` }}
          aria-hidden="true"
        >
          <span className="progress-mission__halo" />
        </div>
        <div className="progress-mission__zero">R$ 0</div>
        <div className="progress-mission__goal">{formatBRLCompact(goal)}</div>
      </div>

      <div className="progress-mission__stats">
        <div className="progress-mission__stat">
          <span className="progress-mission__stat-value">
            <MoneyNumber cents={raised} />
          </span>
          <span className="progress-mission__stat-label">arrecadado</span>
        </div>
        {!campaign.lastUpdated && (
          <div className="progress-mission__note">Ainda não chegou a primeira doação — cada centavo conta.</div>
        )}
        {remaining > 0 ? (
          <div className="progress-mission__stat">
            <span className="progress-mission__stat-value">
              {formatBRL(remaining)}
            </span>
            <span className="progress-mission__stat-label">para completar a meta</span>
          </div>
        ) : (
          <div className="progress-mission__stat">
            <span className="progress-mission__stat-value">Meta alcançada</span>
            <span className="progress-mission__stat-label">o foguete sai do chão</span>
          </div>
        )}
      </div>

      <p className="progress-mission__meta">
        <span aria-hidden="true">Última atualização ·</span>
        {(() => {
          if (!campaign.lastUpdated) return 'ainda não atualizado'
          const d = new Date(campaign.lastUpdated)
          return Number.isNaN(d.getTime())
            ? campaign.lastUpdated
            : new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(d)
        })()}
      </p>
    </div>
  )
}