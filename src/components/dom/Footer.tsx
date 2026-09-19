import { project } from '../../data/project'
import { isPlaceholder } from '../../utils/placeholders'
import { chapterIndexById } from '../../story/chapters'
import { scrollToChapter } from '../../utils/navigation'
import { ShareButton } from './ShareButton'

const FOOTER_LINKS = [
  { label: 'A missão', chapterId: 'introducao' },
  { label: 'Quem somos', chapterId: 'quem-somos' },
  { label: 'A meta', chapterId: 'meta' },
  { label: 'Apoiar', chapterId: 'apoio' },
  { label: 'Lançamento', chapterId: 'lancamento' },
] as const

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <span className="footer__brand-row">
            <img src="./logo-192.png" alt="" width="24" height="24" className="nav__logo" />
            <strong>Projeto Ícaro</strong>
          </span>
          <span className="footer__brand-tag">Jornada OBAFOG</span>
        </div>

        <nav className="footer__links" aria-label="Links do rodapé">
          {FOOTER_LINKS.map(({ label, chapterId }) => (
            <button
              key={chapterId}
              type="button"
              className="footer__link"
              onClick={() => scrollToChapter(chapterIndexById(chapterId))}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="footer__meta">
          {isPlaceholder(project.contact.email) ? (
            <span className="muted">contato a publicar</span>
          ) : (
            <a href={`mailto:${project.contact.email}`}>{project.contact.email}</a>
          )}
          <ShareButton label="COMPARTILHAR" />
        </div>
      </div>
      <p className="footer__legal">
        © {year} Projeto Ícaro · Site estático · Doações feitas diretamente via Pix · Nenhum dado é
        coletado por esta página.
      </p>
    </footer>
  )
}