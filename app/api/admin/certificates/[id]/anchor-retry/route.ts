// app/api/admin/certificates/[id]/anchor-retry/route.ts
// Admin: relance manuellement l'ancrage Polygon d'un certificat (status FAILED ou PENDING)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import {
  anchorToPolygon,
  computeCertificateAnchorHash,
  isPolygonConfigured,
  notifyAnchorSuccess,
} from '@/lib/polygon'
import { createAdminAlert } from '@/lib/admin-alerts'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function POST(_req: NextRequest, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  if (!isPolygonConfigured()) {
    return NextResponse.json(
      { error: 'Polygon non configuré (POLYGON_RPC_URL/POLYGON_PRIVATE_KEY manquants)' },
      { status: 503 }
    )
  }

  const { id } = await params

  const cert = await prisma.certificate.findUnique({
    where: { id },
    select: {
      id: true,
      entityId: true,
      status: true,
      blockchainStatus: true,
      issuedAt: true,
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  if (!cert) {
    return NextResponse.json({ error: 'Certificat introuvable' }, { status: 404 })
  }
  if (cert.status !== 'ACTIVE') {
    return NextResponse.json(
      { error: 'Le certificat doit être ACTIVE pour être ancré' },
      { status: 400 }
    )
  }
  if (cert.blockchainStatus === 'ANCHORED') {
    return NextResponse.json({ error: 'Déjà ancré' }, { status: 400 })
  }

  // Hash : priorité Signature.contextHash, sinon fallback déterministe
  // dérivé des données du certificat (id + entityId + issuedAt).
  const hash = computeCertificateAnchorHash(cert)

  try {
    const anchor = await anchorToPolygon(id, hash)
    await prisma.certificate.update({
      where: { id },
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
      title: 'Certificat ancré sur Polygon (retry manuel)',
      description: `TX: ${anchor.txHash} — bloc #${anchor.blockNumber}`,
      entityId: cert.entityId,
      metadata: {
        certificateId: id,
        txHash: anchor.txHash,
        blockNumber: anchor.blockNumber,
        explorerUrl: anchor.explorerUrl,
        retried: true,
      },
    })
    notifyAnchorSuccess(id, anchor).catch(() => undefined)
    return NextResponse.json({
      success: true,
      txHash: anchor.txHash,
      blockNumber: anchor.blockNumber,
      explorerUrl: anchor.explorerUrl,
    })
  } catch (err: any) {
    console.error('[Polygon] Retry échoué pour', id, ':', err?.message ?? err)
    await prisma.certificate
      .update({
        where: { id },
        data: { blockchainStatus: 'FAILED' },
      })
      .catch(() => undefined)
    return NextResponse.json(
      {
        error: 'Ancrage échoué',
        details:
          process.env.NODE_ENV === 'development' ? (err?.message ?? String(err)) : undefined,
      },
      { status: 500 }
    )
  }
}
