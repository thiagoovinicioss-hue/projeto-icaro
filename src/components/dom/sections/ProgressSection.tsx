import type { Chapter } from '../../../story/chapters'
import { ProgressBar } from '../ProgressBar'
import { SectionHeader } from './SectionHeader'

export function ProgressSection({ chapter }: { chapter: Chapter }) {
  return (
    <div className="chapter-copy chapter-copy--center">
      <SectionHeader chapter={chapter} />
      <p className="chapter-body chapter-body--center">
        O número abaixo sobe apenas com doações reais — cada centavo confirmado entra aqui.
      </p>
      <ProgressBar />
    </div>
  )
}