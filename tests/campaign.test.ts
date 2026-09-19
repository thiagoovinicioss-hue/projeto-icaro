import { describe, it, expect } from 'vitest'
import { campaign, campaignDefaults } from '../src/data/campaign'

describe('campaign', () => {
  it('goal is R$ 800 (80.000 centavos) and immutable default', () => {
    expect(campaign.goalCents).toBe(80000)
    expect(campaignDefaults.goalCents).toBe(80000)
    expect(Object.isFrozen(campaignDefaults)).toBe(true)
  })

  it('starts at R$ 0 with no recorded date', () => {
    expect(campaign.raisedCents).toBe(0)
    expect(campaign.lastUpdated).toBeNull()
  })

  it('raise never goes negative', () => {
    expect(campaign.raisedCents).toBeGreaterThanOrEqual(0)
    expect(campaign.raisedCents).toBeLessThanOrEqual(campaign.goalCents * 10)
  })
})