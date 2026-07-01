/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * GET /api/bis/verify/[signatureId] — vérification publique BIS
 */
import { NextRequest, NextResponse } from 'next/server'
import { hashIp } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import {
  computeBisDisplayLevel,
  verifyBisSignature,
} from '@/lib/bis-sign'
import { getTrustEngineResultForApi } from '@/lib/trust-engine-cache'
import {
  checkPublicBisVerifyRateLimit,
  PUBLIC_RATE_LIMIT_503_BODY,
} from '@/lib/rate-limit-public-failclosed'
import { btErrorDevDetails } from '@/lib/prodLog'

type RouteContext = { params: Promise<{ signatureId: string }> }

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const ipHash = hashIp(clientIp(req))
    const rate = await checkPublicBisVerifyRateLimit(ipHash)
    if (!rate.ok && rate.kind === 'unavailable') {
      return NextResponse.json(PUBLIC_RATE_LIMIT_503_BODY, { status: 503 })
    }
    if (!rate.ok) {
      return NextResponse.json(
        { error: 'rate_limited' },
        {
          status: 429,
          headers: rate.retryAfter ? { 'Retry-After': String(rate.retryAfter) } : undefined,
        },
      )
    }

    const { signatureId } = await context.params
    const id = signatureId.trim()
    if (!id) {
      return NextResponse.json({ error: 'Identifiant invalide' }, { status: 400 })
    }

    const record = await prisma.interactionSignature.findUnique({
      where: { id },
      include: {
        senderCert: {
          include: {
            entity: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    kycStatus: true,
                    trustScore: true,
                  },
                },
              },
            },
          },
        },
        sender: { select: { name: true, email: true } },
      },
    })

    if (!record) {
      return NextResponse.json(
        {
          valid: false,
          bisLevel: 0,
          error: 'Signature introuvable',
        },
        { status: 404 },
      )
    }

    const cryptoResult = await verifyBisSignature(record.signature)

    if (cryptoResult.valid && !record.verified) {
      await prisma.interactionSignature
        .update({
          where: { id: record.id },
          data: { verified: true, verifiedAt: new Date() },
        })
        .catch((err) => console.error('[bis verify] mark verified', err))
    }

    const senderUser = record.senderCert.entity.user
    const trustEngine = await getTrustEngineResultForApi(record.senderCertId).catch(
      () => null,
    )

    const certificateStatus =
      record.senderCert.status === 'REVOKED'
        ? 'REVOKED'
        : record.senderCert.status === 'ACTIVE' ||
            record.senderCert.status === 'ANCHORED'
          ? 'ACTIVE'
          : record.senderCert.status

    const bisLevel = computeBisDisplayLevel({
      valid: cryptoResult.valid,
      certificateStatus: record.senderCert.status,
      interactionType: record.interactionType,
      verified: cryptoResult.valid ? true : record.verified,
      senderKycVerified: senderUser.kycStatus === 'VERIFIED',
    })

    return NextResponse.json({
      valid: cryptoResult.valid,
      bisLevel,
      sender: {
        email: record.senderEmail,
        name: record.sender.name ?? senderUser.name ?? null,
        certId: record.senderCertId,
        trustScore: trustEngine?.globalScore ?? senderUser.trustScore ?? 0,
      },
      recipient: { email: record.recipientEmail },
      interactionType: record.interactionType,
      contextLabel: record.contextLabel,
      contentHash: record.contentHash,
      signedAt: record.createdAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
      certificateStatus,
      polygonAnchored: Boolean(record.polygonTxHash ?? record.senderCert.polygonTxHash),
      polygonExplorerUrl: record.senderCert.polygonExplorerUrl,
      verified: cryptoResult.valid || record.verified,
      verifiedAt: record.verifiedAt?.toISOString() ?? null,
      reason: cryptoResult.valid ? undefined : cryptoResult.reason,
    })
  } catch (error) {
    btErrorDevDetails(error, 'BIS verify error')
    return NextResponse.json(
      { error: 'Erreur lors de la vérification BIS' },
      { status: 500 },
    )
  }
}
