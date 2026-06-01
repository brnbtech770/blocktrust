// GET ?vt= — résout un token rotatif 24h → certId public (Redis)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getRedis } from '@/lib/rate-limit-redis'
import { checkResolveTokenRateLimit } from '@/lib/rate-limit-cost'

export const dynamic = 'force-dynamic'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

export async function GET(req: NextRequest) {
  const vt = req.nextUrl.searchParams.get('vt')?.trim()
  if (!vt) {
    return NextResponse.json({ error: 'expired' }, { status: 400 })
  }

  // Anti brute-force de token : 30 résolutions / min par IP.
  const rate = await checkResolveTokenRateLimit(clientIp(req))
  if (!rate.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: rate.retryAfter ? { 'Retry-After': String(rate.retryAfter) } : undefined,
      },
    )
  }

  const redis = getRedis()
  if (!redis) {
    console.warn('[resolve-token] Redis non configuré')
    return NextResponse.json({ error: 'expired' }, { status: 503 })
  }

  try {
    const certId = await redis.get(`vt:${vt}`)
    if (!certId || typeof certId !== 'string') {
      return NextResponse.json({ error: 'expired' }, { status: 404 })
    }
    return NextResponse.json({ certId })
  } catch (err) {
    console.warn('[resolve-token] Redis get KO (fail-soft)', err)
    return NextResponse.json({ error: 'expired' }, { status: 503 })
  }
}
