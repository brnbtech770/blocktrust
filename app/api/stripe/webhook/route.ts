/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// app/api/stripe/webhook/route.ts
// Gère les événements Stripe (webhooks)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe'
import { prisma } from '@/app/lib/db'
import { btError, btErrorDevDetails, btLog } from '@/lib/prodLog'
import { sendEmail } from '@/lib/email'
import { PaymentConfirmationEmail } from '@/emails/PaymentConfirmationEmail'
import {
  createKycSubmittedAdminAlertIfNew,
  createNewPaymentAdminAlertIfNew,
} from '@/lib/admin-alerts'
import { persistUserTrustScore } from '@/lib/trustscore'
import {
  stripeWebhookAlreadyHandled,
  stripeWebhookMarkHandled,
  stripeWebhookReleaseClaim,
} from '@/lib/stripe-webhook-idempotency'
import {
  isFamilleAddonPriceId,
  FAMILLE_INCLUDED_PROFILES,
  FAMILLE_MAX_PROFILES,
} from '@/lib/pricing'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

// Désactiver le bodyParser pour les webhooks Stripe
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Mapping priceId → plan name (monthly + yearly, B2C + B2B)
/**
 * Synchronise `User.planId` à partir du `stripePriceId` actif. Aucune erreur
 * si le Plan n'est pas seedé en base : on log et on continue (le webhook ne
 * doit pas casser pour ça).
 */
async function syncUserPlanFromPriceId(userId: string, priceId: string | null | undefined) {
  if (!priceId) return
  const plan = await prisma.plan.findUnique({ where: { stripePriceId: priceId } })
  if (!plan) {
    btLog(
      `ℹ️ Plan introuvable pour stripePriceId=${priceId} (User.planId non synchronisé)`,
      'Plan not seeded for stripePriceId'
    )
    return
  }
  await prisma.user.update({
    where: { id: userId },
    data: { planId: plan.id },
  })
  btLog(
    `✅ User.planId synchronisé pour user ${userId} → plan ${plan.name}`,
    `User plan synced — ${plan.name}`
  )
}

function mapPriceIdToPlan(priceId: string): string {
  const priceMap: Record<string, string> = {
    // B2C — grille courante (lib/pricing.ts PLANS_B2C)
    [process.env.STRIPE_PRICE_ESSENTIEL_MONTHLY || '']: 'ESSENTIEL',
    [process.env.STRIPE_PRICE_ESSENTIEL_YEARLY || '']: 'ESSENTIEL',
    [process.env.STRIPE_PRICE_PREMIUM_MONTHLY || '']: 'PREMIUM',
    [process.env.STRIPE_PRICE_PREMIUM_YEARLY || '']: 'PREMIUM',
    [process.env.STRIPE_PRICE_FAMILLE_MONTHLY || '']: 'FAMILLE',
    [process.env.STRIPE_PRICE_FAMILLE_YEARLY || '']: 'FAMILLE',
    // legacy — rétro-compat uniquement, non souscriptible (isLegacyPriceId bloque le checkout)
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_MONTHLY || '']: 'FAMILLE_PLUS',
    [process.env.STRIPE_PRICE_FAMILLE_PLUS_YEARLY || '']: 'FAMILLE_PLUS',
    // B2B — grille courante
    [process.env.STRIPE_PRICE_STARTER_MONTHLY || '']: 'STARTER',
    [process.env.STRIPE_PRICE_STARTER_YEARLY || '']: 'STARTER',
    [process.env.STRIPE_PRICE_TEAM_MONTHLY || '']: 'TEAM',
    [process.env.STRIPE_PRICE_TEAM_YEARLY || '']: 'TEAM',
    // legacy — rétro-compat uniquement, non souscriptible
    [process.env.STRIPE_PRICE_SOLO_PRO_MONTHLY || '']: 'SOLO_PRO',
    [process.env.STRIPE_PRICE_SOLO_PRO_YEARLY || '']: 'SOLO_PRO',
    [process.env.STRIPE_PRICE_BUSINESS_MONTHLY || '']: 'BUSINESS',
    [process.env.STRIPE_PRICE_BUSINESS_YEARLY || '']: 'BUSINESS',
  }
  // Remove empty key from fallback env vars
  delete priceMap['']

  const mapped = priceMap[priceId]
  if (mapped) return mapped

  // SYS-6 : priceId inconnu → pas de droits payants (jamais ESSENTIEL par défaut)
  btLog(
    `⚠️ priceId inconnu webhook mapPriceIdToPlan (${priceId ? `${priceId.slice(0, 12)}…` : 'vide'}) → DISCOVERY`,
    'Unknown Stripe priceId — fallback DISCOVERY',
  )
  return 'DISCOVERY'
}

/**
 * Extrait depuis une Subscription Stripe : le priceId du plan de BASE
 * (en ignorant l'add-on Famille), le nombre de sièges (quantité du plan de
 * base) et le nombre de profils supplémentaires (quantité de la ligne add-on).
 */
function extractPlanQuantities(sub: Stripe.Subscription): {
  basePriceId: string | undefined
  seats: number
  extraProfiles: number
} {
  const items = sub.items?.data ?? []
  const addonItem = items.find((it) => isFamilleAddonPriceId(it.price?.id ?? ''))
  const baseItem = items.find((it) => !isFamilleAddonPriceId(it.price?.id ?? '')) ?? items[0]
  return {
    basePriceId: baseItem?.price?.id,
    seats: baseItem?.quantity ?? 1,
    extraProfiles: addonItem?.quantity ?? 0,
  }
}

/** Plans B2B (organisations / sièges). */
function isB2BPlan(planCode: string): boolean {
  return ['SOLO_PRO', 'STARTER', 'TEAM', 'BUSINESS', 'ENTERPRISE'].includes(planCode)
}

/**
 * Provisionne les quotas dérivés de la quantité achetée. Fail-soft : toute
 * erreur est loguée sans faire échouer le webhook.
 * - B2B : Organization.maxSeats = sièges (orgs détenues par le user)
 * - Famille : PersonalAccount.maxProfiles = 5 + profils sup. (plafond 10)
 */
async function provisionQuantities(
  userId: string,
  planCode: string,
  seats: number,
  extraProfiles: number,
) {
  try {
    if (isB2BPlan(planCode) && seats > 0) {
      await prisma.organization.updateMany({
        where: { ownerId: userId },
        data: { maxSeats: seats },
      })
      btLog(
        `🪑 Org maxSeats=${seats} pour user ${userId.slice(0, 8)}…`,
        'Org maxSeats provisioned',
      )
    }
    if (planCode === 'FAMILLE') {
      const maxProfiles = Math.min(
        FAMILLE_INCLUDED_PROFILES + Math.max(0, extraProfiles),
        FAMILLE_MAX_PROFILES,
      )
      await prisma.personalAccount.updateMany({
        where: { ownerId: userId },
        data: { maxProfiles },
      })
      btLog(
        `👪 PersonalAccount maxProfiles=${maxProfiles} pour user ${userId.slice(0, 8)}…`,
        'PersonalAccount maxProfiles provisioned',
      )
    }
  } catch (err) {
    btErrorDevDetails(
      { context: 'provisionQuantities', userId, planCode, seats, extraProfiles, err },
      'Provisioning quantities failed (fail-soft)',
    )
  }
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
  if (!planCode?.trim()) return 'BLOCKTRUST™'
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
 * Email de confirmation d’abonnement (template sombre BLOCKTRUST™).
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
    subject: `✓ Votre abonnement BLOCKTRUST™ ${planName} est activé`,
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
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    btError(
      `❌ Webhook signature verification failed: ${message}`,
      'Webhook signature verification failed'
    )
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  // Idempotence DB atomique. Si la base est indisponible, on renvoie 500 (Stripe
  // rejouera) plutôt que de risquer un double-traitement.
  let duplicate: boolean
  try {
    duplicate = await stripeWebhookAlreadyHandled(event.id, event.type)
  } catch (e) {
    btErrorDevDetails(e, 'Stripe idempotency store unavailable')
    return NextResponse.json(
      { error: 'idempotency_unavailable' },
      { status: 500 }
    )
  }
  if (duplicate) {
    btLog(
      `[stripe] Event ${event.id} déjà traité`,
      'Stripe webhook duplicate skipped'
    )
    return NextResponse.json({ received: true })
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

        const { basePriceId: priceId } = extractPlanQuantities(sub)
        const plan = mapPriceIdToPlan(priceId || '')
        const amountLabel = formatSubscriptionAmount(sub)

        // FIX E2E : synchroniser User.planId depuis stripePriceId
        await syncUserPlanFromPriceId(user.id, priceId)

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
        const session = event.data.object as Stripe.Checkout.Session

        if (session.mode === 'subscription' && session.subscription) {
          const subscription = await stripe.subscriptions.retrieve(
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          )
          const sub = subscription

          const customerId =
            typeof session.customer === 'string'
              ? session.customer
              : session.customer?.id
          if (!customerId) break

          const { basePriceId: priceId, seats, extraProfiles } = extractPlanQuantities(sub)
          const plan = mapPriceIdToPlan(priceId ?? '')

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

          const currentPeriodEnd = new Date(
            (sub as unknown as { current_period_end: number }).current_period_end * 1000
          )
          await prisma.subscription.upsert({
            where: { userId: user.id },
            create: {
              userId: user.id,
              stripeCustomerId: customerId,
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            plan,
            seats,
            extraProfiles,
            status: sub.status === 'active' ? 'active' : 'inactive',
            currentPeriodEnd,
          },
          update: {
            stripeSubscriptionId: sub.id,
            stripePriceId: priceId,
            plan,
            seats,
            extraProfiles,
            status: sub.status === 'active' ? 'active' : 'inactive',
            currentPeriodEnd,
          },
        })

          // FIX E2E : synchroniser User.planId depuis stripePriceId
          await syncUserPlanFromPriceId(user.id, priceId)

          // Provisionnement des quotas dérivés de la quantité achetée (fail-soft)
          await provisionQuantities(user.id, plan, seats, extraProfiles)

          btLog(
            `✅ Subscription créée/activée pour user ${user.id} - Plan: ${plan} (sièges=${seats}, profils+=${extraProfiles})`,
            `Subscription créée/activée — plan: ${plan}`
          )

          await persistUserTrustScore(user.id)

          // Email de confirmation : uniquement via customer.subscription.created (PaymentConfirmationEmail)
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
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Abonnement résilié : statut canceled + retour au plan gratuit Découverte.
        // (On ne laisse JAMAIS un plan payant résiduel — cf. resolveEffectivePlan.)
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: 'canceled',
            plan: 'DISCOVERY',
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
        const subscription = event.data.object as Stripe.Subscription
        const customerId =
          typeof subscription.customer === 'string'
            ? subscription.customer
            : subscription.customer?.id
        if (!customerId) break
        const { basePriceId: priceId, seats, extraProfiles } = extractPlanQuantities(subscription)
        const plan = mapPriceIdToPlan(priceId ?? '')

        // Mettre à jour la subscription
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            stripePriceId: priceId,
            plan,
            seats,
            extraProfiles,
            status: subscription.status === 'active' ? 'active' : 'inactive',
            currentPeriodEnd: new Date(
              (subscription as unknown as { current_period_end: number }).current_period_end * 1000
            ),
          },
        })

        // FIX E2E : synchroniser User.planId si le user existe pour ce customer
        const updatedUser = await prisma.user.findFirst({
          where: { stripeCustomerId: customerId },
          select: { id: true },
        })
        if (updatedUser) {
          await syncUserPlanFromPriceId(updatedUser.id, priceId)
          // Re-provisionner si la quantité a changé (ex. portail Stripe)
          await provisionQuantities(updatedUser.id, plan, seats, extraProfiles)
        }

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
        if (!verificationUrl) {
          try {
            const session = await stripe.identity.verificationSessions.retrieve(vs.id)
            verificationUrl = session.url ?? undefined
          } catch {
            /* ignore */
          }
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

    await stripeWebhookMarkHandled(event.id)

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    // Le traitement a échoué : on libère la réclamation pour que Stripe rejoue
    // l'événement (sinon il serait définitivement marqué comme « déjà traité »).
    await stripeWebhookReleaseClaim(event.id)
    btErrorDevDetails(error, 'Stripe webhook handler error')
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}
