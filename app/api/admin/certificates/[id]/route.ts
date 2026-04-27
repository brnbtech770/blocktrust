// app/api/admin/certificates/[id]/route.ts
// API admin pour changer le statut d'un certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { createAdminAlert } from '@/lib/admin-alerts'
import { persistUserTrustScore } from '@/lib/trustscore'
import {
  anchorToPolygon,
  computeCertificateAnchorHash,
  isPolygonConfigured,
} from '@/lib/polygon'

const actionSchema = z.object({
  action: z.enum(['activate', 'suspend', 'reactivate', 'revoke', 'reject']),
  reason: z.string().optional(),
})

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    // Vérifier l'authentification et les droits admin
    const session = await auth()
    if (!session?.user?.email || !isAdmin(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await req.json()
    const parsed = actionSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { action, reason } = parsed.data

    // Récupérer le certificat
    const certificate = await prisma.certificate.findUnique({
      where: { id },
      select: { id: true, entityId: true, status: true },
    })

    if (!certificate) {
      return NextResponse.json({ error: 'Certificat non trouvé' }, { status: 404 })
    }

    // Déterminer le nouveau statut
    let newStatus: string
    const currentStatus = certificate.status

    switch (action) {
      case 'activate':
        if (currentStatus !== 'PENDING') {
          return NextResponse.json(
            { error: `Impossible d'activer un certificat avec le statut ${currentStatus}` },
            { status: 400 }
          )
        }
        newStatus = 'ACTIVE'
        break

      case 'reject':
        if (currentStatus !== 'PENDING') {
          return NextResponse.json(
            { error: `Impossible de rejeter un certificat avec le statut ${currentStatus}` },
            { status: 400 }
          )
        }
        newStatus = 'REVOKED'
        break

      case 'suspend':
        if (currentStatus !== 'ACTIVE' && currentStatus !== 'ANCHORED') {
          return NextResponse.json(
            { error: `Impossible de suspendre un certificat avec le statut ${currentStatus}` },
            { status: 400 }
          )
        }
        newStatus = 'SUSPENDED'
        break

      case 'reactivate':
        if (currentStatus !== 'SUSPENDED') {
          return NextResponse.json(
            { error: `Impossible de réactiver un certificat avec le statut ${currentStatus}` },
            { status: 400 }
          )
        }
        newStatus = 'ACTIVE'
        break

      case 'revoke':
        if (currentStatus === 'REVOKED' || currentStatus === 'EXPIRED') {
          return NextResponse.json(
            { error: 'Ce certificat est déjà révoqué ou expiré' },
            { status: 400 }
          )
        }
        newStatus = 'REVOKED'
        break

      default:
        return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    // Mettre à jour le certificat
    const updateData: any = {
      status: newStatus,
    }

    if (action === 'revoke' || action === 'reject') {
      updateData.revokedAt = new Date()
      if (reason) {
        updateData.revocationReason = reason
      }
    }

    const updatedCertificate = await prisma.certificate.update({
      where: { id },
      data: updateData,
    })

    if (action === 'activate' || action === 'reactivate') {
      await createAdminAlert({
        type: 'CERT_ACTIVATED',
        title: 'Certificat activé',
        description: `Certificat ${id}`,
        entityId: certificate.entityId,
        metadata: { certificateId: id },
      })
      const ownerEntity = await prisma.entity.findUnique({
        where: { id: certificate.entityId },
        select: { userId: true },
      })
      if (ownerEntity) {
        await persistUserTrustScore(ownerEntity.userId)
      }

      // Ancrage Polygon (fire-and-forget) — uniquement à l'activation initiale
      if (action === 'activate' && isPolygonConfigured()) {
        triggerPolygonAnchor(id).catch((err) => {
          console.error('[Polygon] Anchor trigger failed:', err?.message ?? err)
        })
      }
    } else if (action === 'revoke' || action === 'reject') {
      await createAdminAlert({
        type: 'CERT_REVOKED',
        title: 'Certificat révoqué',
        description: `Certificat ${id}`,
        entityId: certificate.entityId,
        metadata: { certificateId: id },
      })
    }

    return NextResponse.json({
      success: true,
      certificate: updatedCertificate,
      action,
      previousStatus: currentStatus,
      newStatus,
    })
  } catch (error: any) {
    console.error('❌ Admin certificate action error:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du certificat',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

/**
 * Ancre un certificat sur Polygon (fire-and-forget).
 * Utilise le contextHash de la dernière Signature comme empreinte ancrée.
 * Met à jour blockchainStatus → ANCHORED (succès) | FAILED (échec).
 */
async function triggerPolygonAnchor(certificateId: string): Promise<void> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      entityId: true,
      blockchainStatus: true,
      issuedAt: true,
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  if (!cert) return
  if (cert.blockchainStatus === 'ANCHORED') return // déjà ancré

  const hash = computeCertificateAnchorHash(cert)

  try {
    const anchor = await anchorToPolygon(certificateId, hash)
    await prisma.certificate.update({
      where: { id: certificateId },
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
      title: 'Certificat ancré sur Polygon',
      description: `TX: ${anchor.txHash} — bloc #${anchor.blockNumber}`,
      entityId: cert.entityId,
      metadata: {
        certificateId,
        txHash: anchor.txHash,
        blockNumber: anchor.blockNumber,
        explorerUrl: anchor.explorerUrl,
      },
    })
  } catch (err: any) {
    console.error('[Polygon] Ancrage échoué pour', certificateId, ':', err?.message ?? err)
    await prisma.certificate
      .update({
        where: { id: certificateId },
        data: { blockchainStatus: 'FAILED' },
      })
      .catch(() => undefined)
  }
}
