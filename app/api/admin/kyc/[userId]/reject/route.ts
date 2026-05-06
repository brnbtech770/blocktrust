import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { sendKYCRejectedEmail } from '@/lib/kyc-email'
import { z } from 'zod'

const rejectBodySchema = z
  .object({
    reason: z.string().max(2000).optional(),
  })
  .strict()

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { userId } = await params

  let reasonText = 'Vérification refusée'
  try {
    const json = await req.json()
    const parsed = rejectBodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
    }
    if (parsed.data.reason?.trim()) {
      reasonText = parsed.data.reason.trim()
    }
  } catch {
    // corps vide : défaut
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycStatus:         'REJECTED',
      kycRejectedAt:     new Date(),
      kycRejectedReason: reasonText,
    },
  })

  sendKYCRejectedEmail(userId, reasonText).catch(console.error)

  return NextResponse.json({ success: true })
}
