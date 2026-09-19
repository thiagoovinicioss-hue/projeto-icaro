import { describe, it, expect } from 'vitest'
import { buildShareContent } from '../src/utils/share'

describe('share', () => {
  it('builds a share message with the goal', () => {
    const share = buildShareContent('https://exemplo.dev/', 80000)
    expect(share.url).toBe('https://exemplo.dev/')
    expect(share.title).toContain('Projeto Ícaro')
    expect(share.text.replace(/\u00a0/g, ' ')).toContain('R$ 800')
    expect(share.text).toContain('Jornada OBAFOG')
  })
})