import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      kycStatus:         true,
      kycVerifiedAt:     true,
      kycRejectedAt:     true,
      kycRejectedReason: true,
      stripeIdentityId:  true,
      accountType:       true,
    },
  })

  if (!user) {
    return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
  }

  const verification = user.stripeIdentityId
    ? await prisma.kYCVerification.findFirst({
        where: { stripeSessionId: user.stripeIdentityId },
        select: {
          stripeVerificationUrl: true,
          status:                true,
        },
      })
    : null

  return NextResponse.json({
    ...user,
    verificationUrl: verification?.stripeVerificationUrl,
  })
}
