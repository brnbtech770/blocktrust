// GET ?certificateId= — historique des liens rotatifs (propriétaire)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import {
  assertCertificateOwnedByUser,
  listCertificateVerifyTokensForUser,
} from '@/lib/certificate-verify-token'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const certificateId = req.nextUrl.searchParams.get('certificateId')?.trim()
  if (!certificateId) {
    return NextResponse.json({ error: 'certificateId requis' }, { status: 400 })
  }

  const certificate = await assertCertificateOwnedByUser(
    certificateId,
    session.user.id,
  )
  if (!certificate) {
    return NextResponse.json({ error: 'Certificat introuvable' }, { status: 404 })
  }

  const tokens = await listCertificateVerifyTokensForUser(
    certificateId,
    session.user.id,
  )

  return NextResponse.json({ tokens })
}
