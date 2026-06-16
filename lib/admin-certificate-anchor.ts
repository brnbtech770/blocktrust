/**
 * Ancrage Polygon d'un certificat — action admin (await, avec garde-fous plan).
 */
import { prisma } from '@/app/lib/db'
import { createAdminAlert } from '@/lib/admin-alerts'
import {
  anchorToPolygon,
  computeCertificateAnchorHash,
  isPolygonConfigured,
  notifyAnchorSuccess,
} from '@/lib/polygon'
import {
  BLOCKCHAIN_STATUS_NOT_ANCHORED,
  planAllowsPolygonAnchoring,
  resolveEffectivePlan,
} from '@/lib/plan-features'

export class AdminAnchorCertificateError extends Error {
  readonly status: 400 | 404 | 503 | 500

  constructor(message: string, status: 400 | 404 | 503 | 500) {
    super(message)
    this.name = 'AdminAnchorCertificateError'
    this.status = status
  }
}

export type AdminAnchorCertificateSuccess = {
  success: true
  alreadyAnchored: boolean
  txHash: string
  polygonScanUrl: string | null
  blockNumber?: number
}

export async function adminAnchorCertificate(
  certificateId: string,
): Promise<AdminAnchorCertificateSuccess> {
  if (!isPolygonConfigured()) {
    throw new AdminAnchorCertificateError(
      'Polygon non configuré (POLYGON_RPC_URL / POLYGON_PRIVATE_KEY manquants)',
      503,
    )
  }

  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      entityId: true,
      status: true,
      blockchainStatus: true,
      polygonTxHash: true,
      polygonExplorerUrl: true,
      issuedAt: true,
      entity: {
        select: {
          user: {
            select: {
              email: true,
              subscription: { select: { plan: true, status: true } },
            },
          },
        },
      },
      signatures: {
        orderBy: { issuedAt: 'desc' },
        take: 1,
        select: { contextHash: true, jti: true },
      },
    },
  })

  if (!cert) {
    throw new AdminAnchorCertificateError('Certificat introuvable', 404)
  }

  if (cert.status !== 'ACTIVE' && cert.status !== 'ANCHORED') {
    throw new AdminAnchorCertificateError(
      'Le certificat doit être ACTIVE pour être ancré',
      400,
    )
  }

  if (cert.blockchainStatus === 'ANCHORED' && cert.polygonTxHash) {
    return {
      success: true,
      alreadyAnchored: true,
      txHash: cert.polygonTxHash,
      polygonScanUrl: cert.polygonExplorerUrl,
    }
  }

  if (cert.blockchainStatus === BLOCKCHAIN_STATUS_NOT_ANCHORED) {
    throw new AdminAnchorCertificateError(
      'Plan Découverte — ce certificat n’est pas éligible à l’ancrage Polygon',
      400,
    )
  }

  const effectivePlan = resolveEffectivePlan({
    subscription: cert.entity.user.subscription,
    email: cert.entity.user.email,
  })

  if (!planAllowsPolygonAnchoring(effectivePlan)) {
    throw new AdminAnchorCertificateError(
      `Plan ${effectivePlan} — ancrage Polygon non autorisé`,
      400,
    )
  }

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
      title: 'Certificat ancré sur Polygon (admin)',
      description: `TX: ${anchor.txHash} — bloc #${anchor.blockNumber}`,
      entityId: cert.entityId,
      metadata: {
        certificateId,
        txHash: anchor.txHash,
        blockNumber: anchor.blockNumber,
        explorerUrl: anchor.explorerUrl,
        manualAdmin: true,
      },
    })
    notifyAnchorSuccess(certificateId, anchor).catch(() => undefined)

    return {
      success: true,
      alreadyAnchored: false,
      txHash: anchor.txHash,
      polygonScanUrl: anchor.explorerUrl,
      blockNumber: anchor.blockNumber,
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[Polygon] adminAnchorCertificate échoué pour', certificateId, ':', message)
    await prisma.certificate
      .update({
        where: { id: certificateId },
        data: { blockchainStatus: 'FAILED' },
      })
      .catch(() => undefined)
    throw new AdminAnchorCertificateError('Ancrage échoué', 500)
  }
}
