import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { isPlaceholder } from '../../../utils/placeholders'
import { PlaceholderText } from '../PlaceholderText'
import { PhotoFigure } from '../PhotoFigure'
import { Reveal } from '../Reveal'
import { SectionHeader } from './SectionHeader'

export function JourneySection({ chapter }: { chapter: Chapter }) {
  const prep = project.photos.journey.find((p) => p.src.includes('prep')) ?? project.photos.journey[1] ?? project.photos.journey[0]

  return (
    <div className="journey-grid">
      <div className="journey-copy chapter-copy">
        <SectionHeader chapter={chapter} />
        <p className="chapter-body">
          Passar para a <strong>Jornada</strong> significa que o projeto continua{' '}
          {isPlaceholder(project.competition.fullName) ? (
            <span className="pending-content">nome completo da etapa a publicar</span>
          ) : (
            <PlaceholderText>{project.competition.fullName}</PlaceholderText>
          )}
          . A etapa tem exigências novas — e custos que um projeto de escola não cobre sozinho.
        </p>
        <p className="chapter-body">
          A gente não escreve isso como propaganda. Escreve como quem descobriu, na prática, que
          foguete não sai do chão gratuitamente.
        </p>
      </div>
      <Reveal variant="up" as="figure">
        <PhotoFigure
          src={prep.src}
          alt={prep.alt}
          caption={prep.caption ?? 'Preparação do lançamento'}
          pending={prep.placeholder}
          ratio={prep.ratio ?? 'portrait'}
        />
      </Reveal>
    </div>
  )
}