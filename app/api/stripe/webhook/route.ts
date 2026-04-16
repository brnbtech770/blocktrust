// app/api/stripe/webhook/route.ts
// Gère les événements Stripe (webhooks)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/app/lib/db'
import { btError, btErrorDevDetails, btLog } from '@/lib/prodLog'
import { sendEmail } from '@/lib/email'
import { PaymentSuccessEmail, getPaymentSuccessSubject } from '@/emails/PaymentSuccessEmail'
import { PaymentConfirmationEmail } from '@/emails/PaymentConfirmationEmail'
import {
  createKycSubmittedAdminAlertIfNew,
  createNewPaymentAdminAlertIfNew,
} from '@/lib/admin-alerts'

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

function formatSubscriptionAmount(sub: Stripe.Subscription): string {
  const price = sub.items.data[0]?.price
  if (price?.unit_amount == null) return '—'
  const currency = (price.currency || 'eur').toUpperCase()
  const amount = price.unit_amount / 100
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
  }).format(amount)
  const interval = price.recurring?.interval
  if (interval === 'year') return `${formatted}/an`
  return `${formatted}/mois`
}

const PAYMENT_CONFIRMATION_DASHBOARD_URL = 'https://blocktrust.tech/dashboard'

function displayPlanLabel(planCode: string): string {
  if (!planCode?.trim()) return 'BlockTrust'
  return planCode
    .split('_')
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join(' ')
}

/** Montant unitaire affiché (sans /mois — la période est indiquée à part). */
function formatStripeSubscriptionUnitAmount(sub: Stripe.Subscription): string {
  const price = sub.items.data[0]?.price
  if (price?.unit_amount == null) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: (price.currency || 'eur').toUpperCase(),
  }).format(price.unit_amount / 100)
}

function billingPeriodFromSubscription(sub: Stripe.Subscription): 'mensuel' | 'annuel' {
  const interval = sub.items.data[0]?.price?.recurring?.interval
  return interval === 'year' ? 'annuel' : 'mensuel'
}

function formatSubscriptionPeriodEndLong(sub: Stripe.Subscription): string {
  const end = (sub as unknown as { current_period_end: number }).current_period_end
  return new Date(end * 1000).toLocaleDateString('fr-FR', {
    dateStyle: 'long',
  })
}

async function hostedInvoiceUrlFromSubscription(
  sub: Stripe.Subscription
): Promise<string | undefined> {
  const latest = sub.latest_invoice
  if (!latest) return undefined
  try {
    const id = typeof latest === 'string' ? latest : latest.id
    const inv = await stripe.invoices.retrieve(id)
    return inv.hosted_invoice_url ?? undefined
  } catch {
    return undefined
  }
}

/**
 * Email de confirmation d’abonnement (template sombre BlockTrust).
 * Les erreurs d’envoi sont loguées sans faire échouer le webhook.
 */
async function sendPaymentConfirmationEmailForSubscription(
  user: { id: string; email: string | null; name: string | null },
  sub: Stripe.Subscription,
  planCode: string,
  opts?: { amount?: string; invoiceUrl?: string | null }
) {
  if (!user.email?.trim()) return

  const planName = displayPlanLabel(planCode)
  const amount = opts?.amount ?? formatStripeSubscriptionUnitAmount(sub)
  const billingPeriod = billingPeriodFromSubscription(sub)
  const nextBillingDate = formatSubscriptionPeriodEndLong(sub)
  const invoiceUrl =
    opts?.invoiceUrl ??
    (await hostedInvoiceUrlFromSubscription(sub))

  const { error: emailErr } = await sendEmail({
    to: user.email,
    subject: `✓ Votre abonnement BlockTrust ${planName} est activé`,
    react: PaymentConfirmationEmail({
      userName: user.name?.trim() || user.email,
      planName,
      amount,
      billingPeriod,
      nextBillingDate,
      invoiceUrl,
      dashboardUrl: PAYMENT_CONFIRMATION_DASHBOARD_URL,
    }),
  })

  if (emailErr) {
    btErrorDevDetails(
      { context: 'PaymentConfirmation email', to: user.email, error: emailErr },
      'Payment confirmation email failed'
    )
  } else {
    btLog(
      `[Stripe] PaymentConfirmation email → ${user.email}`,
      'Payment confirmation email sent'
    )
  }
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
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const customerId =
          typeof sub.customer === 'string' ? sub.customer : sub.customer?.id
        if (!customerId) break

        const user = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
        })
        if (!user) {
          btLog(
            `ℹ️ NEW_PAYMENT skip — aucun user pour customer ${customerId}`,
            'Subscription created — user not found'
          )
          break
        }

        const priceId = sub.items.data[0]?.price?.id
        const plan = mapPriceIdToPlan(priceId || '')
        const amountLabel = formatSubscriptionAmount(sub)
        await createNewPaymentAdminAlertIfNew({
          userId: user.id,
          email: user.email,
          plan,
          amountLabel,
          stripeSubscriptionId: sub.id,
        })

        await sendPaymentConfirmationEmailForSubscription(user, sub, plan)
        break
      }

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
        const invoice = event.data.object as Stripe.Invoice & {
          subscription?: string | null
          billing_reason?: string | null
          hosted_invoice_url?: string | null
          amount_paid?: number | null
          currency?: string | null
        }

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

          // Renouvellements : évite le doublon avec la première facture (subscription_create) déjà couverte par customer.subscription.created
          if (invoice.billing_reason === 'subscription_cycle') {
            const stripeSub = subscription as Stripe.Subscription
            const priceId = stripeSub.items.data[0]?.price?.id
            const plan = mapPriceIdToPlan(priceId || '')
            let paidAmount: string | undefined
            if (invoice.amount_paid != null && invoice.currency) {
              paidAmount = new Intl.NumberFormat('fr-FR', {
                style: 'currency',
                currency: invoice.currency.toUpperCase(),
              }).format(invoice.amount_paid / 100)
            }
            const paidUser = await prisma.user.findFirst({
              where: { stripeCustomerId: customerId },
            })
            if (paidUser) {
              await sendPaymentConfirmationEmailForSubscription(paidUser, stripeSub, plan, {
                amount: paidAmount,
                invoiceUrl: invoice.hosted_invoice_url,
              })
            }
          }
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
