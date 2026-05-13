// app/api/user/certified-contacts/route.ts
// PATCH — coordonnées certifiées au niveau compte User (max 10 / champ, validation partagée avec Entity)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { validateCertifiedContactArrays } from '@/lib/certified-contact'

export const dynamic = 'force-dynamic'

export async function PATCH(req: NextRequest): Promise<NextResponse> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON invalide' }, { status: 400 })
  }

  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
  }

  const payload = body as Record<string, unknown>
  const v = validateCertifiedContactArrays({
    certifiedEmails: payload.certifiedEmails,
    certifiedPhones: payload.certifiedPhones,
    certifiedDomains: payload.certifiedDomains,
  })

  if (!v.ok) {
    return NextResponse.json(
      { error: v.error.reason, field: v.error.field },
      { status: 400 }
    )
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      certifiedEmails: v.value.emails,
      certifiedPhones: v.value.phones,
      certifiedDomains: v.value.domains,
    },
  })

  return NextResponse.json({ success: true })
}
