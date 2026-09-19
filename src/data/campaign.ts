export type Campaign = {
  goalCents: number
  raisedCents: number
  lastUpdated: string | null
}

export const campaignDefaults = Object.freeze({
  goalCents: 80000,
  raisedCents: 0,
  lastUpdated: null,
})

export const campaign: Campaign = {
  goalCents: campaignDefaults.goalCents,
  raisedCents: campaignDefaults.raisedCents,
  lastUpdated: campaignDefaults.lastUpdated,
}