import { TODO_REAL_CONTENT } from '../data/project'

export function isPlaceholder(value: unknown): boolean {
  if (value === null || value === undefined || value === '') return true
  if (typeof value === 'string') {
    return value === TODO_REAL_CONTENT || value.includes(TODO_REAL_CONTENT)
  }
  if (Array.isArray(value)) {
    return value.length === 0 || value.some((item) => isPlaceholder(item))
  }
  if (typeof value === 'object') {
    return Object.keys(value as object).length === 0 || Object.values(value as Record<string, unknown>).some((item) => isPlaceholder(item))
  }
  return false
}

export function pendingCount(value: unknown): number {
  if (value === null || value === undefined || value === '') return 1
  if (typeof value === 'string') {
    return value === TODO_REAL_CONTENT ? 1 : 0
  }
  if (Array.isArray(value)) {
    return value.reduce<number>((acc, item) => acc + pendingCount(item), 0)
  }
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).reduce<number>(
      (acc, item) => acc + pendingCount(item),
      0,
    )
  }
  return 0
}

export function anyPending(value: unknown): boolean {
  return pendingCount(value) > 0
}