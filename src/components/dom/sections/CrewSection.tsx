import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { isPlaceholder } from '../../../utils/placeholders'
import { PhotoFigure } from '../PhotoFigure'
import { PlaceholderText } from '../PlaceholderText'
import { Reveal } from '../Reveal'
import { SectionHeader } from './SectionHeader'

function CrewGrid() {
  return (
    <ul className="crew-grid">
      {project.crew.map((member, i) => (
        <Reveal key={i} variant="up" delay={i * 120} as="li" className="crew-card">
          <PhotoFigure
            src={member.photo}
            alt={`Foto de ${isPlaceholder(member.name) ? 'integrante da equipe' : member.name}`}
            pending={member.placeholder}
            ratio="portrait"
          />
          <div className="crew-card__info">
            <strong className="crew-card__name">
              <PlaceholderText>{member.name}</PlaceholderText>
            </strong>
            <span className="crew-card__role">{member.role}</span>
            {isPlaceholder(member.name) && (
              <span className="crew-card__pending">nome a publicar</span>
            )}
          </div>
        </Reveal>
      ))}
    </ul>
  )
}

export function CrewSection({ chapter }: { chapter: Chapter }) {
  return (
    <div className="chapter-copy">
      <SectionHeader chapter={chapter} />
      <p className="chapter-body">
        O Projeto Ícaro é tocado por dois estudantes{' '}
        {isPlaceholder(project.school.name) ? '' : (
          <>
            da <PlaceholderText>{project.school.name}</PlaceholderText>
          </>
        )}
        . Sem equipe gigante: nós dois, uma base e a vontade de ver um foguete sair do chão.
      </p>
      <CrewGrid />
    </div>
  )
}