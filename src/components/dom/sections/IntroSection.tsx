import { campaign } from '../../../data/campaign'
import { formatBRL } from '../../../utils/money'
import { chapterIndexById } from '../../../story/chapters'
import { scrollToChapter } from '../../../utils/navigation'
import type { Chapter } from '../../../story/chapters'

/**
 * Hero de abertura. A entrada é uma animação CSS de mount; a SAÍDA é dirigida
 * pelo relógio do mundo: ao deixar a introdução (t ≈ 0.10→0.17) o bloco se
 * desfaz por machine mask + leve dim — o texto anterior "sai por clipping"
 * enquanto a história chega, em vez de um corte seco.
 */
export function IntroSection({ chapter }: { chapter: Chapter }) {
  return (
    <div className="hero-copy">
      <p className="kicker kicker--gold">{chapter.kicker}</p>
      <h1 className="hero-headline">
        <span className="hero-headline__in">
          Todo lançamento começa muito antes da <span className="text-gold">contagem regressiva.</span>
        </span>
      </h1>
      <p className="hero-sub">
        Somos dois estudantes classificados para a Jornada da <strong>OBAFOG</strong>. A próxima
        etapa pede uma base e um foguete — e ela custa <strong>{formatBRL(campaign.goalCents)}</strong>.
      </p>
      <div className="hero-actions">
        <button type="button" className="btn btn--ghost btn--down" onClick={() => scrollToChapter(chapterIndexById('quem-somos'))}>
          CONHEÇA A MISSÃO <span aria-hidden="true">↓</span>
        </button>
      </div>
    </div>
  )
}
