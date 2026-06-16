// GET ?url= — QR code PNG pour un lien /verify?vt=…
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import QRCode from 'qrcode'
import { getBlocktrustBaseUrl } from '@/lib/public-verify-url'
import { checkBadgeRateLimit } from '@/lib/rate-limit-cost'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

function isAllowedVerifyUrl(raw: string): boolean {
  try {
    const base = getBlocktrustBaseUrl()
    const parsed = new URL(raw)
    const baseParsed = new URL(base)
    if (parsed.origin !== baseParsed.origin) return false
    if (parsed.pathname !== '/verify') return false
    const vt = parsed.searchParams.get('vt')?.trim()
    return Boolean(vt && vt.length >= 10)
  } catch {
    return false
  }
}

export async function GET(req: NextRequest) {
  if (!(await checkBadgeRateLimit(clientIp(req))).ok) {
    return new NextResponse('Too Many Requests', { status: 429 })
  }

  const url = req.nextUrl.searchParams.get('url')?.trim()
  if (!url || !isAllowedVerifyUrl(url)) {
    return new NextResponse('URL invalide', { status: 400 })
  }

  try {
    const buffer = await QRCode.toBuffer(url, {
      width: 200,
      margin: 1,
      type: 'png',
    })

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'private, max-age=300',
      },
    })
  } catch (error: unknown) {
    console.error('[verify/link-qr] generation error', error)
    return new NextResponse('Erreur génération QR code', { status: 500 })
  }
}
