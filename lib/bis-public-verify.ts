/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * Vérification publique BIS par ID (API /verify/bis + extension).
 */
import { prisma } from '@/app/lib/db'
import { computeBisDisplayLevel, verifyBisSignature } from '@/lib/bis-sign'
import { computeTrustEngineScore } from '@/lib/trust-engine'

export type PublicBisVerification = {
  valid: boolean
  bisLevel: number
  interactionType: string
  contextLabel: string | null
  signedAt: string
  expiresAt: string
  reason?: string
}

export async function getPublicBisVerification(
  signatureId: string,
): Promise<PublicBisVerification | null> {
  const id = signatureId.trim()
  if (!id) return null

  const record = await prisma.interactionSignature.findUnique({
    where: { id },
    include: {
      senderCert: {
        include: {
          entity: {
            include: {
              user: {
                select: {
                  kycStatus: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!record) {
    return {
      valid: false,
      bisLevel: 0,
      interactionType: 'EMAIL',
      contextLabel: null,
      signedAt: new Date(0).toISOString(),
      expiresAt: new Date(0).toISOString(),
      reason: 'Signature introuvable',
    }
  }

  const cryptoResult = await verifyBisSignature(record.signature)

  if (cryptoResult.valid && !record.verified) {
    void prisma.interactionSignature
      .update({
        where: { id: record.id },
        data: { verified: true, verifiedAt: new Date() },
      })
      .catch((err: unknown) => console.error('[bis verify] mark verified', err))
  }

  const bisLevel = computeBisDisplayLevel({
    valid: cryptoResult.valid,
    certificateStatus: record.senderCert.status,
    interactionType: record.interactionType,
    verified: cryptoResult.valid ? true : record.verified,
    senderKycVerified: record.senderCert.entity.user.kycStatus === 'VERIFIED',
  })

  void computeTrustEngineScore(record.senderCertId).catch(() => null)

  return {
    valid: cryptoResult.valid,
    bisLevel,
    interactionType: record.interactionType,
    contextLabel: record.contextLabel,
    signedAt: record.createdAt.toISOString(),
    expiresAt: record.expiresAt.toISOString(),
    reason: cryptoResult.valid ? undefined : cryptoResult.reason,
  }
}
