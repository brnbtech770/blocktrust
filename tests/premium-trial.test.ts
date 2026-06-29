import { describe, expect, it } from 'vitest'
import {
  isExpiredPremiumTrial,
  isPremiumTrialSubscription,
  PREMIUM_TRIAL_END,
} from '@/lib/premium-trial'

describe('premium-trial', () => {
  it('detects active premium trial without Stripe', () => {
    expect(
      isPremiumTrialSubscription({
        plan: 'PREMIUM',
        status: 'active',
        stripeSubscriptionId: null,
        currentPeriodEnd: PREMIUM_TRIAL_END,
      }),
    ).toBe(true)
  })

  it('rejects paid Stripe premium as trial', () => {
    expect(
      isPremiumTrialSubscription({
        plan: 'PREMIUM',
        status: 'active',
        stripeSubscriptionId: 'sub_123',
        currentPeriodEnd: PREMIUM_TRIAL_END,
      }),
    ).toBe(false)
  })

  it('detects expired trial', () => {
    expect(
      isExpiredPremiumTrial({
        plan: 'PREMIUM',
        status: 'active',
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date('2020-01-01'),
      }),
    ).toBe(true)
  })

  it('active trial not expired before end date', () => {
    expect(
      isExpiredPremiumTrial({
        plan: 'PREMIUM',
        status: 'active',
        stripeSubscriptionId: null,
        currentPeriodEnd: new Date(Date.now() + 86_400_000),
      }),
    ).toBe(false)
  })
})
