// app/api/badge/[id]/route.ts
// Badge SVG design Lovable — vertical, tailles sm/md/lg (public, sans auth)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import QRCode from 'qrcode'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

const DIMS = {
  sm: { w: 240, h: 280, fontSize: 14, qr: 80 },
  md: { w: 320, h: 400, fontSize: 16, qr: 110 },
  lg: { w: 400, h: 480, fontSize: 18, qr: 140 },
} as const

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
    const size = (req.nextUrl.searchParams.get('size') ?? 'md') as keyof typeof DIMS
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
    const fullName = entityName || 'Entité certifiée'
    const maxChars = size === 'sm' ? 18 : size === 'md' ? 22 : 26
    const displayName = fullName.length > maxChars ? fullName.substring(0, maxChars) + '...' : fullName

    const signature = certificate.signatures[0]
    const hasValidDynamicToken =
      signature?.dynamicToken &&
      signature?.tokenExpiry &&
      signature.tokenExpiry > new Date()
    const verifyUrl =
      hasValidDynamicToken && signature.contextHash
        ? `${baseUrl}/verify/qr/${signature.dynamicToken}?h=${signature.contextHash}`
        : signature?.jti && signature?.contextHash
          ? `${baseUrl}/verify/${signature.jti}?h=${signature.contextHash}`
          : `${baseUrl}/verify/${certificate.publicId || certificate.id}`

    const level = certificate.level ?? 'BRONZE'
    const levelColor =
      level === 'GOLD'
        ? '#BDA76B'
        : level === 'SILVER'
          ? '#aab4c2'
          : level === 'PLATINUM'
            ? '#E5E4E2'
            : '#c8895a'

    let qrBase64 = ''
    try {
      const qrDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: dims.qr,
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

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">

  <defs>
    <radialGradient id="bgGrad" cx="50%" cy="30%" r="70%">
      <stop offset="0%" stop-color="#0d2044"/>
      <stop offset="100%" stop-color="#060e1a"/>
    </radialGradient>
    <radialGradient id="glowBlue" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#00d4ff" stop-opacity="0.15"/>
      <stop offset="100%" stop-color="#00d4ff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="glowGold" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#BDA76B" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#BDA76B" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- Fond -->
  <rect width="${w}" height="${h}" rx="16" fill="url(#bgGrad)"/>

  <!-- Halo bleu centre-haut -->
  <ellipse cx="${cx}" cy="${h * 0.25}" rx="${w * 0.6}" ry="${h * 0.25}" fill="url(#glowBlue)"/>

  <!-- Halo doré centre-bas -->
  <ellipse cx="${cx}" cy="${h * 0.7}" rx="${w * 0.4}" ry="${h * 0.2}" fill="url(#glowGold)"/>

  <!-- Bordure extérieure -->
  <rect width="${w}" height="${h}" rx="16" fill="none" stroke="#00d4ff" stroke-width="1" opacity="0.3"/>

  <!-- Cercle bouclier externe -->
  <circle cx="${cx}" cy="${h * 0.22}" r="${w * 0.18}" fill="rgba(0,212,255,0.08)" stroke="#00d4ff" stroke-width="1" opacity="0.4"/>

  <!-- Cercle bouclier interne -->
  <circle cx="${cx}" cy="${h * 0.22}" r="${w * 0.13}" fill="rgba(0,212,255,0.12)" stroke="#00d4ff" stroke-width="1.5" opacity="0.6"/>

  <!-- Bouclier SVG centré -->
  <g transform="translate(${cx - w * 0.07}, ${h * 0.22 - w * 0.09})">
    <path d="M${w * 0.07} 0 L${w * 0.14} ${w * 0.03} L${w * 0.14} ${w * 0.09} C${w * 0.14} ${w * 0.13} ${w * 0.07} ${w * 0.16} ${w * 0.07} ${w * 0.16} C${w * 0.07} ${w * 0.16} 0 ${w * 0.13} 0 ${w * 0.09} L0 ${w * 0.03} Z" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M${w * 0.03} ${w * 0.08} L${w * 0.06} ${w * 0.11} L${w * 0.11} ${w * 0.05}" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- BLOCKTRUST -->
  <text x="${cx}" y="${h * 0.41}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${dims.fontSize + 4}" font-weight="700" letter-spacing="3" fill="#ffffff">BLOCKTRUST</text>

  <!-- Sous-titre -->
  <text x="${cx}" y="${h * 0.48}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${dims.fontSize - 3}" fill="rgba(232,234,240,0.5)" letter-spacing="1">Identité Vérifiée</text>

  <!-- Badge Certifié Blockchain -->
  <rect x="${cx - w * 0.22}" y="${h * 0.51}" width="${w * 0.44}" height="22" rx="11" fill="rgba(0,212,255,0.08)" stroke="#00d4ff" stroke-width="0.8"/>
  <text x="${cx}" y="${h * 0.51 + 15}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${dims.fontSize - 4}" fill="#00d4ff">✓ Certifié Blockchain</text>

  <!-- Nom de l'entité -->
  <text x="${cx}" y="${h * 0.61}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${dims.fontSize - 1}" font-weight="600" fill="#ffffff">${escapeXml(displayName)}</text>

  <!-- Niveau -->
  <rect x="${cx - 30}" y="${h * 0.63}" width="60" height="16" rx="4" fill="rgba(189,167,107,0.15)" stroke="${levelColor}" stroke-width="0.8"/>
  <text x="${cx}" y="${h * 0.63 + 11}" text-anchor="middle" font-family="monospace" font-size="${dims.fontSize - 5}" font-weight="700" fill="${levelColor}">${level}</text>

  <!-- QR Code -->
  <image x="${cx - dims.qr / 2}" y="${h * 0.7}" width="${dims.qr}" height="${dims.qr}" xlink:href="data:image/png;base64,${qrBase64}"/>

  <!-- ID certificat -->
  <text x="${cx}" y="${h * 0.7 + dims.qr + 14}" text-anchor="middle" font-family="monospace" font-size="${dims.fontSize - 6}" fill="rgba(232,234,240,0.35)">${certificate.id.substring(0, 20)}...</text>

  <!-- Powered by Polygon -->
  <text x="${cx - 18}" y="${h - 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${dims.fontSize - 6}" fill="rgba(232,234,240,0.3)">Powered by</text>
  <text x="${cx + 22}" y="${h - 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${dims.fontSize - 6}" font-weight="700" fill="#7B3FE4">Polygon</text>

</svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=300',
      },
    })
  } catch (error) {
    console.error('❌ Badge generation error:', error)
    return new NextResponse('Erreur lors de la génération du badge', { status: 500 })
  }
}
