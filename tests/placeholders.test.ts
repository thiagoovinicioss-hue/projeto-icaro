import { describe, it, expect } from 'vitest'
import { isPlaceholder, pendingCount, anyPending } from '../src/utils/placeholders'
import { project } from '../src/data/project'

describe('placeholders', () => {
  it('detects the literal marker', () => {
    expect(isPlaceholder('TODO_REAL_CONTENT')).toBe(true)
    expect(isPlaceholder(undefined)).toBe(true)
    expect(isPlaceholder(null)).toBe(true)
    expect(isPlaceholder('')).toBe(true)
  })

  it('accepts real content', () => {
    expect(isPlaceholder('OBAFOG')).toBe(false)
    expect(isPlaceholder('thiago@email.com')).toBe(false)
    expect(isPlaceholder('1985')).toBe(false)
  })

  it('counts pending fields across arrays and objects (empty counts too)', () => {
    const sample = {
      a: 'TODO_REAL_CONTENT',
      list: ['ok', 'TODO_REAL_CONTENT', 'TODO_REAL_CONTENT'],
      nested: { b: 'real', c: undefined },
    }
    expect(pendingCount(sample)).toBe(4)
    expect(anyPending(sample)).toBe(true)
  })

  it('keeps the real project values stable', () => {
    expect(project.projectName).toBe('Projeto Ícaro')
    expect(Array.isArray(project.crew)).toBe(true)
    expect(project.crew.length).toBeGreaterThanOrEqual(2)
  })
})