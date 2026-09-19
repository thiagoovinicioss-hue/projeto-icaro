import type { ComponentType } from 'react'
import type { CSSProperties } from 'react'
import type { Chapter, ChapterKind } from '../../story/chapters'
import { IntroSection } from './sections/IntroSection'
import { CrewSection } from './sections/CrewSection'
import { OriginSection } from './sections/OriginSection'
import { QualificationSection } from './sections/QualificationSection'
import { JourneySection } from './sections/JourneySection'
import { GoalSection } from './sections/GoalSection'
import { ProgressSection } from './sections/ProgressSection'
import { TransparencySection } from './sections/TransparencySection'
import { SupportSection } from './sections/SupportSection'
import { ClimaxSection } from './sections/ClimaxSection'
import { ChapterDivider } from './motion/ChapterDivider'
import { quality } from '../../utils/sim'

/**
 * Each chapter kind renders through one dedicated section component.
 * This dispatcher keeps the section shell and the scroll-weight contract.
 */
const KIND_SECTIONS: Record<ChapterKind, ComponentType<{ chapter: Chapter }>> = {
  intro: IntroSection,
  crew: CrewSection,
  origin: OriginSection,
  qualification: QualificationSection,
  journey: JourneySection,
  goal: GoalSection,
  progress: ProgressSection,
  transparency: TransparencySection,
  support: SupportSection,
  climax: ClimaxSection,
}

export function ChapterSection({ chapter, index, omitId = false }: { chapter: Chapter; index?: number; omitId?: boolean }) {
  const Section = KIND_SECTIONS[chapter.kind]
  const titleId = `title-${chapter.id}`

  return (
    <section
      id={omitId ? undefined : chapter.id}
      className={`chapter chapter--${chapter.kind} chapter--${chapter.align} chapter--contrast-${chapter.textContrastMode ?? 'dark'}`}
      style={{ '--weight': chapter.weight } as CSSProperties}
      aria-labelledby={chapter.kind === 'intro' ? undefined : titleId}
    >
      {index !== undefined && index > 0 && (
        <ChapterDivider chapter={chapter} reduced={quality.reducedMotion} />
      )}
      <div className="chapter__stage">
        <div className="chapter__frame">
          <Section chapter={chapter} />
        </div>
      </div>
    </section>
  )
}
