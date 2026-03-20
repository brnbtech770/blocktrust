// app/api/stripe/create-checkout/route.ts
// Créer une session Stripe Checkout (POST JSON ou GET après auth / signin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'
import { isValidPriceId, getPlanIdFromPriceId } from '@/lib/pricing'

async function createStripeCheckoutUrlForSessionUser(email: string, priceId: string): Promise<string> {
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

  const checkoutSession = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${baseUrl}/onboarding/verify`,
    cancel_url: `${baseUrl}/pricing`,
    metadata: {
      userId: user.id,
      planId,
    },
  })

  if (!checkoutSession.url) {
    throw new Error('URL de checkout Stripe manquante')
  }

  return checkoutSession.url
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const { priceId } = body

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json({ error: 'priceId requis' }, { status: 400 })
    }

    const url = await createStripeCheckoutUrlForSessionUser(session.user.email, priceId)
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

  try {
    const url = await createStripeCheckoutUrlForSessionUser(session.user.email, priceId)
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('❌ Erreur création session Stripe (GET):', error)
    return NextResponse.redirect(pricing)
  }
}
