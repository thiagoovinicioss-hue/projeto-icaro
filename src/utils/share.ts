import { formatBRLCompact } from './money'

export type ShareContent = { title: string; text: string; url: string }

export function buildShareContent(baseUrl: string, goalCents: number): ShareContent {
  const goal = formatBRLCompact(goalCents)
  return {
    title: `Projeto Ícaro — Jornada OBAFOG`,
    text: `Projeto Ícaro — estamos na Jornada OBAFOG e precisamos arrecadar ${goal} para construir a base e o foguete da próxima etapa.`,
    url: baseUrl,
  }
}