import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { checkTrustCircleQuota } from '@/lib/checkTrustCircleQuota'
import { z } from 'zod'

const schema = z.object({
  entityName:  z.string().min(1).max(200),
  entityEmail: z.string().email().optional(),
  entityType:  z.enum(['INDIVIDUAL', 'BUSINESS', 'DOMAIN', 'EMAIL']).default('INDIVIDUAL'),
  siret:       z.string().length(14).optional(),
  documents:   z.array(z.string().url()).min(1),
  note:        z.string().max(1000).optional(),
})

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const parsed = schema.safeParse(await req.json())
  if (!parsed.success) {
    const first = parsed.error.issues?.[0]
    return NextResponse.json(
      { error: (first?.message ?? parsed.error.message) || 'Données invalides' },
      { status: 400 }
    )
  }

  const quota = await checkTrustCircleQuota(
    session.user.id,
    (session.user as { plan?: string }).plan ?? 'ESSENTIEL'
  )
  if (!quota.allowed) {
    return NextResponse.json(
      { error: 'QUOTA_EXCEEDED', upgradeUrl: '/pricing' },
      { status: 403 }
    )
  }

  const entry = await prisma.userManualTrustEntry.create({
    data: {
      requestedBy: session.user.id,
      entityName:  parsed.data.entityName,
      entityEmail: parsed.data.entityEmail,
      entityType:  parsed.data.entityType,
      siret:       parsed.data.siret,
      documents:   parsed.data.documents,
      notes:       parsed.data.note,
      status:      'PENDING_ADMIN',
    },
  })

  const { sendAdminManualRequestEmail } = await import('@/lib/trust-circle-email')
  sendAdminManualRequestEmail(
    entry.id,
    session.user.name ?? 'Utilisateur',
    entry.entityName,
    entry.entityType
  ).catch(console.error)

  return NextResponse.json({
    success:   true,
    requestId: entry.id,
    message:   'Demande soumise. Un admin la traitera sous 48h.',
  })
}
