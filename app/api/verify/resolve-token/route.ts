// GET ?vt= — résout un token rotatif 24h → certId public (Redis)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { redis } from '@/lib/rate-limit-redis'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const vt = req.nextUrl.searchParams.get('vt')?.trim()
  if (!vt) {
    return NextResponse.json({ error: 'expired' }, { status: 400 })
  }

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
