// app/api/stripe/identity-webhook/route.ts
// Webhook dédié Stripe Identity (KYC) — utilise STRIPE_IDENTITY_WEBHOOK_SECRET
// Dans le Dashboard Stripe : ajouter une URL d'écoute pour identity.verification_session.*
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/app/lib/db'

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
    console.error('❌ STRIPE_IDENTITY_WEBHOOK_SECRET manquant')
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 500 })
  }

  let event
  try {
    event = stripe.webhooks.constructEvent(body, signature, identityWebhookSecret)
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('❌ Identity webhook signature verification failed:', message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (!event.type.startsWith('identity.')) {
    return NextResponse.json({ received: true })
  }

  console.log(`📩 Identity webhook: ${event.type}`)

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
        const { sendKYCApprovedEmail } = await import('@/lib/kyc-email')
        sendKYCApprovedEmail(userId).catch(console.error)
        console.log(`✅ KYC vérifié pour user ${userId}`)
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
        sendKYCRetryEmail(userId, verificationUrl).catch(console.error)
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
        console.log(`ℹ️ Événement Identity non géré: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('❌ Identity webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
