// app/api/badge/[id]/route.ts
// Badge SVG vertical — tailles sm / md / lg (coordonnées calibrées, sans chevauchements)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import QRCode from 'qrcode'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

const DIMS = {
  sm: { w: 240, h: 280 },
  md: { w: 320, h: 400 },
  lg: { w: 400, h: 480 },
} as const

type SizeKey = keyof typeof DIMS

/** Grille typo + positions (px). Les `y` des <text> sont des baselines SVG : garder des marges réelles sous le QR et entre ID / pied. */
const BADGE_LAYOUT: Record<
  SizeKey,
  {
    qrPx: number
    shieldCy: number
    shieldRFrac: number
    blocktrustY: number
    subtitleY: number
    pillRectY: number
    pillH: number
    pillTextY: number
    nameY: number
    qrY: number
    certIdY: number
    footerY: number
    fsTrust: number
    fsSub: number
    fsPill: number
    fsName: number
    fsCertId: number
    fsFoot: number
    pillHalfWFrac: number
    letterTrust: number
    shortPillLabel: boolean
    certIdChars: number
    qrPad: number
    qrCornerRx: number
  }
> = {
  sm: {
    qrPx: 54,
    shieldCy: 32,
    shieldRFrac: 0.14,
    blocktrustY: 56,
    subtitleY: 74,
    pillRectY: 86,
    pillH: 14,
    pillTextY: 96,
    nameY: 112,
    qrY: 132,
    certIdY: 212,
    footerY: 268,
    fsTrust: 11,
    fsSub: 8,
    fsPill: 8,
    fsName: 10,
    fsCertId: 7,
    fsFoot: 7,
    pillHalfWFrac: 0.42,
    letterTrust: 1.6,
    shortPillLabel: true,
    certIdChars: 12,
    qrPad: 6,
    qrCornerRx: 8,
  },
  md: {
    qrPx: 92,
    shieldCy: 50,
    shieldRFrac: 0.165,
    blocktrustY: 90,
    subtitleY: 112,
    pillRectY: 126,
    pillH: 18,
    pillTextY: 140,
    nameY: 160,
    qrY: 188,
    certIdY: 304,
    footerY: 376,
    fsTrust: 14,
    fsSub: 10,
    fsPill: 10,
    fsName: 13,
    fsCertId: 8,
    fsFoot: 9,
    pillHalfWFrac: 0.39,
    letterTrust: 2.2,
    shortPillLabel: false,
    certIdChars: 18,
    qrPad: 7,
    qrCornerRx: 10,
  },
  lg: {
    qrPx: 112,
    shieldCy: 60,
    shieldRFrac: 0.165,
    blocktrustY: 108,
    subtitleY: 132,
    pillRectY: 150,
    pillH: 20,
    pillTextY: 166,
    nameY: 188,
    qrY: 218,
    certIdY: 368,
    footerY: 442,
    fsTrust: 17,
    fsSub: 11,
    fsPill: 11,
    fsName: 15,
    fsCertId: 9,
    fsFoot: 10,
    pillHalfWFrac: 0.37,
    letterTrust: 2.8,
    shortPillLabel: false,
    certIdChars: 22,
    qrPad: 8,
    qrCornerRx: 12,
  },
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const rawSize = req.nextUrl.searchParams.get('size') ?? 'md'
    const size = (rawSize in DIMS ? rawSize : 'md') as SizeKey
    const dims = DIMS[size] ?? DIMS.md
    const L = BADGE_LAYOUT[size] ?? BADGE_LAYOUT.md

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
    const maxChars = size === 'sm' ? 20 : size === 'md' ? 26 : 30
    const displayName = fullName.length > maxChars ? fullName.substring(0, maxChars) + '…' : fullName

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

    const qrPx = L.qrPx

    let qrBase64 = ''
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: qrPx,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
      qrBase64 = qrDataUrl.split(',')[1] || ''
    } catch {
      // continue without QR
    }

    const w = dims.w
    const h = dims.h
    const cx = w / 2
    /** Ellipse décorative centrée : rx ≤ cx pour ne pas dépasser le viewBox (évite coupure latérale). */
    const glowBlueRx = Math.min(w * 0.55, cx - 1)
    const shieldROut = w * L.shieldRFrac
    const shieldRIn = shieldROut * 0.72
    const pillHalfW = w * L.pillHalfWFrac
    const pillRx = Math.round(L.pillH / 2)

    const qrPad = L.qrPad
    const qrOuterTop = L.qrY - qrPad
    const qrOuterH = L.qrPx + 2 * qrPad
    const qrOuterBottom = qrOuterTop + qrOuterH
    const dividerY = qrOuterBottom + Math.round(Math.min(10, Math.max(5, L.fsCertId * 0.7)))

    const certIdSnippet = `${certificate.id.slice(0, L.certIdChars)}…`
    const pillLabel = L.shortPillLabel ? '✓ Blockchain' : '✓ Certifié Blockchain'

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">

  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="28%" r="72%">
      <stop offset="0%" stop-color="#0d2044"/>
      <stop offset="100%" stop-color="#060e1a"/>
    </radialGradient>
    <radialGradient id="glowBlue" cx="50%" cy="42%" r="55%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowGold" cx="50%" cy="72%" r="45%">
      <stop offset="0%" stop-color="#BDA76B" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#BDA76B" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="${w}" height="${h}" rx="16" fill="url(#bgGrad)"/>
  <ellipse cx="${cx}" cy="${h * 0.28}" rx="${glowBlueRx}" ry="${h * 0.22}" fill="url(#glowBlue)"/>
  <ellipse cx="${cx}" cy="${h * 0.72}" rx="${w * 0.38}" ry="${h * 0.18}" fill="url(#glowGold)"/>

  <rect width="${w}" height="${h}" rx="16" fill="none" stroke="#00d4ff" stroke-width="1" opacity="0.28"/>

  <circle cx="${cx}" cy="${L.shieldCy}" r="${shieldROut}" fill="rgba(0,212,255,0.07)" stroke="#00d4ff" stroke-width="1" opacity="0.45"/>
  <circle cx="${cx}" cy="${L.shieldCy}" r="${shieldRIn}" fill="rgba(0,212,255,0.1)" stroke="#00d4ff" stroke-width="1.4" opacity="0.55"/>

  <g transform="translate(${cx - w * 0.07}, ${L.shieldCy - w * 0.09})">
    <path d="M${w * 0.07} 0 L${w * 0.14} ${w * 0.03} L${w * 0.14} ${w * 0.09} C${w * 0.14} ${w * 0.13} ${w * 0.07} ${w * 0.16} ${w * 0.07} ${w * 0.16} C${w * 0.07} ${w * 0.16} 0 ${w * 0.13} 0 ${w * 0.09} L0 ${w * 0.03} Z" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M${w * 0.03} ${w * 0.08} L${w * 0.06} ${w * 0.11} L${w * 0.11} ${w * 0.05}" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <text x="${cx}" y="${L.blocktrustY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${L.fsTrust}" font-weight="700" letter-spacing="${L.letterTrust}" fill="#ffffff">BLOCKTRUST</text>

  <text x="${cx}" y="${L.subtitleY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${L.fsSub}" fill="rgba(232,234,240,0.52)" letter-spacing="0.5">Identité Vérifiée</text>

  <rect x="${cx - pillHalfW}" y="${L.pillRectY}" width="${pillHalfW * 2}" height="${L.pillH}" rx="${pillRx}" fill="rgba(0,212,255,0.08)" stroke="#00d4ff" stroke-width="0.75"/>
  <text x="${cx}" y="${L.pillTextY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${L.fsPill}" fill="#00d4ff">${pillLabel}</text>

  <text x="${cx}" y="${L.nameY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${L.fsName}" font-weight="600" fill="#ffffff">${escapeXml(displayName)}</text>

  <rect x="${cx - qrPx / 2 - qrPad}" y="${qrOuterTop}" width="${qrPx + 2 * qrPad}" height="${qrOuterH}" rx="${L.qrCornerRx}" fill="#ffffff"/>

  <image x="${cx - qrPx / 2}" y="${L.qrY}" width="${qrPx}" height="${qrPx}" xlink:href="data:image/png;base64,${qrBase64}"/>

  <line x1="${Math.round(cx - w * 0.38)}" x2="${Math.round(cx + w * 0.38)}" y1="${dividerY}" y2="${dividerY}" stroke="rgba(232,234,240,0.12)" stroke-width="1"/>

  <text x="${cx}" y="${L.certIdY}" text-anchor="middle" font-family="monospace" font-size="${L.fsCertId}" fill="rgba(232,234,240,0.42)">${escapeXml(certIdSnippet)}</text>

  <text x="${cx}" y="${L.footerY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${L.fsFoot}" fill="rgba(232,234,240,0.38)">
    <tspan>Powered by </tspan><tspan fill="#7B3FE4" font-weight="700">Polygon</tspan>
  </text>

</svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        // SVG calibré côté serveur : TTL court pour voir les retouches après déploiissement sans attendre trop longtemps
        'Cache-Control': 'public, max-age=120, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    console.error('❌ Badge generation error:', error)
    return new NextResponse('Erreur lors de la génération du badge', { status: 500 })
  }
}
