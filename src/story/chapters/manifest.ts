export type ChapterKind =
  | 'intro'
  | 'crew'
  | 'origin'
  | 'qualification'
  | 'journey'
  | 'goal'
  | 'progress'
  | 'transparency'
  | 'support'
  | 'climax'

export type ChapterAlign = 'left' | 'right' | 'center'

/** Onde o texto vive na tela — o renderer nunca coloca o foguete nessa faixa. */
export type TextContrastMode = 'dark' | 'scrim-left' | 'scrim-right' | 'scrim-center'

export type Chapter = {
  id: string
  navLabel: string
  kicker: string
  title: string
  kind: ChapterKind
  align: ChapterAlign
  weight: number
  tStart: number
  tEnd: number
  note?: string
  textContrastMode?: TextContrastMode
}

/**
 * The editorial ledger: each chapter is a window of world time (0..1).
 * The sequence is fixed, contiguous and authored by hand — it drives the
 * scroll storytelling, the camera choreography and the page sections.
 */
export const CHAPTERS: Chapter[] = [
  {
    id: 'introducao',
    navLabel: 'A missão',
    kicker: 'Jornada OBAFOG',
    title: 'Todo lançamento começa muito antes da contagem regressiva.',
    kind: 'intro',
    align: 'center',
    weight: 1.35,
    tStart: 0.0,
    tEnd: 0.14,
    textContrastMode: 'scrim-center',
  },
  {
    id: 'quem-somos',
    navLabel: 'Quem somos',
    kicker: 'Quem somos',
    title: 'Dois estudantes. Uma missão.',
    kind: 'crew',
    align: 'right',
    weight: 1.05,
    tStart: 0.14,
    tEnd: 0.27,
    textContrastMode: 'scrim-right',
  },
  {
    id: 'comeco',
    navLabel: 'O começo',
    kicker: 'O começo',
    title: 'Como chegamos até aqui.',
    kind: 'origin',
    align: 'left',
    weight: 1.0,
    tStart: 0.27,
    tEnd: 0.4,
    textContrastMode: 'scrim-left',
  },
  {
    id: 'classificacao',
    navLabel: 'Classificação',
    kicker: 'O lançamento que nos trouxe até aqui',
    title: 'classificados',
    kind: 'qualification',
    align: 'center',
    weight: 1.3,
    tStart: 0.4,
    tEnd: 0.53,
    textContrastMode: 'scrim-center',
  },
  {
    id: 'jornada',
    navLabel: 'A jornada',
    kicker: 'A Jornada OBAFOG',
    title: 'Agora o desafio é outro.',
    kind: 'journey',
    align: 'left',
    weight: 0.95,
    tStart: 0.53,
    tEnd: 0.64,
    textContrastMode: 'scrim-left',
  },
  {
    id: 'meta',
    navLabel: 'A meta',
    kicker: 'O novo desafio',
    title: 'R$ 800 para a base e o foguete.',
    kind: 'goal',
    align: 'right',
    weight: 1.05,
    tStart: 0.64,
    tEnd: 0.74,
    textContrastMode: 'scrim-right',
  },
  {
    id: 'progresso',
    navLabel: 'Progresso',
    kicker: 'Acompanhe o progresso',
    title: 'O quanto já subimos.',
    kind: 'progress',
    align: 'center',
    weight: 1.2,
    tStart: 0.74,
    tEnd: 0.83,
    textContrastMode: 'scrim-center',
  },
  {
    id: 'transparencia',
    navLabel: 'Transparência',
    kicker: 'Transparência da missão',
    title: 'Os números, sem maquiagem.',
    kind: 'transparency',
    align: 'right',
    weight: 0.95,
    tStart: 0.83,
    tEnd: 0.9,
    textContrastMode: 'scrim-right',
  },
  {
    id: 'apoio',
    navLabel: 'Apoiar',
    kicker: 'Faça parte do lançamento',
    title: 'Apoiar um foguete é apoiar quem o constrói.',
    kind: 'support',
    align: 'center',
    weight: 1.25,
    tStart: 0.9,
    tEnd: 0.955,
    textContrastMode: 'scrim-center',
  },
  {
    id: 'lancamento',
    navLabel: 'Lançamento',
    kicker: 'Contagem regressiva',
    title: 'Nos ajude a tirar o Projeto Ícaro do chão.',
    kind: 'climax',
    align: 'center',
    weight: 1.5,
    tStart: 0.955,
    tEnd: 1.0,
    textContrastMode: 'scrim-center',
  },
]

/** Index of a chapter by its stable anchor id, or -1 when unknown. */
export function chapterIndexById(id: string): number {
  return CHAPTERS.findIndex((ch) => ch.id === id)
}