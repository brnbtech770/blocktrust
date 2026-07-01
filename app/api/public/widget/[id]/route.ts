// app/api/public/widget/[id]/route.ts
// Widget SVG embeddable, personnalisable aux couleurs du partenaire White Label.
//
// GET /api/public/widget/:certificateId
//   Query params :
//     ?apiKey=bt_live_xxx        (obligatoire)
//     &primaryColor=%2300d4ff    (par défaut : couleur stockée dans la config)
//     &secondaryColor=%23BDA76B
//     &size=160                  (entre 96 et 480)
//     &showLabel=true|false      (afficher le wordmark)
//     &label=Cabinet+Martin      (override du wordmark)
//
// Réponse : image/svg+xml (cacheable 60s)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { hashApiKey, isValidApiKeyShape, timingSafeEqualString } from '@/lib/api-key'
import { checkRateLimitApiAsync } from '@/lib/rate-limit-api'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function clampSize(raw: string | null): number {
  const n = Number.parseInt(raw ?? '', 10)
  if (!Number.isFinite(n)) return 160
  return Math.max(96, Math.min(480, n))
}

function safeColor(raw: string | null, fallback: string): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  return /^#[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(trimmed) ? trimmed : fallback
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function svgError(status: number, message: string) {
  const fill = status === 401 ? '#ef4444' : status === 429 ? '#f59e0b' : '#ef4444'
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">
  <rect width="200" height="80" rx="8" fill="#0a1628" stroke="${fill}" stroke-width="1.5"/>
  <text x="100" y="38" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="11" font-weight="700" fill="${fill}">BLOCKTRUST WIDGET</text>
  <text x="100" y="56" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="10" fill="rgba(255,255,255,0.7)">${escapeXml(message)}</text>
</svg>`
  return new NextResponse(svg, {
    status,
    headers: {
      'Content-Type': 'image/svg+xml; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sp = req.nextUrl.searchParams

  const apiKey =
    req.headers.get('x-api-key')?.trim() ?? req.headers.get('X-API-Key')?.trim() ?? null
  if (!isValidApiKeyShape(apiKey)) {
    return svgError(401, 'API key requise (header X-API-Key)')
  }

  const apiKeyHash = hashApiKey(apiKey)
  const config = await prisma.whiteLabelConfig.findFirst({ where: { apiKeyHash } })
  if (!config || !timingSafeEqualString(config.apiKeyHash, apiKeyHash)) {
    return svgError(401, 'API key invalide')
  }
  if (!config.canEmbed) {
    return svgError(403, 'Widget désactivé')
  }

  const rate = await checkRateLimitApiAsync(apiKeyHash)
  if (!rate.ok) {
    return svgError(429, `Rate limit atteint (${rate.retryAfter}s)`)
  }
  if (config.apiCallsCount >= config.apiCallsLimit) {
    return svgError(402, 'Quota mensuel atteint')
  }

  const certificate = await prisma.certificate.findFirst({
    where: { OR: [{ publicId: id }, { id }] },
    include: {
      entity: {
        select: {
          entityType: true,
          legalName: true,
          tradeName: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
  })
  if (!certificate) return svgError(404, 'Certificat introuvable')
  if (certificate.status === 'REVOKED' || certificate.status === 'EXPIRED') {
    return svgError(403, `Certificat ${certificate.status.toLowerCase()}`)
  }

  await prisma.whiteLabelConfig
    .update({ where: { id: config.id }, data: { apiCallsCount: { increment: 1 } } })
    .catch(() => {})

  const size = clampSize(sp.get('size'))
  const primary = safeColor(sp.get('primaryColor'), config.primaryColor || '#00d4ff')
  const secondary = safeColor(sp.get('secondaryColor'), config.secondaryColor || '#BDA76B')
  const showLabel = sp.get('showLabel') !== 'false'

  const entity = certificate.entity
  const fallbackName =
    entity.entityType === 'INDIVIDUAL'
      ? `${entity.firstName ?? ''} ${entity.lastName ?? ''}`.trim() || entity.email
      : entity.legalName || entity.tradeName || entity.email
  const rawLabel = (sp.get('label') ?? config.companyName ?? fallbackName ?? 'BLOCKTRUST').trim()
  const label = rawLabel.length > 24 ? `${rawLabel.slice(0, 22)}…` : rawLabel

  // ID unique pour les <defs> en cas de plusieurs widgets sur la même page
  const uid = `wl-${certificate.id.slice(0, 8)}`

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200" role="img" aria-label="${escapeXml(label)} — Identité vérifiée par BLOCKTRUST">
  <defs>
    <radialGradient id="${uid}-bg" cx="50%" cy="35%" r="65%">
      <stop offset="0%" stop-color="#0d2044"/>
      <stop offset="100%" stop-color="#06101f"/>
    </radialGradient>
    <radialGradient id="${uid}-glow" cx="50%" cy="50%" r="60%">
      <stop offset="0%" stop-color="${primary}" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="${primary}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="${uid}-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${primary}"/>
      <stop offset="100%" stop-color="${secondary}"/>
    </linearGradient>
  </defs>

  <polygon points="100,6 182,52 182,148 100,194 18,148 18,52" fill="url(#${uid}-bg)" stroke="url(#${uid}-stroke)" stroke-width="2"/>
  <polygon points="100,18 172,58 172,142 100,182 28,142 28,58" fill="none" stroke="${primary}" stroke-width="0.8" opacity="0.45"/>
  <circle cx="100" cy="86" r="48" fill="url(#${uid}-glow)"/>

  <g transform="translate(72, 56)">
    <path d="M28 0 L56 14 L56 38 C56 54 28 64 28 64 C28 64 0 54 0 38 L0 14 Z"
          fill="rgba(0,0,0,0.45)" stroke="${primary}" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M14 32 L24 42 L42 22"
          fill="none" stroke="${secondary}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  ${
    showLabel
      ? `<text x="100" y="146" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="13" font-weight="700" letter-spacing="2" fill="${secondary}">${escapeXml(label.toUpperCase())}</text>`
      : ''
  }
  <text x="100" y="166" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="9" letter-spacing="1.5" fill="rgba(255,255,255,0.55)">IDENTITÉ VÉRIFIÉE</text>
  <text x="100" y="183" text-anchor="middle" font-family="Arial,Helvetica,sans-serif" font-size="7.5" letter-spacing="1.5" fill="rgba(255,255,255,0.35)">POWERED BY BLOCKTRUST</text>
</svg>`

  // Endpoint authentifié par clé API : pas de wildcard CORS. Le widget est
  // généralement chargé en <img> (sans CORS) ; on n'émet l'ACAO que si une origine
  // est présente, en l'échoant (partenaire White Label), avec Vary: Origin.
  const widgetHeaders: Record<string, string> = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=60',
    'X-RateLimit-Limit': String(rate.limit),
    'X-RateLimit-Remaining': String(rate.remaining),
    Vary: 'Origin',
  }
  const widgetOrigin = req.headers.get('origin')
  if (widgetOrigin) widgetHeaders['Access-Control-Allow-Origin'] = widgetOrigin
  return new NextResponse(svg, { status: 200, headers: widgetHeaders })
}
