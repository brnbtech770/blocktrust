// app/api/badge/[id]/route.ts
// API route pour générer un badge SVG dynamique (public, sans auth)
// QR pointe vers /verify/[jti]?h=[contextHash]
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import QRCode from 'qrcode'

const badgeIdSchema = z.string()
const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const parsed = badgeIdSchema.safeParse(resolvedParams.id)
    if (!parsed.success) {
      return new NextResponse('ID invalide', { status: 400 })
    }
    const id = parsed.data

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
      return new NextResponse('Certificat non trouvé', { status: 404 })
    }

    if (certificate.status === 'REVOKED' || certificate.status === 'EXPIRED') {
      return new NextResponse('Certificat non actif', { status: 403 })
    }

    const entity = certificate.entity
    const entityName =
      entity.entityType === 'INDIVIDUAL'
        ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
        : entity.legalName || entity.tradeName || entity.email
    const displayName = (entityName || 'Entité certifiée').length > 28
      ? (entityName || 'Entité certifiée').substring(0, 28) + '...'
      : (entityName || 'Entité certifiée')

    const signature = certificate.signatures[0]
    const verifyUrl = signature?.jti && signature?.contextHash
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
        width: 80,
        margin: 1,
        color: { dark: '#000000', light: '#ffffff' },
      })
      qrBase64 = qrDataUrl.split(',')[1] || ''
    } catch {
      // continue without QR
    }

    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="320" height="100" viewBox="0 0 320 100"
  xmlns="http://www.w3.org/2000/svg"
  xmlns:xlink="http://www.w3.org/1999/xlink">

  <!-- Fond -->
  <rect width="320" height="100" rx="10" fill="#0a1628"/>
  <rect width="320" height="100" rx="10" fill="none" stroke="#00d4ff" stroke-width="1" opacity="0.4"/>

  <!-- Hexagone logo -->
  <polygon points="22,10 36,18 36,34 22,42 8,34 8,18" fill="none" stroke="#BDA76B" stroke-width="1.2"/>
  <text x="22" y="30" text-anchor="middle" font-family="monospace" font-size="9" font-weight="700" fill="#BDA76B">BT</text>

  <!-- Nom entité -->
  <text x="50" y="28" font-family="Arial, sans-serif" font-size="13" font-weight="700" fill="#ffffff">${escapeXml(displayName)}</text>

  <!-- Sous-titre -->
  <text x="50" y="44" font-family="Arial, sans-serif" font-size="10" fill="rgba(232,234,240,0.6)">Certifié BlockTrust</text>

  <!-- Badge niveau -->
  <rect x="50" y="52" width="58" height="16" rx="4" fill="rgba(189,167,107,0.15)" stroke="${levelColor}" stroke-width="0.8"/>
  <text x="79" y="63" text-anchor="middle" font-family="monospace" font-size="9" font-weight="700" fill="${levelColor}">${level}</text>

  <!-- Statut actif -->
  <circle cx="122" cy="60" r="3" fill="#1DB87E"/>
  <text x="129" y="64" font-family="monospace" font-size="9" fill="#1DB87E">ACTIF</text>

  <!-- Ligne séparatrice -->
  <line x1="50" y1="78" x2="220" y2="78" stroke="rgba(0,212,255,0.15)" stroke-width="0.5"/>

  <!-- URL vérification -->
  <text x="50" y="90" font-family="monospace" font-size="8" fill="rgba(232,234,240,0.35)">blocktrust.tech/verify</text>

  <!-- QR Code -->
  ${qrBase64 ? `<image x="230" y="10" width="80" height="80" xlink:href="data:image/png;base64,${qrBase64}"/>` : ''}
</svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error) {
    console.error('❌ Badge generation error:', error)
    return new NextResponse('Erreur lors de la génération du badge', { status: 500 })
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
