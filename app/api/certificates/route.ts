// app/api/certificates/route.ts
// CRUD pour les certificats
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import QRCode from 'qrcode'
import { checkCertificateQuota } from '@/lib/checkQuota'
import { sendEmailFireAndForget } from '@/lib/email'
import { CertificateCreatedEmail, subject as certificateCreatedSubject } from '@/emails/CertificateCreatedEmail'

// ─────────────────────────────────────────────
// GET — Liste des certificats de l'utilisateur
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification avec NextAuth v5
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Récupérer les certificats via les entités de l'utilisateur
    const certificates = await prisma.certificate.findMany({
      where: {
        entity: { userId: user.id },
      },
      include: {
        entity: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            email: true,
            entityType: true,
          },
        },
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          take: 1,
          select: {
            verifiedAt: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    })

    // Formater les données pour correspondre à l'interface de la page
    const formatted = certificates.map((cert) => ({
      id: cert.id,
      publicId: cert.publicId,
      status: cert.status,
      level: cert.level,
      issuedAt: cert.issuedAt.toISOString(),
      expiresAt: cert.expiresAt?.toISOString() || null,
      revokedAt: cert.revokedAt?.toISOString() || null,
      revocationReason: cert.revocationReason || null,
      verificationCount: cert.verificationCount || 0,
      lastVerifiedAt: cert.verifications[0]?.verifiedAt.toISOString() || null,
      entity: {
        id: cert.entity.id,
        entityType: cert.entity.entityType,
        legalName: cert.entity.legalName,
        tradeName: cert.entity.tradeName,
        firstName: cert.entity.firstName,
        lastName: cert.entity.lastName,
        email: cert.entity.email,
      },
    }))

    return NextResponse.json(formatted)
  } catch (error) {
    console.error('❌ Certificates list error:', error)
    return NextResponse.json(
      { error: 'Erreur récupération certificats' },
      { status: 500 }
    )
  }
}

// ─────────────────────────────────────────────
// POST — Créer un certificat
// ─────────────────────────────────────────────
const createCertificateSchema = z.object({
  entityId: z.string().cuid(),
})

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification avec NextAuth v5
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'utilisateur depuis la base de données
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { plan: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    // Vérifier le quota selon le plan
    const quotaCheck = await checkCertificateQuota(user.id)
    if (!quotaCheck.allowed) {
      return NextResponse.json(
        {
          error: quotaCheck.reason || 'Quota dépassé',
          code: 'QUOTA_EXCEEDED',
          current: quotaCheck.current,
          max: quotaCheck.max,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    // Rate limiting : maximum 10 créations de certificats par heure
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000)
    const certificatesLastHour = await prisma.certificate.count({
      where: {
        entity: { userId: user.id },
        issuedAt: { gte: oneHourAgo },
      },
    })

    if (certificatesLastHour >= 10) {
      return NextResponse.json(
        {
          error: 'Limite de création atteinte (10 certificats/heure)',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: 3600, // secondes
        },
        { status: 429 }
      )
    }

    // Valider le body
    const body = await req.json()
    const parsed = createCertificateSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { entityId } = parsed.data

    // Récupérer l'utilisateur avec son plan (déjà récupéré ci-dessus)
    const userWithPlan = user

    // Déterminer les limites selon le plan (nouveau ou ancien système)
    let maxCertificates = 1
    if (userWithPlan?.plan) {
      // Nouveau système : utiliser plan.maxCertificates
      maxCertificates = userWithPlan.plan.maxCertificates
    } else {
      // Fallback: ancien système avec planLimits
      const planLimits: Record<string, number> = {
        ESSENTIEL: 1,
        PREMIUM: 5,
        FAMILLE: 10,
        'FAMILLE_PLUS': 999999,
        STARTER: 10,
        TEAM: 50,
        BUSINESS: 999999,
        ENTERPRISE: 999999,
      }
      const planName = (user as any).plan || 'ESSENTIEL'
      maxCertificates = planLimits[planName] || 1
    }

    // Vérifier que l'entité appartient à l'utilisateur
    const entity = await prisma.entity.findFirst({
      where: { id: entityId, userId: user.id },
    })

    if (!entity) {
      return NextResponse.json(
        { error: 'Entité non trouvée ou non autorisée' },
        { status: 404 }
      )
    }

    // Vérifier les limites du plan (certificats ce mois-ci)
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1)
    const certificatesThisMonth = await prisma.certificate.count({
      where: {
        entity: { userId: user.id },
        issuedAt: { gte: startOfMonth },
      },
    })

    if (certificatesThisMonth >= maxCertificates) {
      return NextResponse.json(
        {
          error: `Limite mensuelle atteinte (${maxCertificates} certificats/mois)`,
          code: 'LIMIT_REACHED',
          current: certificatesThisMonth,
          max: maxCertificates,
          upgradeUrl: '/pricing',
        },
        { status: 403 }
      )
    }

    // Vérifier si un certificat actif existe déjà pour cette entité
    const existingActive = await prisma.certificate.findFirst({
      where: {
        entityId,
        status: { in: ['ACTIVE', 'PENDING', 'ANCHORED'] },
      },
      include: {
        entity: {
          select: {
            legalName: true,
            email: true,
            firstName: true,
            lastName: true,
            entityType: true,
          },
        },
      },
    })

    let certificate
    if (existingActive) {
      // Utiliser le certificat existant
      certificate = existingActive
    } else {
      // Créer le certificat avec status PENDING (seul l'admin peut l'activer)
      certificate = await prisma.certificate.create({
        data: {
          entityId,
          level: entity.validationLevel,
          status: 'PENDING', // PAS 'ACTIVE' - seul l'admin peut activer
        },
        include: {
          entity: {
            select: {
              legalName: true,
              email: true,
              firstName: true,
              lastName: true,
              entityType: true,
            },
          },
        },
      })

      // Signature pour le badge et la vérification publique (/verify/[jti]?h=)
      const jti = certificate.publicId ?? certificate.id
      const contextHash = crypto.createHash('sha256').update(`badge:${certificate.id}`).digest('hex')
      await prisma.signature.create({
        data: {
          jti,
          certificateId: certificate.id,
          entityId: certificate.entityId,
          contextHash,
          purpose: 'badge',
          expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000), // 10 ans
        },
      })
    }

    // Générer l'URL de vérification (jti + contextHash si Signature existe)
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'
    const latestSignature = await prisma.signature.findFirst({
      where: { certificateId: certificate.id, revoked: false },
      orderBy: { issuedAt: 'desc' },
    })
    const verifyUrl =
      latestSignature?.jti && latestSignature?.contextHash
        ? `${baseUrl}/verify/${latestSignature.jti}?h=${latestSignature.contextHash}`
        : `${baseUrl}/verify/${certificate.publicId || certificate.id}`

    // Générer le QR code
    let qrCodeDataUrl: string
    try {
      qrCodeDataUrl = await QRCode.toDataURL(verifyUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    } catch (qrError) {
      console.error('❌ QR code generation error:', qrError)
      // Continuer même si le QR code échoue
      qrCodeDataUrl = ''
    }

    const entityName = certificate.entity.entityType === 'INDIVIDUAL'
      ? `${certificate.entity.firstName || ''} ${certificate.entity.lastName || ''}`.trim() || certificate.entity.email
      : certificate.entity.legalName || certificate.entity.email

    // Email transactionnel : certificat créé (fire-and-forget)
    const recipientEmail = session.user.email
    if (recipientEmail) {
      sendEmailFireAndForget({
        to: recipientEmail,
        subject: certificateCreatedSubject,
        react: CertificateCreatedEmail({
          entityName,
          verifyUrl,
          qrCodeDataUrl: qrCodeDataUrl || undefined,
          embedSnippet: `<a href="${verifyUrl}" target="_blank" rel="noopener">Vérifier ce certificat BlockTrust</a>`,
        }),
      })
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: certificate.id,
        publicId: certificate.publicId,
        entityName,
        level: certificate.level,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        verifyUrl,
      },
      qrCodeDataUrl,
    })
  } catch (error) {
    console.error('❌ Certificate create error:', error)
    return NextResponse.json(
      { error: 'Erreur création certificat' },
      { status: 500 }
    )
  }
}
