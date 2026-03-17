import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { sendManualEntryApprovedEmail } from '@/lib/trust-circle-email'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.email) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  if (!isAdmin(session.user.email)) return NextResponse.json({ error: 'Admin requis' }, { status: 403 })

  const { id } = await params

  const entry = await prisma.userManualTrustEntry.update({
    where: { id },
    data: {
      status:           'ADMIN_VERIFIED',
      adminValidatedBy: session.user.id,
      adminValidatedAt: new Date(),
    },
  })

  sendManualEntryApprovedEmail(entry.requestedBy, entry.entityName).catch(console.error)

  return NextResponse.json({ success: true })
}
