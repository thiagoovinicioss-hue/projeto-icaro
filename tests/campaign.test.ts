import { describe, it, expect } from 'vitest'
import { campaign, campaignDefaults } from '../src/data/campaign'

describe('campaign', () => {
  it('goal is R$ 800 (80.000 centavos) and immutable default', () => {
    expect(campaign.goalCents).toBe(80000)
    expect(campaignDefaults.goalCents).toBe(80000)
    expect(Object.isFrozen(campaignDefaults)).toBe(true)
  })

  it('tracks R$ 400 raised (40.000 centavos) with an update date', () => {
    expect(campaign.raisedCents).toBe(40000)
    expect(campaign.lastUpdated).toBe('2026-09-20')
  })

  it('raise never goes negative', () => {
    expect(campaign.raisedCents).toBeGreaterThanOrEqual(0)
    expect(campaign.raisedCents).toBeLessThanOrEqual(campaign.goalCents * 10)
  })
})