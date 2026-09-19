const brl = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
})

const brlCompact = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
})

export function formatBRL(cents: number): string {
  return brl.format(safeCents(cents) / 100)
}

export function formatBRLCompact(cents: number): string {
  return brlCompact.format(safeCents(cents) / 100)
}

export function safeCents(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.round(value))
}

export function percentRaised(raisedCents: number, goalCents: number): number {
  const goal = safeCents(goalCents)
  if (goal <= 0) return 0
  const pct = (safeCents(raisedCents) / goal) * 100
  return Math.min(100, Math.max(0, pct))
}

export function remainingCents(raisedCents: number, goalCents: number): number {
  return Math.max(0, safeCents(goalCents) - safeCents(raisedCents))
}

export function isGoalReached(raisedCents: number, goalCents: number): boolean {
  return safeCents(raisedCents) >= safeCents(goalCents) && safeCents(goalCents) > 0
}

export function parseRealInput(input: string): number | null {
  const normalized = String(input).trim().replace(/\./g, '').replace(/,/g, '.')
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount < 0) return null
  const cents = Math.round(amount * 100)
  if (cents > Number.MAX_SAFE_INTEGER) return null
  return cents
}