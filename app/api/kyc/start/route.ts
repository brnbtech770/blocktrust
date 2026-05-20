import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

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
