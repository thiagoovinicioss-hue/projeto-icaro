import { useEffect, useRef, useState } from 'react'
import { CHAPTERS, chapterIndexById } from '../../story/chapters'
import { scrollToChapter } from '../../utils/navigation'
import { sim } from '../../utils/sim'
import { useSimFrame } from '../../hooks/useSimFrame'
import { useSimValue } from '../../hooks/useSimValue'

export function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [scrim, setScrim] = useState(false)
  const active = useSimValue(() => sim.chapterIndex, 0)
  const activeRef = useRef(active)
  activeRef.current = active
  const hairlineRef = useRef<HTMLSpanElement>(null)

  useSimFrame((_smooth, target) => {
    if (hairlineRef.current) {
      hairlineRef.current.style.width = `${Math.min(100, Math.max(0, target * 100)).toFixed(2)}%`
    }
  })

  useEffect(() => {
    // The scrim only appears once the story reaches deep chapters
    // (classificação onwards); CHAPTERS is a static module constant.
    const scrimFromChapter = chapterIndexById('classificacao')
    const onScroll = () => {
      setScrolled(window.scrollY > 40)
      setScrim(activeRef.current >= scrimFromChapter)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const links = CHAPTERS.filter((c) => ['introducao', 'quem-somos', 'classificacao', 'progresso'].includes(c.id))

  return (
    <header className={`nav${scrolled ? ' is-scrolled' : ''}${scrim ? ' on-dark' : ''}`}>
      <a className="nav__skip" href="#quem-somos">
        Pular para o conteúdo
      </a>
      <div className="nav__inner">
        <button type="button" className="nav__brand" onClick={() => scrollToChapter(chapterIndexById('introducao'))} aria-label="Voltar ao início">
          <span className="nav__brand-mark" aria-hidden="true">
            <img src="./logo-192.png" alt="" width="26" height="26" className="nav__logo" />
          </span>
          <span className="nav__brand-name">
            ÍCARO <em>· OBAFOG</em>
          </span>
        </button>

        <nav className="nav__links" aria-label="Seções">
          {links.map((ch) => {
            const index = chapterIndexById(ch.id)
            return (
              <button
                key={ch.id}
                type="button"
                className={`nav__link${active === index ? ' is-active' : ''}${ch.id === 'apoio' ? ' nav__link--support' : ''}`}
                onClick={() => scrollToChapter(index)}
              >
                {ch.navLabel}
              </button>
            )
          })}
          <a className="nav__link nav__link--cta" href="#apoio" onClick={(e) => {
            e.preventDefault()
            scrollToChapter(chapterIndexById('apoio'))
          }}>
            Apoiar
          </a>
        </nav>
      </div>
      <div className="nav__hairline" aria-hidden="true">
        <span ref={hairlineRef} />
      </div>
    </header>
  )
}