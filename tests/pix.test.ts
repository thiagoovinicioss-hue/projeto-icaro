import { describe, it, expect } from 'vitest'
import { hasRealPixPayload, pixCopyValue } from '../src/utils/pix'
import { TODO_REAL_CONTENT } from '../src/data/project'

describe('pix payload', () => {
  it('treats null/empty/placeholder as no real payload', () => {
    expect(hasRealPixPayload(null)).toBe(false)
    expect(hasRealPixPayload('')).toBe(false)
    expect(hasRealPixPayload(TODO_REAL_CONTENT)).toBe(false)
    expect(hasRealPixPayload('curto')).toBe(false)
  })

  it('accepts a long static payload', () => {
    expect(hasRealPixPayload('a'.padEnd(40, 'b'))).toBe(true)
  })

  it('prefers a real payload over the raw key', () => {
    const key = 'chave-pix-de-teste'
    expect(pixCopyValue(null, key)).toBe(key)
    expect(pixCopyValue(TODO_REAL_CONTENT, key)).toBe(key)
    expect(pixCopyValue('a'.padEnd(40, 'b'), key)).not.toBe(key)
  })
})