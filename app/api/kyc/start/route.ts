import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'
import { isAdmin } from '@/lib/admin-utils'
import { isDiscoveryExpired, isDiscoveryPlan, resolveAccountPlan } from '@/lib/plan-features'
import { checkKycRateLimit } from '@/lib/rate-limit-cost'

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

    // Anti-abus : créer une session Stripe Identity coûte ~1,50€. Max 3 démarrages / h
    // par utilisateur (bt:kyc). Placé juste avant l'appel payant pour ne pas pénaliser
    // les réponses guardées (Découverte, consentement). Fail-soft via Redis lazy.
    const kycRate = await checkKycRateLimit(session.user.id)
    if (!kycRate.ok) {
      return NextResponse.json(
        {
          error: "Trop de démarrages de vérification d'identité. Réessayez plus tard.",
          code: 'RATE_LIMITED',
        },
        {
          status: 429,
          headers: kycRate.retryAfter
            ? { 'Retry-After': String(kycRate.retryAfter) }
            : undefined,
        },
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
