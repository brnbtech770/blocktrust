import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPostRequest } from './helpers/mock-request'

const prismaMock = vi.hoisted(() => ({
  user: {
    findFirst: vi.fn(),
    update: vi.fn().mockResolvedValue({}),
  },
  subscription: {
    upsert: vi.fn().mockResolvedValue({}),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  },
  plan: {
    findUnique: vi.fn(),
  },
}))

const constructEventMock = vi.hoisted(() => vi.fn())
const subscriptionsRetrieveMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/stripe', () => ({
  stripe: {
    webhooks: {
      constructEvent: constructEventMock,
    },
    subscriptions: {
      retrieve: subscriptionsRetrieveMock,
    },
    invoices: {
      retrieve: vi.fn(),
    },
  },
}))

vi.mock('@/app/lib/db', () => ({
  prisma: prismaMock,
}))

vi.mock('@/lib/stripe-webhook-idempotency', () => ({
  stripeWebhookAlreadyHandled: vi.fn().mockResolvedValue(false),
  stripeWebhookMarkHandled: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/admin-alerts', () => ({
  createKycSubmittedAdminAlertIfNew: vi.fn(),
  createNewPaymentAdminAlertIfNew: vi.fn(),
}))

vi.mock('@/lib/trustscore', () => ({
  persistUserTrustScore: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
}))

vi.mock('@/lib/prodLog', () => ({
  btLog: vi.fn(),
  btError: vi.fn(),
  btErrorDevDetails: vi.fn(),
}))

import { POST } from '@/app/api/stripe/webhook/route'

describe('Stripe webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    prismaMock.plan.findUnique.mockResolvedValue(null)
  })

  it("active l'abonnement sur checkout.session.completed", async () => {
    const subscription = {
      id: 'sub_123',
      status: 'active',
      customer: 'cus_123',
      items: { data: [{ price: { id: 'price_essentiel' } }] },
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
    }

    constructEventMock.mockReturnValue({
      id: 'evt_checkout_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          mode: 'subscription',
          subscription: 'sub_123',
          customer: 'cus_123',
        },
      },
    })

    subscriptionsRetrieveMock.mockResolvedValue(subscription)
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      name: 'User',
    })

    process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY = 'price_essentiel'

    const res = await POST(
      mockPostRequest('/api/stripe/webhook', '{}', {
        'stripe-signature': 'sig_valid',
      }),
    )

    expect(res.status).toBe(200)
    expect(prismaMock.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          status: 'active',
          stripeSubscriptionId: 'sub_123',
        }),
      }),
    )
  })

  it('désactive sur customer.subscription.deleted', async () => {
    constructEventMock.mockReturnValue({
      id: 'evt_deleted_1',
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_123',
          customer: 'cus_123',
        },
      },
    })

    const res = await POST(
      mockPostRequest('/api/stripe/webhook', '{}', {
        'stripe-signature': 'sig_valid',
      }),
    )

    expect(res.status).toBe(200)
    expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_123' },
      data: {
        status: 'canceled',
        plan: 'ESSENTIEL',
      },
    })
  })

  it('rejette les webhooks sans signature valide', async () => {
    constructEventMock.mockImplementation(() => {
      throw new Error('Invalid signature')
    })

    const res = await POST(
      mockPostRequest('/api/stripe/webhook', '{}', {
        'stripe-signature': 'sig_invalid',
      }),
    )

    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid signature')
  })

  it('rejette les requêtes sans en-tête stripe-signature', async () => {
    const res = await POST(mockPostRequest('/api/stripe/webhook', '{}'))
    expect(res.status).toBe(400)
  })
})
