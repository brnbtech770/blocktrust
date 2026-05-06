// app/api/stripe/identity-webhook/route.ts
// Webhook dédié Stripe Identity (KYC) — utilise STRIPE_IDENTITY_WEBHOOK_SECRET
// Dans le Dashboard Stripe : ajouter une URL d'écoute pour identity.verification_session.*
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/app/lib/db'
import { btError, btErrorDevDetails, btLog } from '@/lib/prodLog'
import { createKycSubmittedAdminAlertIfNew } from '@/lib/admin-alerts'
import { persistUserTrustScore } from '@/lib/trustscore'
import {
  stripeWebhookAlreadyHandled,
  stripeWebhookMarkHandled,
} from '@/lib/stripe-webhook-idempotency'

const identityWebhookSecret = process.env.STRIPE_IDENTITY_WEBHOOK_SECRET!

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  if (!identityWebhookSecret) {
    btError(
      '❌ STRIPE_IDENTITY_WEBHOOK_SECRET manquant',
      'STRIPE_IDENTITY_WEBHOOK_SECRET manquant'
    )
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, identityWebhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    btError(
      `❌ Identity webhook signature verification failed: ${message}`,
      'Identity webhook signature verification failed'
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  const duplicate = await stripeWebhookAlreadyHandled(event.id)
  if (duplicate) {
    btLog(
      `[stripe] Event ${event.id} déjà traité`,
      'Stripe identity webhook duplicate skipped'
    )
    return NextResponse.json({ received: true })
  }

  if (!event.type.startsWith('identity.')) {
    await stripeWebhookMarkHandled(event.id)
    return NextResponse.json({ received: true })
  }

  btLog(`📩 Identity webhook: ${event.type}`, `Identity webhook: ${event.type}`)

  try {
    switch (event.type) {
      case 'identity.verification_session.verified': {
        const vs = event.data.object as { id: string; metadata?: { userId?: string } }
        const userId = vs.metadata?.userId
        if (!userId) break

        await prisma.kYCVerification.updateMany({
          where: { stripeSessionId: vs.id },
          data: { status: 'VERIFIED' },
        })
        await prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus: 'VERIFIED',
            kycVerifiedAt: new Date(),
          },
        })
        await persistUserTrustScore(userId)
        const kycUser = await prisma.user.findUnique({
          where: { id: userId },
          select: { email: true },
        })
        await createKycSubmittedAdminAlertIfNew({
          userId,
          email: kycUser?.email ?? null,
          stripeSessionId: vs.id,
        })
        const { sendKYCApprovedEmail } = await import('@/lib/kyc-email')
        sendKYCApprovedEmail(userId).catch((e) =>
          btErrorDevDetails(e, 'KYC approved email failed')
        )
        btLog(
          `✅ KYC vérifié pour user ${userId}`,
          'KYC verified (identity webhook)'
        )
        break
      }

      case 'identity.verification_session.requires_input': {
        const vs = event.data.object as {
          id: string
          metadata?: { userId?: string }
          url?: string
        }
        const userId = vs.metadata?.userId
        if (!userId) break

        await prisma.kYCVerification.updateMany({
          where: { stripeSessionId: vs.id },
          data: { status: 'REQUIRES_INPUT' },
        })
        let verificationUrl: string | undefined = vs.url
        if (!verificationUrl && (stripe as any).identity?.verificationSessions?.retrieve) {
          try {
            const session = await (stripe as any).identity.verificationSessions.retrieve(vs.id)
            verificationUrl = session?.url
          } catch {
            // ignore
          }
        }
        const { sendKYCRetryEmail } = await import('@/lib/kyc-email')
        sendKYCRetryEmail(userId, verificationUrl).catch((e) =>
          btErrorDevDetails(e, 'KYC retry email failed')
        )
        break
      }

      case 'identity.verification_session.canceled': {
        const vs = event.data.object as { id: string }
        await prisma.kYCVerification.updateMany({
          where: { stripeSessionId: vs.id },
          data: { status: 'CANCELED' },
        })
        break
      }

      default:
        btLog(
          `ℹ️ Événement Identity non géré: ${event.type}`,
          `Identity webhook event not handled: ${event.type}`
        )
    }

    await stripeWebhookMarkHandled(event.id)

    return NextResponse.json({ received: true })
  } catch (error) {
    btErrorDevDetails(error, 'Identity webhook handler error')
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
