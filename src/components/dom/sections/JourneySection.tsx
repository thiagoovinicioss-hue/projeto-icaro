import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { isPlaceholder } from '../../../utils/placeholders'
import { PlaceholderText } from '../PlaceholderText'
import { PhotoFigure } from '../PhotoFigure'
import { SectionHeader } from './SectionHeader'

export function JourneySection({ chapter }: { chapter: Chapter }) {
  const duo = project.crew.slice(0, 2)

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
      <ul className="journey-duo">
        {duo.map((member) => (
          <li key={member.name} className="journey-duo__item">
            <PhotoFigure
              src={member.photo}
              alt={`Foto de ${isPlaceholder(member.name) ? 'integrante da equipe' : member.name}`}
              pending={member.placeholder}
              ratio="portrait"
            />
            <span className="journey-duo__name">{member.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}