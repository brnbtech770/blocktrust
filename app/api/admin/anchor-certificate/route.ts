// app/api/admin/anchor-certificate/route.ts
// POST — ancrage Polygon manuel d'un certificat (dashboard admin)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import { isDashboardAdmin } from '@/lib/admin-utils'
import {
  adminAnchorCertificate,
  AdminAnchorCertificateError,
} from '@/lib/admin-certificate-anchor'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const bodySchema = z
  .object({
    certificateId: z.string().cuid(),
  })
  .strict()

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.email || !isDashboardAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Corps JSON invalide' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Données invalides', details: parsed.error.flatten() },
      { status: 400 },
    )
  }

  try {
    const result = await adminAnchorCertificate(parsed.data.certificateId)
    return NextResponse.json({
      success: true,
      txHash: result.txHash,
      polygonScanUrl: result.polygonScanUrl,
      alreadyAnchored: result.alreadyAnchored,
      ...(result.blockNumber != null ? { blockNumber: result.blockNumber } : {}),
    })
  } catch (err: unknown) {
    if (err instanceof AdminAnchorCertificateError) {
      return NextResponse.json({ error: err.message }, { status: err.status })
    }
    console.error('[admin/anchor-certificate]', err)
    return NextResponse.json({ error: 'Erreur interne' }, { status: 500 })
  }
}
