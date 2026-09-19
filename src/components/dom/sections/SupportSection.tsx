import type { Chapter } from '../../../story/chapters'
import { PixArea } from '../PixArea'
import { SectionHeader } from './SectionHeader'

export function SupportSection({ chapter }: { chapter: Chapter }) {
  return (
    <div className="support-copy">
      <SectionHeader chapter={chapter} gold />
      <p className="chapter-body chapter-body--center">
        Quem apoia não compra um pedaço do foguete: entra para a missão. Ajuda a tirá-lo do chão
        e acompanha — junto com a gente — o que ele é capaz.
      </p>
      <PixArea />
    </div>
  )
}