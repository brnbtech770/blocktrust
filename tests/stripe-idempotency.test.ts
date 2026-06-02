import { describe, it, expect, vi, beforeEach } from 'vitest'

const prismaMock = vi.hoisted(() => ({
  processedStripeEvent: {
    create: vi.fn(),
    deleteMany: vi.fn(),
  },
}))

vi.mock('@/app/lib/db', () => ({ prisma: prismaMock }))

import {
  stripeWebhookAlreadyHandled,
  stripeWebhookMarkHandled,
  stripeWebhookReleaseClaim,
} from '@/lib/stripe-webhook-idempotency'

/** Simule une erreur Prisma de violation de contrainte unique (P2002). */
function uniqueViolation() {
  return Object.assign(new Error('Unique constraint failed'), { code: 'P2002' })
}

describe('stripe-webhook-idempotency — claim atomique', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('1ère réception : INSERT réussit → retourne false (à traiter)', async () => {
    prismaMock.processedStripeEvent.create.mockResolvedValue({ eventId: 'evt_1' })

    const handled = await stripeWebhookAlreadyHandled('evt_1', 'checkout.session.completed')

    expect(handled).toBe(false)
    expect(prismaMock.processedStripeEvent.create).toHaveBeenCalledWith({
      data: { eventId: 'evt_1', type: 'checkout.session.completed' },
    })
  })

  it('réception en double : conflit P2002 → retourne true (à ignorer)', async () => {
    prismaMock.processedStripeEvent.create.mockRejectedValue(uniqueViolation())

    const handled = await stripeWebhookAlreadyHandled('evt_dup')

    expect(handled).toBe(true)
  })

  it('type optionnel → persiste null', async () => {
    prismaMock.processedStripeEvent.create.mockResolvedValue({ eventId: 'evt_2' })

    await stripeWebhookAlreadyHandled('evt_2')

    expect(prismaMock.processedStripeEvent.create).toHaveBeenCalledWith({
      data: { eventId: 'evt_2', type: null },
    })
  })

  it('autre erreur DB → PROPAGÉE (jamais de fail-open silencieux)', async () => {
    prismaMock.processedStripeEvent.create.mockRejectedValue(
      Object.assign(new Error('connection reset'), { code: 'P1001' }),
    )

    await expect(stripeWebhookAlreadyHandled('evt_err')).rejects.toThrow('connection reset')
  })
})

describe('stripe-webhook-idempotency — release & mark', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('release supprime la réclamation (permet le rejeu Stripe)', async () => {
    prismaMock.processedStripeEvent.deleteMany.mockResolvedValue({ count: 1 })

    await stripeWebhookReleaseClaim('evt_release')

    expect(prismaMock.processedStripeEvent.deleteMany).toHaveBeenCalledWith({
      where: { eventId: 'evt_release' },
    })
  })

  it('release avale les erreurs DB (fail-soft, ne lève pas)', async () => {
    prismaMock.processedStripeEvent.deleteMany.mockRejectedValue(new Error('db down'))

    await expect(stripeWebhookReleaseClaim('evt_x')).resolves.toBeUndefined()
  })

  it('markHandled est un no-op (la réclamation atomique fait foi)', async () => {
    await expect(stripeWebhookMarkHandled('evt_any')).resolves.toBeUndefined()
    expect(prismaMock.processedStripeEvent.create).not.toHaveBeenCalled()
  })
})
