import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'

const rejectBodySchema = z
  .object({
    reason: z.string().max(2000).optional(),
  })
  .strict()

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  let reasonText = 'Demande rejetée'
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

  await prisma.userManualTrustEntry.update({
    where: { id },
    data: {
      status:           'REJECTED',
      adminRejectedAt:  new Date(),
      adminRejectReason: reasonText,
    },
  })

  return NextResponse.json({ success: true })
}
