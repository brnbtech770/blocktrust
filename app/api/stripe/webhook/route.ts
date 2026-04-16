// app/api/stripe/webhook/route.ts
// Gère les événements Stripe (webhooks)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/app/lib/db'
import { btError, btErrorDevDetails, btLog } from '@/lib/prodLog'
import { sendEmail } from '@/lib/email'
import { PaymentSuccessEmail, getPaymentSuccessSubject } from '@/emails/PaymentSuccessEmail'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Désactiver le bodyParser pour les webhooks Stripe
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Mapping priceId → plan name (monthly + yearly, B2C + B2B)
function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    // B2C
    [process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY || '']: 'ESSENTIEL',
    [process.env.STRIPE_PRICE_ESSENTIEL_YEARLY || '']: 'ESSENTIEL',
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '']: 'PREMIUM',
    [process.env.STRIPE_PRICE_PREMIUM_YEARLY || '']: 'PREMIUM',
    [process.env.STRIPE_PRICE_FAMILLE_MONTHLY || '']: 'FAMILLE',
    [process.env.STRIPE_PRICE_FAMILLE_YEARLY || '']: 'FAMILLE',
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY || '']: 'FAMILLE_PLUS',
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY || '']: 'FAMILLE_PLUS',
    // B2B
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'STARTER',
    [process.env.STRIPE_PRICE_STARTER_YEARLY || '']: 'STARTER',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || '']: 'TEAM',
    [process.env.STRIPE_PRICE_TEAM_YEARLY || '']: 'TEAM',
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '']: 'BUSINESS',
    [process.env.STRIPE_PRICE_BUSINESS_YEARLY || '']: 'BUSINESS',
  }
  // Remove empty key from fallback env vars
  delete priceMap['']

  return priceMap[priceId] || 'ESSENTIEL'
}

export async function POST(req: NextRequest) {
  if (!webhookSecret?.trim()) {
    btError(
      '❌ STRIPE_WEBHOOK_SECRET manquant — refus du webhook',
      'STRIPE_WEBHOOK_SECRET manquant — refus du webhook'
    )
    return NextResponse.json({ error: 'Configuration serveur' }, { status: 500 })
  }

  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'Missing signature' }, { status: 400 })
  }

  let event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err: any) {
    btError(
      `❌ Webhook signature verification failed: ${err?.message ?? err}`,
      'Webhook signature verification failed'
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  btLog(`📩 Webhook reçu: ${event.type}`, `Webhook reçu: ${event.type}`)

  try {
    switch (event.type) {
      // ─────────────────────────────────────────────
      // CHECKOUT SESSION COMPLETED
      // ─────────────────────────────────────────────
      case 'checkout.session.completed': {
        const session = event.data.object as any

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
          const sub = subscription as unknown as { current_period_end: number; id: string; status: string; items: { data: { price: { id: string } }[] }; latest_invoice?: string }

          const customerId = session.customer as string
          const priceId = sub.items.data[0]?.price.id
          const plan = mapPriceIdToPlan(priceId)

          // Trouver l'utilisateur
          const user = await prisma.user.findFirst({
            where: { stripeCustomerId: customerId },
          })

          if (!user) {
            btError(
              `❌ User not found for customer ${customerId}`,
              'User not found for Stripe customer'
            )
            return NextResponse.json({ error: 'User not found' }, { status: 500 })
          }

          const currentPeriodEnd = new Date(sub.current_period_end * 1000)
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            plan,
            status: sub.status === 'active' ? 'active' : 'inactive',
            currentPeriodEnd,
          },
          update: {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            plan,
            status: sub.status === 'active' ? 'active' : 'inactive',
            currentPeriodEnd,
          },
        })

          btLog(
            `✅ Subscription créée/activée pour user ${user.id} - Plan: ${plan}`,
            `Subscription créée/activée — plan: ${plan}`
          )

          // Email transactionnel : paiement réussi
          if (user.email) {
            let amountFormatted: string | undefined
            try {
              const invoiceId = sub.latest_invoice
              if (invoiceId && typeof invoiceId === 'string') {
                const invoice = await stripe.invoices.retrieve(invoiceId)
                if (invoice.amount_paid != null && invoice.currency) {
                  amountFormatted = new Intl.NumberFormat('fr-FR', {
                    style: 'currency',
                    currency: (invoice.currency || 'eur').toUpperCase(),
                  }).format(invoice.amount_paid / 100)
                }
              }
            } catch (_) {}
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'
            const { error: emailErr } = await sendEmail({
              to: user.email,
              subject: getPaymentSuccessSubject(plan),
              react: PaymentSuccessEmail({
                planName: plan,
                amountFormatted,
                currentPeriodEnd: currentPeriodEnd.toLocaleDateString('fr-FR', { dateStyle: 'long' }),
                dashboardUrl: `${baseUrl}/dashboard`,
              }),
            })
            if (emailErr) {
              btErrorDevDetails(
                { context: 'Payment email', to: user.email, error: emailErr },
                'Payment confirmation email failed'
              )
            } else {
              btLog(
                `[Stripe] Payment email envoyé à: ${user.email}`,
                'Payment confirmation email sent'
              )
            }
          }
        }
        break
      }

      // ─────────────────────────────────────────────
      // INVOICE PAYMENT SUCCEEDED
      // ─────────────────────────────────────────────
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any

        if (invoice.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription as string
          )
          const subObj = subscription as unknown as { id: string; customer: string; current_period_end: number; status: string }
          const customerId = subObj.customer as string

          await prisma.subscription.updateMany({
            where: { stripeSubscriptionId: subObj.id },
            data: {
              currentPeriodEnd: new Date(subObj.current_period_end * 1000),
              status: subObj.status === 'active' ? 'active' : 'inactive',
            },
          })

          btLog(
            `💰 Paiement réussi - Subscription ${subObj.id} prolongée`,
            'Invoice payment succeeded — subscription renewed'
          )
        }
        break
      }

      // ─────────────────────────────────────────────
      // SUBSCRIPTION DELETED
      // ─────────────────────────────────────────────
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string

        // Mettre à jour la subscription
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'canceled',
            plan: 'ESSENTIEL',
          },
        })

        btLog(
          `❌ Subscription supprimée: ${subscription.id}`,
          'Subscription deleted'
        )
        break
      }

      // ─────────────────────────────────────────────
      // SUBSCRIPTION UPDATED
      // ─────────────────────────────────────────────
      case 'customer.subscription.updated': {
        const subscription = event.data.object as any
        const customerId = subscription.customer as string
        const priceId = subscription.items.data[0]?.price.id
        const plan = mapPriceIdToPlan(priceId)

        // Mettre à jour la subscription
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripePriceId: priceId,
            plan,
            status: subscription.status === 'active' ? 'active' : 'inactive',
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        })

        btLog(
          `🔄 Subscription mise à jour: ${subscription.id} - Plan: ${plan}`,
          `Subscription updated — plan: ${plan}`
        )
        break
      }

      // ─────────────────────────────────────────────
      // STRIPE IDENTITY — Vérification session
      // ─────────────────────────────────────────────
      case 'identity.verification_session.verified': {
        const vs = event.data.object as { id: string; metadata?: { userId?: string } }
        const userId = vs.metadata?.userId
        if (!userId) break

        await prisma.kYCVerification.updateMany({
          where: { stripeSessionId: vs.id },
          data:  { status: 'VERIFIED' },
        })
        await prisma.user.update({
          where: { id: userId },
          data: {
            kycStatus:     'VERIFIED',
            kycVerifiedAt: new Date(),
          },
        })
        const { sendKYCApprovedEmail } = await import('@/lib/kyc-email')
        await sendKYCApprovedEmail(userId)
        btLog(
          `✅ KYC vérifié pour user ${userId}`,
          'KYC verification session verified'
        )
        break
      }

      case 'identity.verification_session.requires_input': {
        const vs = event.data.object as { id: string; metadata?: { userId?: string }; url?: string }
        const userId = vs.metadata?.userId
        if (!userId) break

        await prisma.kYCVerification.updateMany({
          where: { stripeSessionId: vs.id },
          data:  { status: 'REQUIRES_INPUT' },
        })
        let verificationUrl: string | undefined = vs.url
        if (!verificationUrl && (stripe as any).identity?.verificationSessions?.retrieve) {
          try {
            const session = await (stripe as any).identity.verificationSessions.retrieve(vs.id)
            verificationUrl = session?.url ?? undefined
          } catch (_) {}
        }
        const { sendKYCRetryEmail } = await import('@/lib/kyc-email')
        await sendKYCRetryEmail(userId, verificationUrl)
        break
      }

      case 'identity.verification_session.canceled': {
        const vs = event.data.object as { id: string }
        await prisma.kYCVerification.updateMany({
          where: { stripeSessionId: vs.id },
          data:  { status: 'CANCELED' },
        })
        break
      }

      default:
        btLog(
          `ℹ️ Événement non géré: ${event.type}`,
          `Événement webhook non géré: ${event.type}`
        )
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    btErrorDevDetails(error, 'Stripe webhook handler error')
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
