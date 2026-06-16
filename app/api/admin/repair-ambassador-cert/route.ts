// app/api/admin/repair-ambassador-cert/route.ts
// POST — crée / répare le certificat ambassadeur BLOCKTRUST™ sur la DB de l'environnement courant
// ============================================================

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isDashboardAdmin } from '@/lib/admin-utils'
import { repairBlocktrustSiteAmbassador } from '@/lib/blocktrust-site-cert'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST() {
  const session = await auth()
  if (!session?.user?.email || !isDashboardAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const result = await repairBlocktrustSiteAmbassador()
    return NextResponse.json({
      success: true,
      certificateId: result.certificateId,
      publicCertId: result.publicCertId,
      verifyUrl: result.verifyUrl,
      signatureJwtStored: result.signatureJwtStored,
      blockchainStatus: result.anchor?.alreadyAnchored
        ? 'ANCHORED'
        : result.anchor?.anchored
          ? 'ANCHORED'
          : result.anchorSkipped
            ? 'PENDING'
            : 'PENDING',
      polygonTxHash: result.anchor?.txHash ?? null,
      polygonScanUrl: result.anchor?.explorerUrl ?? null,
      envHint: {
        BLOCKTRUST_SITE_CERT_ID: result.publicCertId,
        NEXT_PUBLIC_BLOCKTRUST_SITE_CERT_ID: result.publicCertId,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Erreur interne'
    console.error('[admin/repair-ambassador-cert]', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
