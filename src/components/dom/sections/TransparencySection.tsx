import type { ReactNode } from 'react'
import type { Chapter } from '../../../story/chapters'
import { campaign } from '../../../data/campaign'
import { project } from '../../../data/project'
import { formatBRL, percentRaised, remainingCents } from '../../../utils/money'
import { isPlaceholder } from '../../../utils/placeholders'
import { MoneyNumber } from '../MoneyNumber'
import { SectionHeader } from './SectionHeader'

function formatUpdatedAt(iso: string | null): string {
  if (!iso) return 'ainda não atualizado'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'long' }).format(d)
}

function TransparencyTable() {
  const goal = campaign.goalCents
  const raised = campaign.raisedCents
  const remaining = remainingCents(raised, goal)
  const pct = percentRaised(raised, goal)
  const pixPending = isPlaceholder(project.pix.beneficiary) || isPlaceholder(project.pix.key)

  const rows: [string, string | ReactNode][] = [
    ['Meta', formatBRL(goal)],
    ['Arrecadado', <MoneyNumber key="r" cents={raised} />],
    ['Falta', formatBRL(remaining)],
    ['Progresso', `${pct}%`],
    ['Última atualização', formatUpdatedAt(campaign.lastUpdated)],
    ['Destino', 'base e foguete'],
    ['Beneficiário do Pix', pixPending ? <span key="p" className="pending-content">a publicar</span> : project.pix.beneficiary],
  ]

  return (
    <table className="transparency-table">
      <caption className="visually-hidden">Números da campanha do Projeto Ícaro</caption>
      <tbody>
        {rows.map(([label, value]) => (
          <tr key={label}>
            <th scope="row">{label}</th>
            <td>{value}</td>
          </tr>
        ))}
        <tr>
          <th scope="row">Notas e comprovantes</th>
          <td className="muted">a incluir quando existirem</td>
        </tr>
      </tbody>
    </table>
  )
}

export function TransparencySection({ chapter }: { chapter: Chapter }) {
  return (
    <div className="chapter-copy">
      <SectionHeader chapter={chapter} />
      <p className="chapter-body">
        Zero mistério. Se tiver números, aparecem aqui; se ainda não tiver, dizemos que ainda
        não tem.
      </p>
      <TransparencyTable />
    </div>
  )
}