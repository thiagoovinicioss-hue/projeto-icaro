export type MemoryStage = {
  id: string;
  title: string;
  description: string;
  date: Date;
  highlightWord?: string;
};

export const memoryStages: MemoryStage[] = [
  {
    id: 'inicio',
    title: 'Início do Projeto',
    description: 'A inscrição no projeto de foguetes deu o pontapé: escolher o modelo, montar a base e aprender na prática o que um foguete precisa para sair do chão.',
    date: new Date('2026-03-05'),
    highlightWord: 'inscrição',
  },
  {
    id: 'lancamento',
    title: 'Etapa de Lançamento',
    description: 'O lançamento foi o momento de colocar à prova o que vinha do papel: ajustar o modelo, preparar a base e acompanhar a descida.',
    date: new Date('2026-05-15'),
    highlightWord: 'lançamento',
  },
  {
    id: 'classificacao',
    title: 'Classificação para a Jornada',
    description: 'O resultado saiu e o projeto mudou de tamanho: fomos classificados para a Jornada da OBAFOG.',
    date: new Date('2026-10-19'),
    highlightWord: 'classificados',
  },
];

export function getMonthName(date: Date, locale = 'pt-BR'): string {
  return date.toLocaleDateString(locale, { month: 'long' });
}

export function getYear(date: Date): number {
  return date.getFullYear();
}

export function getDay(date: Date): number {
  return date.getDate();
}

export function getDaysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

export function getFirstDayOfWeek(date: Date): number {
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
  return firstDay.getDay();
}

export function formatMonthYear(date: Date, locale = 'pt-BR'): string {
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' });
}