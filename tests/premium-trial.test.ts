import { describe, expect, it } from 'vitest'
import {
  formatPremiumTrialEndFr,
  getPremiumTrialBillingLabel,
  isExpiredPremiumTrial,
  isPremiumTrialSubscription,
  PREMIUM_TRIAL_END,
  resolvePremiumTrialDisplayName,
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

  it('expose les libellés essai Premium admin', () => {
    expect(getPremiumTrialBillingLabel()).toBe('Gratuit (essai Premium)')
    const end = new Date('2026-09-29T21:59:59.999Z')
    expect(formatPremiumTrialEndFr(end)).toMatch(/29/)
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

describe('resolvePremiumTrialDisplayName', () => {
  it('uses entity first and last name when present', () => {
    expect(
      resolvePremiumTrialDisplayName(
        {
          firstName: 'Jim',
          lastName: 'Acoca',
          legalName: null,
          tradeName: null,
        },
        'jimacoca@gmail.com',
      ),
    ).toBe('Jim Acoca')
  })

  it('falls back to email local part when entity has no name', () => {
    expect(
      resolvePremiumTrialDisplayName(
        {
          firstName: null,
          lastName: null,
          legalName: null,
          tradeName: null,
        },
        'jusaadoun@gmail.com',
      ),
    ).toBe('Jusaadoun')
  })
})
