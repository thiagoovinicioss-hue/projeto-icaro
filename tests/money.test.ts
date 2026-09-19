import { describe, it, expect } from 'vitest'
import {
  formatBRL,
  formatBRLCompact,
  percentRaised,
  remainingCents,
  isGoalReached,
  safeCents,
  parseRealInput,
} from '../src/utils/money'

const fmt = (cents: number) => formatBRL(cents).replace(/\u00a0/g, ' ')

describe('money', () => {
  it('formatBRL converts cents to pt-BR currency', () => {
    expect(fmt(0)).toBe('R$ 0,00')
    expect(fmt(80000)).toBe('R$ 800,00')
    expect(fmt(8000050)).toBe('R$ 80.000,50')
  })

  it('formatBRLCompact drops decimals', () => {
    expect(formatBRLCompact(80000)).toContain('800')
    expect(formatBRLCompact(80000)).not.toContain(',')
  })

  it('safeCents clamps negatives and NaN', () => {
    expect(safeCents(-100)).toBe(0)
    expect(safeCents(Number.NaN)).toBe(0)
    expect(safeCents(250)).toBe(250)
  })

  it('percentRaised is clamped between 0 and 100', () => {
    expect(percentRaised(0, 80000)).toBe(0)
    expect(percentRaised(40000, 80000)).toBe(50)
    expect(percentRaised(-5000, 80000)).toBe(0)
    expect(percentRaised(999999, 80000)).toBe(100)
    expect(percentRaised(0, 0)).toBe(0)
  })

  it('remainingCents never goes negative', () => {
    expect(remainingCents(0, 80000)).toBe(80000)
    expect(remainingCents(30000, 80000)).toBe(50000)
    expect(remainingCents(90000, 80000)).toBe(0)
  })

  it('isGoalReached only when goal exists and is met', () => {
    expect(isGoalReached(80000, 80000)).toBe(true)
    expect(isGoalReached(0, 0)).toBe(false)
    expect(isGoalReached(79999, 80000)).toBe(false)
  })

  it('parseRealInput accepts reais and comma decimals', () => {
    expect(parseRealInput('50')).toBe(5000)
    expect(parseRealInput('120,50')).toBe(12050)
    expect(parseRealInput('1.234,56')).toBe(123456)
    expect(parseRealInput('0')).toBe(0)
    expect(parseRealInput('-5')).toBeNull()
    expect(parseRealInput('abc')).toBeNull()
    expect(parseRealInput('1,234')).toBeNull()
  })
})