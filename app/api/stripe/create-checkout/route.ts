// app/api/stripe/create-checkout/route.ts
// Créer une session Stripe Checkout (POST JSON ou GET après auth / signin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import type Stripe from 'stripe'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'
import {
  isValidPriceId,
  isLegacyPriceId,
  getPlanIdFromPriceId,
  getIntervalFromPriceId,
  getFamilleAddonPriceId,
  isPerSeatPlan,
  isB2CPlanId,
  TEAM_SEATS_MIN,
  TEAM_SEATS_MAX,
  FAMILLE_ADDON_MAX,
} from '@/lib/pricing'
import { assertEmailVerifiedForFeature } from '@/lib/require-email-verified'
import { LEGAL_DOC_VERSION } from '@/lib/legal'

type CheckoutQuantities = { quantity?: number; addonQuantity?: number }

/** Consentement contractuel recueilli avant la création de la session de paiement. */
type CheckoutConsent = {
  /** Acceptation des CGU + CGV (obligatoire, contrôlée aussi par le schéma Zod). */
  acceptedTerms: boolean
  /** Renonciation B2C à l'exécution immédiate (art. 10 CGV) — particuliers uniquement. */
  waiver?: boolean
}

/**
 * Valide et normalise les quantités côté serveur (defense-in-depth).
 * - Plans par siège (Team) : quantity ∈ [TEAM_SEATS_MIN, TEAM_SEATS_MAX]
 * - Autres plans : quantity forcé à 1
 * - Famille : addonQuantity ∈ [0, FAMILLE_ADDON_MAX] ; ignoré pour les autres plans
 */
function resolveQuantities(
  planId: string,
  input: CheckoutQuantities,
): { seatQuantity: number; addonQuantity: number } {
  // Sièges
  let seatQuantity = 1
  if (isPerSeatPlan(planId)) {
    const q = Math.floor(Number(input.quantity ?? TEAM_SEATS_MIN))
    if (!Number.isFinite(q) || q < TEAM_SEATS_MIN || q > TEAM_SEATS_MAX) {
      throw Object.assign(
        new Error(`Nombre de sièges invalide (de ${TEAM_SEATS_MIN} à ${TEAM_SEATS_MAX})`),
        { status: 400 },
      )
    }
    seatQuantity = q
  }

  // Add-on profils (Famille uniquement)
  let addonQuantity = 0
  if (planId === 'FAMILLE' && input.addonQuantity != null) {
    const a = Math.floor(Number(input.addonQuantity))
    if (!Number.isFinite(a) || a < 0 || a > FAMILLE_ADDON_MAX) {
      throw Object.assign(
        new Error(`Nombre de profils supplémentaires invalide (de 0 à ${FAMILLE_ADDON_MAX})`),
        { status: 400 },
      )
    }
    addonQuantity = a
  }

  return { seatQuantity, addonQuantity }
}

async function createStripeCheckoutUrlForSessionUser(
  email: string,
  priceId: string,
  quantities: CheckoutQuantities = {},
  consent: CheckoutConsent,
): Promise<string> {
  // Contrôle serveur (defense-in-depth) : pas de session sans acceptation CGU+CGV.
  if (consent.acceptedTerms !== true) {
    throw Object.assign(new Error('Acceptation des CGU et CGV requise'), { status: 400 })
  }

  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw Object.assign(new Error('Utilisateur non trouvé'), { status: 404 })
  }

  if (isLegacyPriceId(priceId)) {
    throw Object.assign(
      new Error('Ce plan n\'est plus disponible à la souscription'),
      { status: 410 },
    )
  }

  if (!isValidPriceId(priceId)) {
    throw Object.assign(new Error('Price ID invalide'), { status: 400 })
  }

  const planId = getPlanIdFromPriceId(priceId) ?? ''
  const { seatQuantity, addonQuantity } = resolveQuantities(planId, quantities)

  // Trace horodatée du consentement (preuve) — écrite avant la création de session.
  // La renonciation au droit de rétractation ne concerne que les particuliers (B2C) :
  // double garde — plan B2C ET compte PERSONAL (jamais pour un compte BUSINESS).
  const isB2C = isB2CPlanId(planId)
  const isPersonal = user.accountType === 'PERSONAL'
  const recordWaiver = isB2C && isPersonal && consent.waiver === true
  const now = new Date()
  await prisma.user.update({
    where: { id: user.id },
    data: {
      cguAcceptedAt: now,
      cguVersion: LEGAL_DOC_VERSION,
      cgvAcceptedAt: now,
      cgvVersion: LEGAL_DOC_VERSION,
      ...(recordWaiver ? { retractationWaiverAt: now } : {}),
    },
  })

  let stripeCustomerId = user.stripeCustomerId

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: user.email || undefined,
      name: user.name || undefined,
      metadata: {
        userId: user.id,
      },
    })

    stripeCustomerId = customer.id

    await prisma.user.update({
      where: { id: user.id },
      data: { stripeCustomerId },
    })
  } else {
    try {
      await stripe.customers.retrieve(stripeCustomerId)
    } catch {
      const customer = await stripe.customers.create({
        email: user.email || undefined,
        name: user.name || undefined,
        metadata: {
          userId: user.id,
        },
      })

      stripeCustomerId = customer.id

      await prisma.user.update({
        where: { id: user.id },
        data: { stripeCustomerId },
      })
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

  const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
    {
      price: priceId,
      quantity: seatQuantity,
    },
  ]

  // Famille : add-on profils supplémentaires (même cycle que le plan choisi)
  if (planId === 'FAMILLE' && addonQuantity > 0) {
    const interval = getIntervalFromPriceId(priceId) ?? 'monthly'
    const addonPriceId = getFamilleAddonPriceId(interval)
    if (!addonPriceId) {
      throw Object.assign(
        new Error('Add-on profils indisponible (prix non configuré)'),
        { status: 400 },
      )
    }
    lineItems.push({ price: addonPriceId, quantity: addonQuantity })
  }

  // Complément (non substitut) à notre trace DB : case ToS rendue et bloquée par Stripe.
  // Activé uniquement si STRIPE_TOS_CONSENT=1 ET qu'une "Terms of service URL" est
  // configurée dans le Dashboard Stripe (sinon Stripe refuse la création de session).
  const tosConsent = process.env.STRIPE_TOS_CONSENT === '1'
  const consentParams = tosConsent
    ? {
        consent_collection: { terms_of_service: 'required' as const },
        custom_text: {
          terms_of_service_acceptance: {
            message:
              "J'accepte les Conditions générales d'utilisation et de vente de BLOCKTRUST.",
          },
        },
      }
    : {}

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: lineItems,
    ...consentParams,
    success_url: `${baseUrl}/onboarding/verify`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: {
      userId: user.id,
      planId,
      seats: String(seatQuantity),
      extraProfiles: String(addonQuantity),
      cgvVersion: LEGAL_DOC_VERSION,
      retractationWaiver: recordWaiver ? 'true' : 'false',
    },
  })

  if (!checkoutSession.url) {
    throw new Error('URL de checkout Stripe manquante')
  }

  return checkoutSession.url
}

const postCheckoutSchema = z.object({
  priceId: z.string().min(1).max(128),
  quantity: z.number().int().min(1).max(TEAM_SEATS_MAX).optional(),
  addonQuantity: z.number().int().min(0).max(FAMILLE_ADDON_MAX).optional(),
  // Acceptation CGU+CGV obligatoire : z.literal(true) => 400 si absent ou false.
  acceptedTerms: z.literal(true),
  // Renonciation B2C (art. 10 CGV) — optionnelle, prise en compte pour les particuliers.
  waiver: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const emailGuard = await assertEmailVerifiedForFeature(session.user.id)
    if (!emailGuard.ok) {
      return NextResponse.json(
        { error: emailGuard.code, message: emailGuard.message },
        { status: emailGuard.status },
      )
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }
    const parsed = postCheckoutSchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }
    const { priceId, quantity, addonQuantity, acceptedTerms, waiver } = parsed.data

    const url = await createStripeCheckoutUrlForSessionUser(
      session.user.email,
      priceId,
      { quantity, addonQuantity },
      { acceptedTerms, waiver },
    )
    return NextResponse.json({ url })
  } catch (error: unknown) {
    console.error('❌ Erreur création session Stripe:', error)
    const status = typeof error === 'object' && error !== null && 'status' in error ? Number((error as { status: number }).status) : 500
    const message =
      error instanceof Error ? error.message : 'Erreur lors de la création de la session'
    if (status === 400 || status === 404) {
      return NextResponse.json({ error: message }, { status })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * Compatibilité callbackUrl=/api/stripe/create-checkout?priceId=... après /auth/signin.
 * Ne crée PLUS de session directement : redirige vers /checkout/confirm afin que
 * l'acceptation CGU+CGV (et la renonciation B2C) soit toujours recueillie avant paiement.
 */
export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.email) {
    const signIn = new URL('/auth/signin', req.url)
    signIn.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`)
    return NextResponse.redirect(signIn)
  }

  const priceId = req.nextUrl.searchParams.get('priceId')
  if (!priceId) {
    return NextResponse.redirect(new URL('/pricing', req.url))
  }

  const confirm = new URL('/checkout/confirm', req.url)
  confirm.searchParams.set('priceId', priceId)
  const quantity = req.nextUrl.searchParams.get('quantity')
  const addonQuantity = req.nextUrl.searchParams.get('addonQuantity')
  if (quantity) confirm.searchParams.set('quantity', quantity)
  if (addonQuantity) confirm.searchParams.set('addonQuantity', addonQuantity)
  return NextResponse.redirect(confirm)
}
