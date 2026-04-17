import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { sendKYCRejectedEmail } from '@/lib/kyc-email'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params
  const body = await req.json().catch(() => ({}))
  const reason = (body.reason as string) || 'Vérification refusée'

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus:         'REJECTED',
      kycRejectedAt:     new Date(),
      kycRejectedReason: reason,
    },
  })

  sendKYCRejectedEmail(userId, reason).catch(console.error)

  return NextResponse.json({ success: true })
}
