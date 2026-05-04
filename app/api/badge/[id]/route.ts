// app/api/badge/[id]/route.ts
// Badge SVG design Lovable — vertical, tailles sm/md/lg (public, sans auth)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import QRCode from 'qrcode'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

const DIMS = {
  sm: { w: 240, h: 280, fontSize: 14, qr: 70 },
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
    const fullName = entityName || 'Contact certifié'
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

    const qrPx = size === 'sm' ? Math.min(dims.qr, 72) : dims.qr

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
    const fs = dims.fontSize

    let shieldCy: number
    let blocktrustY: number
    let subtitleY: number
    let pillRectY: number
    let pillH: number
    let pillTextY: number
    let nameY: number
    let qrY: number
    let fsTrust: number
    let fsSub: number
    let fsPill: number
    let fsName: number
    let fsCertId: number
    let fsFoot: number

    if (size === 'sm') {
      shieldCy = 50
      blocktrustY = 66
      subtitleY = 80
      pillRectY = 88
      pillH = 17
      pillTextY = 100
      nameY = 116
      qrY = 126
      fsTrust = 13
      fsSub = 9
      fsPill = 9
      fsName = 11
      fsCertId = 7
      fsFoot = 7
    } else {
      shieldCy = h * 0.22
      blocktrustY = h * 0.41
      subtitleY = h * 0.48
      pillRectY = h * 0.51
      pillH = 22
      pillTextY = h * 0.51 + 15
      nameY = h * 0.61
      qrY = h * 0.66
      fsTrust = fs + 4
      fsSub = fs - 3
      fsPill = fs - 4
      fsName = fs - 1
      fsCertId = fs - 6
      fsFoot = fs - 6
    }

    const certIdY = qrY + qrPx + (size === 'sm' ? 9 : 14)
    const pillHalfW = size === 'sm' ? w * 0.46 : w * 0.22

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
  <circle cx="${cx}" cy="${shieldCy}" r="${w * 0.18}" fill="rgba(0,212,255,0.08)" stroke="#00d4ff" stroke-width="1" opacity="0.4"/>

  <!-- Cercle bouclier interne -->
  <circle cx="${cx}" cy="${shieldCy}" r="${w * 0.13}" fill="rgba(0,212,255,0.12)" stroke="#00d4ff" stroke-width="1.5" opacity="0.6"/>

  <!-- Bouclier SVG centré -->
  <g transform="translate(${cx - w * 0.07}, ${shieldCy - w * 0.09})">
    <path d="M${w * 0.07} 0 L${w * 0.14} ${w * 0.03} L${w * 0.14} ${w * 0.09} C${w * 0.14} ${w * 0.13} ${w * 0.07} ${w * 0.16} ${w * 0.07} ${w * 0.16} C${w * 0.07} ${w * 0.16} 0 ${w * 0.13} 0 ${w * 0.09} L0 ${w * 0.03} Z" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linejoin="round"/>
    <path d="M${w * 0.03} ${w * 0.08} L${w * 0.06} ${w * 0.11} L${w * 0.11} ${w * 0.05}" fill="none" stroke="#00d4ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </g>

  <!-- BLOCKTRUST -->
  <text x="${cx}" y="${blocktrustY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fsTrust}" font-weight="700" letter-spacing="${size === 'sm' ? 2 : 3}" fill="#ffffff">BLOCKTRUST</text>

  <!-- Sous-titre -->
  <text x="${cx}" y="${subtitleY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fsSub}" fill="rgba(232,234,240,0.5)" letter-spacing="1">Identité Vérifiée</text>

  <!-- Badge Certifié Blockchain -->
  <rect x="${cx - pillHalfW}" y="${pillRectY}" width="${pillHalfW * 2}" height="${pillH}" rx="${Math.round(pillH / 2)}" fill="rgba(0,212,255,0.08)" stroke="#00d4ff" stroke-width="0.8"/>
  <text x="${cx}" y="${pillTextY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fsPill}" fill="#00d4ff">${size === 'sm' ? '✓ Blockchain' : '✓ Certifié Blockchain'}</text>

  <!-- Nom de l'entité -->
  <text x="${cx}" y="${nameY}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fsName}" font-weight="600" fill="#ffffff">${escapeXml(displayName)}</text>

  <!-- QR Code -->
  <image x="${cx - qrPx / 2}" y="${qrY}" width="${qrPx}" height="${qrPx}" xlink:href="data:image/png;base64,${qrBase64}"/>

  <!-- ID certificat -->
  <text x="${cx}" y="${certIdY}" text-anchor="middle" font-family="monospace" font-size="${fsCertId}" fill="rgba(232,234,240,0.35)">${certificate.id.substring(0, 20)}...</text>

  <!-- Powered by Polygon -->
  <text x="${cx - 18}" y="${h - 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fsFoot}" fill="rgba(232,234,240,0.3)">Powered by</text>
  <text x="${cx + 22}" y="${h - 12}" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-size="${fsFoot}" font-weight="700" fill="#7B3FE4">Polygon</text>

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
