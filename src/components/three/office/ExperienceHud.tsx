import { campaign } from '../../../data/campaign'
import { formatBRL, percentRaised } from '../../../utils/money'

/** Mini-HUD de progresso real no canto do ambiente (§26 — dados verdadeiros,
 *  nunca inventados). Não bloqueia a vista: discreto, mono, no topo à esquerda. */
export function CampaignProgress() {
  const goal = campaign.goalCents
  const raised = campaign.raisedCents
  const pct = Math.floor(percentRaised(raised, goal))

  return (
    <p className="office-experience__progress" aria-hidden="true">
      <span className="office-experience__progress-label">APOIO REAL</span>
      <span className="office-experience__progress-value">
        {formatBRL(raised)}
        <span className="office-experience__progress-total"> / {formatBRL(goal)}</span>
      </span>
      <span className="office-experience__progress-pct">{pct}%</span>
    </p>
  )
}