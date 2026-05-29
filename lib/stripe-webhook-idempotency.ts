// lib/stripe-webhook-idempotency.ts
// Dédup Stripe webhook par event.id (Upstash Redis). Fail-soft si Redis absent ou en erreur.
// ============================================================

import { getRedis } from '@/lib/rate-limit-redis'

const EVENT_KEY_PREFIX = 'stripe:event:'

/** TTL 24h — au-delà Stripe ne rediffuse en général plus le même événement. */
const EVENT_TTL_SECONDS = 86400

export async function stripeWebhookAlreadyHandled(eventId: string): Promise<boolean> {
  const redis = getRedis()
  if (!redis) return false
  try {
    const v = await redis.get(`${EVENT_KEY_PREFIX}${eventId}`)
    return v != null && v !== ''
  } catch (err) {
    console.warn('[stripe] idempotence Redis lecture KO', err)
    return false
  }
}

export async function stripeWebhookMarkHandled(eventId: string): Promise<void> {
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.set(`${EVENT_KEY_PREFIX}${eventId}`, '1', { ex: EVENT_TTL_SECONDS })
  } catch (err) {
    console.warn('[stripe] idempotence Redis écriture KO', err)
  }
}
