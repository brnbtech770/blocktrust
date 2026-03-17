// app/api/stripe/create-checkout/route.ts
// Créer une session Stripe Checkout
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'
import { getPlansServer } from '@/lib/pricing'

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const body = await req.json()
    const { priceId } = body

    if (!priceId || typeof priceId !== 'string') {
      return NextResponse.json(
        { error: 'priceId requis' },
        { status: 400 }
      )
    }

    const plans = getPlansServer()
    const validPriceIds = plans.map((p) => p.priceId).filter(Boolean)
    if (!validPriceIds.includes(priceId)) {
      return NextResponse.json(
        { error: 'Price ID invalide' },
        { status: 400 }
      )
    }
    const plan = plans.find((p) => p.priceId === priceId)
    const planId = plan?.id ?? ''

    // Récupérer ou créer un customer Stripe
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
      // Vérifier que le customer existe toujours dans Stripe
      try {
        await stripe.customers.retrieve(stripeCustomerId)
      } catch (error) {
        // Si le customer n'existe plus, en créer un nouveau
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

    // Créer la session Stripe Checkout
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
      success_url: `${baseUrl}/dashboard?success=true`,
      cancel_url: `${baseUrl}/pricing`,
      metadata: {
        userId: user.id,
        planId,
      },
    })

    return NextResponse.json({
      url: checkoutSession.url,
    })
  } catch (error: any) {
    console.error('❌ Erreur création session Stripe:', error)
    return NextResponse.json(
      { error: error.message || 'Erreur lors de la création de la session' },
      { status: 500 }
    )
  }
}
