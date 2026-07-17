import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import {
  DISCOVERY_PLAN,
  DISCOVERY_EXPIRED_PLAN,
  DEFAULT_B2C_PLAN,
  BLOCKCHAIN_STATUS_NOT_ANCHORED,
  isDiscoveryPlan,
  isDiscoveryExpired,
  resolveAccountPlan,
  resolveEffectivePlan,
  getPlanDisplayLabel,
  planAllowsPolygonAnchoring,
  planAllowsTrustCircle,
  isNotAnchored,
} from '@/lib/plan-features'

describe('plan-features — détection du plan Découverte', () => {
  it('reconnaît DISCOVERY (casse / tirets / espaces normalisés)', () => {
    expect(isDiscoveryPlan('DISCOVERY')).toBe(true)
    expect(isDiscoveryPlan('discovery')).toBe(true)
    expect(isDiscoveryPlan('  Discovery  ')).toBe(true)
    expect(isDiscoveryPlan('DISCOVERY_EXPIRED')).toBe(false)
    expect(isDiscoveryPlan('ESSENTIEL')).toBe(false)
  })

  it('reconnaît DISCOVERY_EXPIRED, y compris écrit avec un tiret', () => {
    expect(isDiscoveryExpired('DISCOVERY_EXPIRED')).toBe(true)
    // normalizePlan remplace les tirets par des underscores
    expect(isDiscoveryExpired('discovery-expired')).toBe(true)
    expect(isDiscoveryExpired('DISCOVERY')).toBe(false)
  })

  it('gère null / undefined / chaîne vide sans lever', () => {
    expect(isDiscoveryPlan(null)).toBe(false)
    expect(isDiscoveryPlan(undefined)).toBe(false)
    expect(isDiscoveryPlan('')).toBe(false)
    expect(isDiscoveryExpired(null)).toBe(false)
  })

  it('expose les constantes attendues', () => {
    expect(DISCOVERY_PLAN).toBe('DISCOVERY')
    expect(DISCOVERY_EXPIRED_PLAN).toBe('DISCOVERY_EXPIRED')
    expect(DEFAULT_B2C_PLAN).toBe('DISCOVERY')
    expect(BLOCKCHAIN_STATUS_NOT_ANCHORED).toBe('NOT_ANCHORED')
  })
})

describe('plan-features — resolveEffectivePlan', () => {
  const future = new Date('2099-01-01T00:00:00.000Z')
  const past = new Date('2020-01-01T00:00:00.000Z')

  it('trial Premium sans Stripe avec période en cours → PREMIUM', () => {
    expect(
      resolveEffectivePlan({
        subscription: {
          plan: 'PREMIUM',
          status: 'active',
          stripeSubscriptionId: null,
          currentPeriodEnd: future,
        },
        email: 'jimacoca@gmail.com',
      }),
    ).toBe('PREMIUM')
  })

  it('trial Premium sans Stripe expiré → Découverte', () => {
    expect(
      resolveEffectivePlan({
        subscription: {
          plan: 'PREMIUM',
          status: 'active',
          stripeSubscriptionId: null,
          currentPeriodEnd: past,
        },
        email: 'jusaadoun@gmail.com',
      }),
    ).toBe('DISCOVERY')
  })

  it('abonnement Stripe actif → plan conservé (sans exiger currentPeriodEnd)', () => {
    expect(
      resolveEffectivePlan({
        subscription: {
          plan: 'ESSENTIEL',
          status: 'active',
          stripeSubscriptionId: 'sub_123',
          currentPeriodEnd: null,
        },
        email: 'client@example.com',
      }),
    ).toBe('ESSENTIEL')
  })

  it('abonnement inactif avec plan résiduel → Découverte', () => {
    expect(
      resolveEffectivePlan({
        subscription: { plan: 'PREMIUM', status: 'canceled' },
        email: 'client@example.com',
      }),
    ).toBe('DISCOVERY')
  })

  it('trial Premium actif sans currentPeriodEnd → PREMIUM (sync partielle)', () => {
    expect(
      resolveEffectivePlan({
        subscription: {
          plan: 'PREMIUM',
          status: 'active',
          stripeSubscriptionId: null,
          currentPeriodEnd: null,
        },
        email: 'jimacoca@gmail.com',
      }),
    ).toBe('PREMIUM')
  })

  it('Subscription.plan DISCOVERY + User.plan Premium + trial en cours → PREMIUM', () => {
    expect(
      resolveEffectivePlan({
        subscription: {
          plan: 'DISCOVERY',
          status: 'active',
          stripeSubscriptionId: null,
          currentPeriodEnd: future,
        },
        planType: 'B2C_PREMIUM',
        email: 'jusaadoun@gmail.com',
      }),
    ).toBe('PREMIUM')
  })

  it('compte interne → Enterprise', () => {
    expect(
      resolveEffectivePlan({
        subscription: { plan: 'DISCOVERY', status: 'inactive' },
        email: 'brnbtech@gmail.com',
      }),
    ).toBe('B2B_ENTERPRISE')
  })

  it('subscription DISCOVERY_EXPIRED inactive → DISCOVERY_EXPIRED (mur + guards API)', () => {
    expect(
      resolveEffectivePlan({
        subscription: { plan: 'DISCOVERY_EXPIRED', status: 'inactive' },
        email: 'client@example.com',
      }),
    ).toBe('DISCOVERY_EXPIRED')
  })
})

describe('plan-features — resolveAccountPlan', () => {
  const future = new Date('2099-01-01T00:00:00.000Z')

  it('admin → Enterprise, jamais écrasé par un abonnement', () => {
    expect(resolveAccountPlan('ESSENTIEL', { isAdmin: true })).toBe('B2B_ENTERPRISE')
    expect(resolveAccountPlan(null, { isAdmin: true })).toBe('B2B_ENTERPRISE')
  })

  it("retourne l'abonnement Stripe s'il existe", () => {
    expect(
      resolveAccountPlan('B2B_TEAM', {
        subscriptionStatus: 'active',
        stripeSubscriptionId: 'sub_123',
      }),
    ).toBe('B2B_TEAM')
    expect(
      resolveAccountPlan('PREMIUM', {
        subscriptionStatus: 'active',
        stripeSubscriptionId: 'sub_456',
      }),
    ).toBe('PREMIUM')
  })

  it('trial sans Stripe avec période future', () => {
    expect(
      resolveAccountPlan('PREMIUM', {
        subscriptionStatus: 'active',
        currentPeriodEnd: future,
      }),
    ).toBe('PREMIUM')
  })

  it('sans abonnement → plan gratuit Découverte (jamais Essentiel)', () => {
    expect(resolveAccountPlan(null)).toBe('DISCOVERY')
    expect(resolveAccountPlan(undefined)).toBe('DISCOVERY')
    expect(resolveAccountPlan('   ')).toBe('DISCOVERY')
  })
})

describe('plan-features — getPlanDisplayLabel', () => {
  it('libellés codes courts ET préfixés', () => {
    expect(getPlanDisplayLabel('DISCOVERY')).toBe('Découverte')
    expect(getPlanDisplayLabel('DISCOVERY_EXPIRED')).toBe('Découverte expirée')
    expect(getPlanDisplayLabel('ESSENTIEL')).toBe('Essentiel')
    expect(getPlanDisplayLabel('B2C_ESSENTIEL')).toBe('Essentiel')
    expect(getPlanDisplayLabel('B2B_TEAM')).toBe('Team')
    expect(getPlanDisplayLabel('B2B_ENTERPRISE')).toBe('Entreprise')
    expect(getPlanDisplayLabel('FAMILLE_PLUS')).toBe('Famille+')
  })

  it('plan inconnu / vide → « Découverte » (jamais de défaut Essentiel)', () => {
    expect(getPlanDisplayLabel('PLAN_INEXISTANT')).toBe('Découverte')
    expect(getPlanDisplayLabel(null)).toBe('Découverte')
    expect(getPlanDisplayLabel(undefined)).toBe('Découverte')
  })

  describe('comptes internes (cosmétique)', () => {
    it('compte interne → « Compte interne » (libellé prioritaire, droits inchangés)', () => {
      expect(getPlanDisplayLabel('B2B_ENTERPRISE', { email: 'brnbtech@gmail.com' })).toBe(
        'Compte interne',
      )
      expect(getPlanDisplayLabel('B2B_ENTERPRISE', { email: 'brnbimmo@gmail.com' })).toBe(
        'Compte interne',
      )
    })

    it("email non interne → libellé du plan", () => {
      expect(getPlanDisplayLabel('PREMIUM', { email: 'client@example.com' })).toBe('Premium')
    })
  })
})

describe('plan-features — capacités blockchain / Trust Circle', () => {
  it('Polygon et Trust Circle interdits sur Découverte', () => {
    expect(planAllowsPolygonAnchoring('DISCOVERY')).toBe(false)
    expect(planAllowsTrustCircle('DISCOVERY')).toBe(false)
  })

  it('Trust Circle réservé à Premium et plus (pas Essentiel)', () => {
    expect(planAllowsTrustCircle('ESSENTIEL')).toBe(false)
    expect(planAllowsTrustCircle('B2C_ESSENTIEL')).toBe(false)
    expect(planAllowsTrustCircle('PREMIUM')).toBe(true)
    expect(planAllowsTrustCircle('B2C_PREMIUM')).toBe(true)
    expect(planAllowsTrustCircle('FAMILLE')).toBe(true)
    expect(planAllowsTrustCircle('B2B_STARTER')).toBe(true)
    expect(planAllowsTrustCircle('ENTERPRISE')).toBe(true)
  })

  it('Polygon autorisé sur tout plan payant ; Trust Circle sur B2B', () => {
    expect(planAllowsPolygonAnchoring('PREMIUM')).toBe(true)
    expect(planAllowsPolygonAnchoring('ESSENTIEL')).toBe(true)
    expect(planAllowsTrustCircle('B2B_TEAM')).toBe(true)
  })

  it('isNotAnchored détecte le statut NOT_ANCHORED (insensible à la casse)', () => {
    expect(isNotAnchored('NOT_ANCHORED')).toBe(true)
    expect(isNotAnchored('not_anchored')).toBe(true)
    expect(isNotAnchored('ANCHORED')).toBe(false)
    expect(isNotAnchored(null)).toBe(false)
  })
})
