import { describe, expect, it } from 'vitest'
import {
  CRITICAL_FRAUD_REASONS,
  GRACE_PERIOD_MS,
  isCriticalFraudMetadata,
  isInGracePeriod,
  shouldAlertLowTrustScore,
  shouldSendKycReminder,
  shouldSkipAlertForNewAccount,
} from '@/lib/alert-grace-period'

describe('alert-grace-period', () => {
  const freshUser = { createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000) }
  const matureUser = { createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) }

  it('isInGracePeriod — compte < 72 h', () => {
    expect(isInGracePeriod(freshUser)).toBe(true)
    expect(isInGracePeriod(matureUser)).toBe(false)
  })

  it('shouldSkipAlertForNewAccount — skip volume faible en grâce', () => {
    expect(
      shouldSkipAlertForNewAccount(freshUser, 'SUSPICIOUS_VOLUME', { count: 25 }),
    ).toBe(true)
    expect(
      shouldSkipAlertForNewAccount(freshUser, 'SUSPICIOUS_VOLUME', { count: 100 }),
    ).toBe(false)
  })

  it('shouldSkipAlertForNewAccount — fraude avérée jamais skip', () => {
    for (const reason of CRITICAL_FRAUD_REASONS) {
      expect(
        shouldSkipAlertForNewAccount(freshUser, 'FRAUD_ALERT', { metadata: { reason } }),
      ).toBe(false)
    }
  })

  it('shouldSkipAlertForNewAccount — NEW_USER jamais skip', () => {
    expect(shouldSkipAlertForNewAccount(freshUser, 'NEW_USER')).toBe(false)
  })

  it('isCriticalFraudMetadata — revoked_still_scanned', () => {
    expect(isCriticalFraudMetadata({ rule: 'revoked_still_scanned' })).toBe(true)
  })

  it('shouldAlertLowTrustScore — Découverte jamais', () => {
    expect(
      shouldAlertLowTrustScore({
        trustScore: 5,
        accountAgeMs: GRACE_PERIOD_MS,
        plan: 'DISCOVERY',
      }),
    ).toBe(false)
  })

  it('shouldAlertLowTrustScore — compte récent seuil 10', () => {
    expect(
      shouldAlertLowTrustScore({
        trustScore: 15,
        accountAgeMs: 2 * 24 * 60 * 60 * 1000,
        plan: 'ESSENTIEL',
      }),
    ).toBe(false)
    expect(
      shouldAlertLowTrustScore({
        trustScore: 5,
        accountAgeMs: 2 * 24 * 60 * 60 * 1000,
        plan: 'ESSENTIEL',
      }),
    ).toBe(true)
  })

  it('shouldSendKycReminder — pas pour Découverte', () => {
    expect(shouldSendKycReminder('DISCOVERY')).toBe(false)
    expect(shouldSendKycReminder('ESSENTIEL')).toBe(true)
  })
})
