// app/api/public/verify/[id]/route.ts
// API publique White Label de vérification d'un certificat BlockTrust.
//
// GET /api/public/verify/:id
//   Headers: X-API-Key: bt_live_xxxxxxxx
//
// Réponse JSON :
//   {
//     valid: boolean,
//     verdict: "VALID" | "FRAUD_ALERT" | "REVOKED" | "NOT_FOUND" | "EXPIRED",
//     entity: { name, type, trustScore, kycVerified },
//     certificate: { id, issuedAt, expiresAt },
//     blockchain: { network, status },
//     poweredBy: "BLOCKTRUST"
//   }
//
// Rate limit : 30 req/min par clé API (mémoire par instance).
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { hashApiKey, isValidApiKeyShape, timingSafeEqualString } from '@/lib/api-key'
import { checkRateLimitApiAsync } from '@/lib/rate-limit-api'
import { sendWebhook } from '@/lib/webhooks'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type Verdict = 'VALID' | 'FRAUD_ALERT' | 'REVOKED' | 'NOT_FOUND' | 'EXPIRED'

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Max-Age': '86400',
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() })
}

function jsonError(status: number, code: string, message: string) {
  return NextResponse.json(
    { valid: false, verdict: 'NOT_FOUND', error: code, message },
    { status, headers: corsHeaders() }
  )
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  if (!id) return jsonError(400, 'invalid_id', 'Missing certificate id')

  const apiKey = req.headers.get('x-api-key') ?? req.headers.get('X-API-Key')
  if (!isValidApiKeyShape(apiKey)) {
    return jsonError(401, 'invalid_api_key', 'Missing or malformed X-API-Key header')
  }

  const apiKeyHash = hashApiKey(apiKey)

  const config = await prisma.whiteLabelConfig.findFirst({
    where: { apiKeyHash },
  })
  if (!config || !timingSafeEqualString(config.apiKeyHash, apiKeyHash)) {
    return jsonError(401, 'unknown_api_key', 'API key not recognized')
  }
  if (!config.canVerify) {
    return jsonError(403, 'permission_denied', 'API key not authorized to verify')
  }

  const rate = await checkRateLimitApiAsync(apiKeyHash)
  const rateHeaders: Record<string, string> = {
    ...corsHeaders(),
    'X-RateLimit-Limit': String(rate.limit),
    'X-RateLimit-Remaining': String(rate.remaining),
  }
  if (!rate.ok) {
    return NextResponse.json(
      {
        valid: false,
        verdict: 'NOT_FOUND',
        error: 'rate_limited',
        message: `Rate limit exceeded. Retry after ${rate.retryAfter}s.`,
      },
      {
        status: 429,
        headers: { ...rateHeaders, 'Retry-After': String(rate.retryAfter ?? 60) },
      }
    )
  }

  if (config.apiCallsCount >= config.apiCallsLimit) {
    return NextResponse.json(
      {
        valid: false,
        verdict: 'NOT_FOUND',
        error: 'quota_exceeded',
        message: 'Monthly API call limit reached',
      },
      { status: 402, headers: rateHeaders }
    )
  }

  await prisma.whiteLabelConfig.update({
    where: { id: config.id },
    data: { apiCallsCount: { increment: 1 } },
  })

  const certificate = await prisma.certificate.findFirst({
    where: { OR: [{ publicId: id }, { id }] },
    include: {
      entity: {
        include: {
          trustScore: true,
          user: { select: { kycStatus: true } },
        },
      },
    },
  })

  if (!certificate) {
    return NextResponse.json(
      {
        valid: false,
        verdict: 'NOT_FOUND',
        poweredBy: 'BLOCKTRUST',
      },
      { status: 404, headers: rateHeaders }
    )
  }

  let verdict: Verdict = 'VALID'
  if (certificate.status === 'REVOKED') verdict = 'REVOKED'
  else if (certificate.status === 'EXPIRED') verdict = 'EXPIRED'
  else if (
    certificate.expiresAt &&
    certificate.expiresAt.getTime() < Date.now()
  )
    verdict = 'EXPIRED'

  const entity = certificate.entity
  const entityName =
    entity.entityType === 'INDIVIDUAL'
      ? `${entity.firstName ?? ''} ${entity.lastName ?? ''}`.trim() || entity.email
      : entity.legalName || entity.tradeName || entity.email

  const blockchainStatus = certificate.txHash
    ? 'anchored'
    : certificate.status === 'PENDING'
      ? 'pending'
      : 'pending'

  const responseBody = {
    valid: verdict === 'VALID',
    verdict,
    entity: {
      name: entityName,
      type: entity.entityType,
      trustScore: entity.trustScore?.score ?? null,
      kycVerified: entity.kycStatus === 'VERIFIED',
    },
    certificate: {
      id: certificate.publicId ?? certificate.id,
      issuedAt: certificate.issuedAt.toISOString(),
      expiresAt: certificate.expiresAt ? certificate.expiresAt.toISOString() : null,
    },
    blockchain: {
      network: 'Polygon',
      status: blockchainStatus,
      txHash: certificate.txHash ?? null,
    },
    poweredBy: 'BLOCKTRUST',
  }

  // Audit minimal côté Verification (sans bloquer la réponse)
  prisma.verification
    .create({
      data: {
        certificateId: certificate.id,
        userAgent: req.headers.get('user-agent') ?? 'whitelabel-api',
        result: verdict === 'VALID' ? 'VALID' : verdict === 'REVOKED' ? 'REVOKED' : 'NOT_FOUND',
        metadata: { source: 'whitelabel_api', whiteLabelConfigId: config.id },
      },
    })
    .catch(() => {})

  // Webhook sortant (best-effort)
  if (config.webhookUrl) {
    sendWebhook(config, {
      type: 'verification.completed',
      data: {
        certificateId: certificate.id,
        publicId: certificate.publicId,
        verdict,
        entityName,
      },
    }).catch(() => {})
  }

  return NextResponse.json(responseBody, { status: 200, headers: rateHeaders })
}
