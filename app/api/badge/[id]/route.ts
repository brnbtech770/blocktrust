// app/api/badge/[id]/route.ts
// Badge SVG vertical — tailles sm / md / lg (viewBox 320×400, scaling exact des dimensions)
// Refonte visuelle : blobs gold/cyan animés, bouclier, pilule blockchain, QR, ID discret, Polygon
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { checkBadgeRateLimit } from '@/lib/rate-limit-cost'
import QRCode from 'qrcode'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

function clientIp(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
}

const DIMS = {
  sm: { w: 240, h: 280 },
  md: { w: 320, h: 400 },
  lg: { w: 400, h: 480 },
} as const

type SizeKey = keyof typeof DIMS

/** viewBox logique (réf. md). Les sorties sm/lg redimensionnent via width/height + preserveAspectRatio="none". */
const VIEW_W = 320
const VIEW_H = 400

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** Nom affiché : limite selon largeur cible (évite débordement après scale). */
function maxNameChars(w: number): number {
  const ratio = w / VIEW_W
  return Math.max(12, Math.floor(26 * ratio))
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Anti-énumération de certificats / noms d'entités : limite IP.
    if (!(await checkBadgeRateLimit(clientIp(req))).ok) {
      return new NextResponse('Too Many Requests', { status: 429 })
    }

    const { id } = await params
    const rawSize = req.nextUrl.searchParams.get('size') ?? 'md'
    const size = (rawSize in DIMS ? rawSize : 'md') as SizeKey
    const dims = DIMS[size] ?? DIMS.md

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
            kycStatus: true,
          },
        },
        signatures: {
          where: { revoked: false },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!certificate) {
      return new NextResponse('Not found', { status: 404 })
    }

    if (certificate.status === 'REVOKED' || certificate.status === 'EXPIRED') {
      return new NextResponse('Certificat non actif', { status: 403 })
    }

    const entity = certificate.entity
    const entityName =
      entity.entityType === 'INDIVIDUAL'
        ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
        : entity.legalName || entity.tradeName || entity.email
    const fullName = entityName || 'Contact certifié'
    const maxChars = maxNameChars(dims.w)
    const displayName = fullName.length > maxChars ? fullName.substring(0, maxChars) + '…' : fullName

    // Statuts RÉELS — aucun libellé « certifié » mensonger pour un badge preview Découverte.
    const isAnchored =
      certificate.blockchainStatus === 'ANCHORED' ||
      Boolean(certificate.polygonTxHash || certificate.txHash)
    const identityVerified = entity.kycStatus === 'VERIFIED'

    const ORANGE = '#f59e0b'
    const CYAN = '#00d4ff'
    const identityLabel = identityVerified ? 'Identité Vérifiée' : 'Identité déclarée · non vérifiée'
    const identityColor = identityVerified ? 'rgba(255,255,255,0.5)' : ORANGE
    const chainLabel = isAnchored ? 'Certifié Blockchain' : 'Badge preview · non ancré'
    const chainColor = isAnchored ? CYAN : ORANGE

    const signature = certificate.signatures[0]
    const hasValidDynamicToken =
      signature?.dynamicToken &&
      signature?.tokenExpiry &&
      signature.tokenExpiry > new Date()
    const publicCertVerify = `${baseUrl}/verify?certId=${encodeURIComponent(certificate.publicId || certificate.id)}`
    const verifyUrl = hasValidDynamicToken
      ? signature?.contextHash
        ? `${baseUrl}/verify/qr/${signature.dynamicToken}?h=${signature.contextHash}`
        : `${baseUrl}/verify/qr/${signature.dynamicToken}`
      : publicCertVerify

    /** QR net à l’écran : taille pixels ≈ 130×(largeur/badge) dans l’espace viewBox. */
    const qrTargetPx = Math.max(48, Math.round(130 * (dims.w / VIEW_W)))

    let qrBase64 = ''
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: qrTargetPx,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
      qrBase64 = qrDataUrl.split(',')[1] || ''
    } catch {
      // continue without QR
    }

    const publicOrId = certificate.publicId || certificate.id
    const publicIdDiscrete = `${publicOrId.slice(0, 8)}…`

    const svgStyles = `@keyframes rotateCw {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
@keyframes floatUpDown {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}
@keyframes pulseCyan {
  0%, 100% { opacity: 0.6; }
  50% { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) {
  .rotate-cw, .rotate-cw-delayed, .float-shield, .pulse-cyan {
    animation: none !important;
  }
}
.rotate-cw {
  animation: rotateCw 12s linear infinite;
  transform-origin: 200px 180px;
}
.rotate-cw-delayed {
  animation: rotateCw 16s linear infinite reverse;
  transform-origin: 120px 150px;
}
.float-shield {
  animation: floatUpDown 3s ease-in-out infinite;
  transform-origin: 160px 110px;
}
.pulse-cyan {
  animation: pulseCyan 2s ease-in-out infinite;
}`

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${dims.w}" height="${dims.h}" viewBox="0 0 ${VIEW_W} ${VIEW_H}"
  preserveAspectRatio="none"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">

  <defs>
    <style type="text/css"><![CDATA[${svgStyles}]]></style>
    <clipPath id="card-clip">
      <rect width="${VIEW_W}" height="${VIEW_H}" rx="20"/>
    </clipPath>
    <radialGradient id="gold-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#BDA76B" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#BDA76B" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="cyan-glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.25"/>
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <g clip-path="url(#card-clip)">

  <rect width="${VIEW_W}" height="${VIEW_H}" rx="20" fill="#0a1628"/>

  <g class="rotate-cw">
    <ellipse cx="200" cy="180" rx="140" ry="100" fill="url(#gold-glow)"/>
  </g>

  <g class="rotate-cw-delayed pulse-cyan">
    <ellipse cx="120" cy="150" rx="120" ry="90" fill="url(#cyan-glow)"/>
  </g>

  <g class="float-shield">
    <rect x="130" y="80" width="60" height="60" rx="14" fill="rgba(0,212,255,0.12)"
      stroke="#00d4ff" stroke-width="1.5" stroke-opacity="0.4"/>
    <path d="M160 88 L144 95 L144 108 C144 116 151 123 160 126 C169 123 176 116 176 108 L176 95 Z"
      fill="rgba(0,212,255,0.2)" stroke="#00d4ff" stroke-width="1.5"/>
    <path d="M153 108 L158 113 L168 103"
      stroke="#BDA76B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
  </g>

  <text x="160" y="168" font-family="Inter, Arial, sans-serif" font-size="18" font-weight="700"
    fill="#ffffff" text-anchor="middle" letter-spacing="2">BLOCKTRUST</text>

  <text x="160" y="186" font-family="Inter, Arial, sans-serif" font-size="9"
    fill="${identityColor}" text-anchor="middle">${escapeXml(identityLabel)}</text>

  <rect x="80" y="196" width="160" height="22" rx="11"${isAnchored ? ' class="pulse-cyan"' : ''}
    fill="${isAnchored ? 'rgba(0,212,255,0.1)' : 'rgba(245,158,11,0.12)'}"
    stroke="${isAnchored ? 'rgba(0,212,255,0.3)' : 'rgba(245,158,11,0.4)'}" stroke-width="1"/>
  <path d="M96 207 L99 210 L105 204"
    stroke="${chainColor}" stroke-width="1.5" stroke-linecap="round" fill="none"/>
  <text x="164" y="211" font-family="Inter, Arial, sans-serif" font-size="9" fill="${chainColor}"
    text-anchor="middle" font-weight="600">${escapeXml(chainLabel)}</text>

  <text x="160" y="234" font-family="Inter, Arial, sans-serif" font-size="13" font-weight="600"
    fill="rgba(255,255,255,0.9)" text-anchor="middle">${escapeXml(displayName)}</text>

  <rect x="90" y="243" width="140" height="140" rx="10" fill="#ffffff" fill-opacity="0.95"/>
  <image x="95" y="248" width="130" height="130"
    xlink:href="data:image/png;base64,${qrBase64}" href="data:image/png;base64,${qrBase64}"/>

  <text x="160" y="380" font-family="IBM Plex Mono, ui-monospace, monospace" font-size="7"
    fill="rgba(255,255,255,0.2)" text-anchor="middle">${escapeXml(publicIdDiscrete)}</text>

  <text x="160" y="394" font-family="Inter, Arial, sans-serif" font-size="8"
    fill="rgba(255,255,255,0.2)" text-anchor="middle">${isAnchored ? `<tspan>Powered by </tspan><tspan fill="#8247E5">Polygon</tspan>` : `BLOCKTRUST™`}</text>

  </g>

</svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('❌ Badge generation error:', error)
    return new NextResponse('Erreur lors de la génération du badge', { status: 500 })
  }
}
