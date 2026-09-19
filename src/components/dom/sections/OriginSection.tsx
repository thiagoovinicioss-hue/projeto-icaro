import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { isPlaceholder } from '../../../utils/placeholders'
import { PlaceholderText } from '../PlaceholderText'
import { Reveal } from '../Reveal'
import { SectionHeader } from './SectionHeader'

function Timeline() {
  return (
    <ol className="timeline">
      {project.timeline.map((ev, i) => (
        <li key={i} className="timeline__item">
          <span className="timeline__dot" aria-hidden="true" />
          <Reveal variant="fade">
            <h3 className="timeline__title">{ev.title}</h3>
            {isPlaceholder(ev.dateLabel) ? (
              <span className="timeline__date pending-content">data a publicar</span>
            ) : (
              <span className="timeline__date">{ev.dateLabel}</span>
            )}
            <p className="timeline__text">
              <PlaceholderText>{ev.description}</PlaceholderText>
            </p>
          </Reveal>
        </li>
      ))}
    </ol>
  )
}

export function OriginSection({ chapter }: { chapter: Chapter }) {
  return (
    <div className="chapter-copy">
      <SectionHeader chapter={chapter} />
      {project.originStory.map((par, i) => (
        <p key={i} className="chapter-body">
          <PlaceholderText>{par}</PlaceholderText>
        </p>
      ))}
      <Timeline />
    </div>
  )
}