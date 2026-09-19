import type { Chapter } from '../../../story/chapters'
import { project } from '../../../data/project'
import { PhotoFigure } from '../PhotoFigure'
import { SectionHeader } from './SectionHeader'

function CrewGrid() {
  const thiago = project.crew.find((m) => m.name === 'Thiago')
  if (!thiago) return null

  return (
    <ul className="crew-grid crew-grid--single">
      <li className="crew-card">
        <PhotoFigure
          src={thiago.photo}
          alt={`Foto de Thiago e Yuri`}
          pending={thiago.placeholder}
          ratio="portrait"
        />
        <div className="crew-card__info">
          <strong className="crew-card__name">Thiago e Yuri</strong>
          <span className="crew-card__role">{thiago.role}</span>
        </div>
      </li>
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