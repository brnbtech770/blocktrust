import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { sendKYCApprovedEmail } from '@/lib/kyc-email'
import { persistUserTrustScore } from '@/lib/trustscore'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        kycStatus:     'VERIFIED',
        kycVerifiedAt: new Date(),
      },
    }),
    prisma.kYCVerification.updateMany({
      where: { userId },
      data: {
        status:              'VERIFIED',
        adminOverride:       true,
        adminOverrideBy:     session.user.id,
        adminOverrideAt:     new Date(),
        adminOverrideReason: 'Validation manuelle admin',
      },
    }),
  ])

  await persistUserTrustScore(userId)

  sendKYCApprovedEmail(userId).catch(console.error)

  return NextResponse.json({ success: true })
}
