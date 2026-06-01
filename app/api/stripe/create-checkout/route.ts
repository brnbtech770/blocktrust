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
  getPlanIdFromPriceId,
  getIntervalFromPriceId,
  getFamilleAddonPriceId,
  isPerSeatPlan,
  TEAM_SEATS_MIN,
  TEAM_SEATS_MAX,
  FAMILLE_ADDON_MAX,
} from '@/lib/pricing'

type CheckoutQuantities = { quantity?: number; addonQuantity?: number }

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
): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw Object.assign(new Error('Utilisateur non trouvé'), { status: 404 })
  }

  if (!isValidPriceId(priceId)) {
    throw Object.assign(new Error('Price ID invalide'), { status: 400 })
  }

  const planId = getPlanIdFromPriceId(priceId) ?? ''
  const { seatQuantity, addonQuantity } = resolveQuantities(planId, quantities)

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

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: lineItems,
    success_url: `${baseUrl}/onboarding/verify`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: {
      userId: user.id,
      planId,
      seats: String(seatQuantity),
      extraProfiles: String(addonQuantity),
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
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
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
    const { priceId, quantity, addonQuantity } = parsed.data

    const url = await createStripeCheckoutUrlForSessionUser(session.user.email, priceId, {
      quantity,
      addonQuantity,
    })
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
 * Permet d'utiliser callbackUrl=/api/stripe/create-checkout?priceId=... après /auth/signin.
 */
export async function GET(req: NextRequest) {
  const session = await auth()

  if (!session?.user?.email) {
    const signIn = new URL('/auth/signin', req.url)
    signIn.searchParams.set('callbackUrl', `${req.nextUrl.pathname}${req.nextUrl.search}`)
    return NextResponse.redirect(signIn)
  }

  const priceId = req.nextUrl.searchParams.get('priceId')
  const pricing = new URL('/pricing', req.url)

  if (!priceId) {
    return NextResponse.redirect(pricing)
  }

  const rawQuantity = req.nextUrl.searchParams.get('quantity')
  const rawAddon = req.nextUrl.searchParams.get('addonQuantity')
  const quantity = rawQuantity ? Number(rawQuantity) : undefined
  const addonQuantity = rawAddon ? Number(rawAddon) : undefined

  try {
    const url = await createStripeCheckoutUrlForSessionUser(session.user.email, priceId, {
      quantity: Number.isFinite(quantity) ? quantity : undefined,
      addonQuantity: Number.isFinite(addonQuantity) ? addonQuantity : undefined,
    })
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('❌ Erreur création session Stripe (GET):', error)
    return NextResponse.redirect(pricing)
  }
}
