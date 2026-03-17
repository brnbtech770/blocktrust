// app/api/badge/[id]/route.ts
// API route pour générer un badge SVG dynamique
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'

const badgeIdSchema = z.string()

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

    // Chercher le certificat par publicId ou id
    let certificate = await prisma.certificate.findUnique({
      where: { publicId: id },
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

    if (!certificate) {
      certificate = await prisma.certificate.findUnique({
        where: { id },
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
    }

    if (!certificate) {
      return new NextResponse('Certificat non trouvé', { status: 404 })
    }

    // Vérifier que le certificat est actif
    if (certificate.status !== 'ACTIVE' && certificate.status !== 'ANCHORED') {
      return new NextResponse('Certificat non actif', { status: 403 })
    }

    const entity = certificate.entity
    const entityName = entity.entityType === 'INDIVIDUAL'
      ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
      : entity.legalName || entity.tradeName || entity.email

    // Formater la date de vérification
    const verifiedDate = certificate.issuedAt
    const formattedDate = new Date(verifiedDate).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })

    // Couleurs selon le niveau
    const levelColors = {
      BRONZE: { bg: '#92400E', text: '#FCD34D' },
      SILVER: { bg: '#6B7280', text: '#E5E7EB' },
      GOLD: { bg: '#D97706', text: '#FDE047' },
      PLATINUM: { bg: '#7C3AED', text: '#C4B5FD' },
    }

    const colors = levelColors[certificate.level as keyof typeof levelColors] || levelColors.BRONZE

    // Générer le SVG
    const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="300" height="120" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#0F172A;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#1E293B;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Fond -->
  <rect width="300" height="120" rx="8" fill="url(#bgGradient)"/>
  <rect width="300" height="120" rx="8" fill="none" stroke="${colors.bg}" stroke-width="2"/>
  
  <!-- Logo BlockTrust -->
  <text x="20" y="30" font-family="Arial, sans-serif" font-size="18" font-weight="bold" fill="#22D3EE">
    🛡️ BlockTrust
  </text>
  
  <!-- Nom de l'entité -->
  <text x="20" y="55" font-family="Arial, sans-serif" font-size="14" font-weight="bold" fill="#FFFFFF">
    ${entityName.length > 30 ? entityName.substring(0, 30) + '...' : entityName}
  </text>
  
  <!-- Niveau -->
  <rect x="20" y="70" width="60" height="20" rx="4" fill="${colors.bg}"/>
  <text x="50" y="84" font-family="Arial, sans-serif" font-size="10" font-weight="bold" fill="${colors.text}" text-anchor="middle">
    ${certificate.level}
  </text>
  
  <!-- Date de vérification -->
  <text x="20" y="105" font-family="Arial, sans-serif" font-size="10" fill="#94A3B8">
    Vérifié le ${formattedDate}
  </text>
  
  <!-- Badge de certification -->
  <circle cx="250" cy="30" r="20" fill="${colors.bg}" stroke="${colors.text}" stroke-width="2"/>
  <text x="250" y="35" font-family="Arial, sans-serif" font-size="16" fill="${colors.text}" text-anchor="middle">✓</text>
</svg>`

    return new NextResponse(svg, {
      headers: {
        'Content-Type': 'image/svg+xml',
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (error: any) {
    console.error('❌ Badge generation error:', error)
    return new NextResponse('Erreur lors de la génération du badge', { status: 500 })
  }
}
