// GET ?vt= — résout un token rotatif → certId public (Prisma + fallback Redis)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { hashIp } from '@/app/lib/auth'
import { resolveCertificateVerifyToken } from '@/lib/certificate-verify-token'
import {
  checkPublicResolveTokenRateLimit,
  PUBLIC_RATE_LIMIT_503_BODY,
} from '@/lib/rate-limit-public-failclosed'

export const dynamic = 'force-dynamic'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function GET(req: NextRequest) {
  const vt = req.nextUrl.searchParams.get('vt')?.trim()
  if (!vt) {
    return NextResponse.json({ error: 'not_found' }, { status: 400 })
  }

  const ipHash = hashIp(clientIp(req))
  const rate = await checkPublicResolveTokenRateLimit(ipHash)
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

  const result = await resolveCertificateVerifyToken(vt, clientIp(req))

  if (result.status === 'expired') {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  if (result.status === 'not_found') {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  return NextResponse.json({
    certId: result.certId,
    used: result.used,
    expiresAt: result.expiresAt || null,
  })
}
