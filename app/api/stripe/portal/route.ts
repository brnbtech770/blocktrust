// app/api/stripe/portal/route.ts
// Crée une session portail client Stripe
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'

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
      include: { subscription: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Récupérer le stripeCustomerId depuis la subscription ou user
    const stripeCustomerId = user.subscription?.stripeCustomerId || user.stripeCustomerId

    if (!stripeCustomerId) {
      return NextResponse.json(
        { error: 'Aucun abonnement trouvé' },
        { status: 404 }
      )
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

    // Créer la session portail
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${baseUrl}/dashboard/subscription`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('❌ Portal session error:', error)
    return NextResponse.json(
      { error: 'Erreur création portail' },
      { status: 500 }
    )
  }
}
