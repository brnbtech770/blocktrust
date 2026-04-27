// app/api/cron/polygon-retry/route.ts
// Cron quotidien : retry des ancrages Polygon en échec ou en attente
// pour les certificats ACTIVE. Bearer CRON_SECRET requis.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { anchorToPolygon, isPolygonConfigured } from '@/lib/polygon'
import { createAdminAlert } from '@/lib/admin-alerts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 300

const MAX_PER_RUN = 25

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET non configuré' }, { status: 503 })
  }

  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!isPolygonConfigured()) {
    return NextResponse.json({
      success: true,
      skipped: true,
      reason: 'Polygon non configuré',
    })
  }

  const candidates = await prisma.certificate.findMany({
    where: {
      status: 'ACTIVE',
      blockchainStatus: { in: ['FAILED', 'PENDING'] },
    },
    orderBy: { issuedAt: 'asc' },
    take: MAX_PER_RUN,
    select: {
      id: true,
      entityId: true,
      blockchainStatus: true,
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  let anchored = 0
  let failed = 0
  let skipped = 0

  for (const cert of candidates) {
    const hash = cert.signatures[0]?.contextHash ?? cert.signatures[0]?.jti
    if (!hash) {
      skipped += 1
      continue
    }
    try {
      const anchor = await anchorToPolygon(cert.id, hash)
      await prisma.certificate.update({
        where: { id: cert.id },
        data: {
          polygonTxHash: anchor.txHash,
          polygonBlock: anchor.blockNumber,
          polygonAnchoredAt: new Date(),
          polygonExplorerUrl: anchor.explorerUrl,
          blockchainStatus: 'ANCHORED',
        },
      })
      await createAdminAlert({
        type: 'CERT_ANCHORED',
        title: 'Certificat ancré sur Polygon (cron retry)',
        description: `TX: ${anchor.txHash} — bloc #${anchor.blockNumber}`,
        entityId: cert.entityId,
        metadata: {
          certificateId: cert.id,
          txHash: anchor.txHash,
          blockNumber: anchor.blockNumber,
          explorerUrl: anchor.explorerUrl,
          via: 'cron',
        },
      }).catch(() => undefined)
      anchored += 1
    } catch (err: any) {
      console.error('[cron/polygon-retry] échec', cert.id, ':', err?.message ?? err)
      await prisma.certificate
        .update({
          where: { id: cert.id },
          data: { blockchainStatus: 'FAILED' },
        })
        .catch(() => undefined)
      failed += 1
    }
  }

  return NextResponse.json({
    success: true,
    examined: candidates.length,
    anchored,
    failed,
    skipped,
  })
}
