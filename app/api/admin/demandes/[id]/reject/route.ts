import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

  const { id } = await params
  const body = await req.json().catch(() => ({}))
  const reason = (body.reason as string) || 'Demande rejetée'

  await prisma.userManualTrustEntry.update({
    where: { id },
    data: {
      status:           'REJECTED',
      adminRejectedAt:  new Date(),
      adminRejectReason: reason,
    },
  })

  return NextResponse.json({ success: true })
}
