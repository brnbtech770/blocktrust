import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'
import { isAdmin } from '@/lib/admin-utils'
import { isDiscoveryExpired, isDiscoveryPlan, resolveAccountPlan } from '@/lib/plan-features'

const schema = z.object({
  accountType: z.enum(['INDIVIDUAL', 'BUSINESS']),
  siret: z.string().length(14).optional(),
  companyName: z.string().optional(),
  address: z.string().optional(),
  activite: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: 'Non authentifié' }, { status: 401 }
    )
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides' }, { status: 400 }
    )
  }

  const { accountType, siret, companyName, address, activite } = parsed.data

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        biometricConsentAt: true,
        email: true,
        subscription: { select: { plan: true } },
      },
    })

    // Le plan gratuit Découverte ne déclenche JAMAIS le KYC (pas de Stripe Identity,
    // pas de coût 1,50€). La vérification d'identité est réservée aux plans payants.
    const effectivePlan = resolveAccountPlan(user?.subscription?.plan, {
      isAdmin: isAdmin(user?.email ?? session.user.email),
    })
    if (isDiscoveryPlan(effectivePlan) || isDiscoveryExpired(effectivePlan)) {
      return NextResponse.json(
        {
          error:
            "La vérification d'identité est disponible avec une formule payante. Activez votre certification pour vérifier votre identité.",
          code: 'UPGRADE_REQUIRED',
          upgradeUrl: '/pricing',
        },
        { status: 403 },
      )
    }

    if (!user?.biometricConsentAt) {
      return NextResponse.json(
        {
          error: 'Consentement biométrique requis avant la vérification d\'identité',
          code: 'BIOMETRIC_CONSENT_REQUIRED',
        },
        { status: 403 },
      )
    }

    const verificationSession =
      await stripe.identity.verificationSessions.create({
        type: 'document',
        metadata: {
          userId:      session.user.id,
          accountType,
        },
        options: {
          document: {
            require_matching_selfie: true,
            allowed_types: [
              'id_card',
              'passport',
              'driving_license',
            ],
          },
        },
        return_url:
          'https://blocktrust.tech/onboarding/verify?status=complete',
      })

    if (!verificationSession?.url) {
      return NextResponse.json(
        { error: 'Stripe Identity non disponible' },
        { status: 500 }
      )
    }

    await prisma.kYCVerification.create({
      data: {
        userId:                session.user.id,
        stripeSessionId:       verificationSession.id,
        stripeVerificationUrl: verificationSession.url,
        accountType,
        status:                'PENDING',
        siretVerified:         !!siret,
        siretData:             siret
          ? {
              siret,
              companyName: companyName ?? null,
              address: address ?? null,
              activite: activite ?? null,
              source: 'insee_sirene_3.11',
            }
          : undefined,
      },
    })

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        stripeIdentityId: verificationSession.id,
        accountType:      accountType === 'INDIVIDUAL' ? 'PERSONAL' : 'BUSINESS',
        kycStatus:        'PENDING',
        siret:            siret ?? undefined,
        companyName:      companyName ?? undefined,
      },
    })

    return NextResponse.json({
      url:       verificationSession.url,
      sessionId: verificationSession.id,
    })

  } catch (err) {
    console.error('[KYC START ERROR]', err)
    return NextResponse.json(
      { error: 'Erreur Stripe Identity' },
      { status: 500 }
    )
  }
}
