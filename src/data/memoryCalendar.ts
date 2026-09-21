import { project, type TimelineEvent } from './project'
import { TODO_REAL_CONTENT } from './project'

/**
 * Memória em calendário — cena do capítulo "Como chegamos até aqui".
 *
 * NADA aqui é inventado: cada etapa vem direto de `project.timeline`, a fonte
 * de verdade do site. Datas são as mesmas strings `DD/MM/YYYY` já usadas na
 * timeline. Se a data ainda for placeholder, `date` fica `null` e o calendário
 * não marca dia nenhum (mostra "data a publicar" na nota manuscrita).
 */

export type MemoryStage = {
  id: string
  title: string
  description: string
  date: Date | null
  /** rótulo DD/MM/YYYY original (project.timeline.dateLabel) */
  dateLabel: string | null
  /** palavra curta para o marca-texto vermelho (sempre trecho do conteúdo real) */
  markWord: string
}

export const memoryStages: MemoryStage[] = project.timeline.map((ev: TimelineEvent, i: number) =>
  buildStage(ev, i),
)

export function buildStage(ev: TimelineEvent, i: number): MemoryStage {
  const date = parseDateLabel(ev.dateLabel)
  return {
    id: `memoria-${i + 1}`,
    title: ev.title,
    description: ev.description,
    date,
    dateLabel: isRealDate(ev.dateLabel) ? ev.dateLabel : null,
    markWord: firstWords(ev.title, 2),
  }
}

/** true quando o rótulo é uma data real DD/MM/YYYY (não é placeholder). */
export function isRealDate(label: string | undefined): label is string {
  if (!label || label === TODO_REAL_CONTENT || label.includes(TODO_REAL_CONTENT)) return false
  const m = label.trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (!m) return false
  const day = Number(m[1])
  const month = Number(m[2])
  const year = Number(m[3])
  if (month < 1 || month > 12 || day < 1 || year < 1900) return false
  const days = new Date(year, month, 0).getDate()
  return day <= days
}

export function parseDateLabel(label: string | undefined): Date | null {
  if (!isRealDate(label)) return null
  const [d, m, y] = label.split('/').map(Number)
  return new Date(y, m - 1, d)
}

function firstWords(text: string, n: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean)
  return words.slice(0, n).join(' ')
}

/* ------------------------------ helpers de calendário ------------------------------ */

/** nome longo do mês em pt-BR, capitalizado (ex.: "março"). */
export function getMonthName(date: Date | null, locale = 'pt-BR'): string {
  if (!date) return ''
  return date.toLocaleDateString(locale, { month: 'long' }).toLowerCase()
}

export function getYear(date: Date | null): number | null {
  return date ? date.getFullYear() : null
}

export function getDay(date: Date | null): number | null {
  return date ? date.getDate() : null
}

/** quantos dias tem o mês da data. */
export function getDaysInMonth(date: Date | null): number {
  if (!date) return 30
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
}

/** dia da semana do primeiro dia do mês (0 = domingo). */
export function getFirstWeekday(date: Date | null): number {
  if (!date) return 0
  return new Date(date.getFullYear(), date.getMonth(), 1).getDay()
}

export function formatNoteDate(date: Date | null): string {
  if (!date) return ''
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}