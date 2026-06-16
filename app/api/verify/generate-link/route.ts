// POST — génère un lien /verify?vt=… (token Prisma, TTL configurable)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import {
  assertCertificateOwnedByUser,
  createCertificateVerifyToken,
} from '@/lib/certificate-verify-token'

export const dynamic = 'force-dynamic'

type GenerateLinkBody = {
  certificateId?: string
  ttlHours?: number
}

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  let body: GenerateLinkBody
  try {
    body = (await req.json()) as GenerateLinkBody
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const certificateId = body.certificateId?.trim()
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

  const result = await createCertificateVerifyToken({
    certId: certificate.id,
    ttlHours: body.ttlHours,
  })

  return NextResponse.json({
    token: result.token,
    verifyUrl: result.verifyUrl,
    expiresAt: result.expiresAt,
  })
}
