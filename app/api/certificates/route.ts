/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
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
import { createAdminAlert } from '@/lib/admin-alerts'
import { getRedis } from '@/lib/rate-limit-redis'
import { buildPublicVerifyUrl } from '@/lib/public-verify-url'
import { getUserEmailSignature } from '@/lib/email-signature'
import { isAdmin } from '@/app/lib/admin'
import { isDiscoveryPlan, resolveEffectivePlan, BLOCKCHAIN_STATUS_NOT_ANCHORED } from '@/lib/plan-features'
import {
  checkIsOrgAdmin,
  countActiveCertificatesForSubject,
  getUserRole,
  canUserCertify,
  inferCertificationSubject,
  DELEGATION_MATRIX,
} from '@/lib/trust-delegation'

// ─────────────────────────────────────────────
// GET — Liste des certificats de l'utilisateur
// ─────────────────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    // Vérifier l'authentification avec NextAuth v5
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = session.user.id

    // Récupérer les certificats via les entités de l'utilisateur
    const certificates = await prisma.certificate.findMany({
      where: {
        entity: { userId },
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
      blockchainStatus: cert.blockchainStatus,
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
const createCertificateSchema = z
  .object({
    entityId: z.string().cuid(),
  })
  .strict()

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification avec NextAuth v5
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'utilisateur depuis la base de données (id session = source de vérité)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { plan: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const lockKey = `lock:quota:cert:${session.user.id}`
    let lockHeld = false
    const redis = getRedis()
    if (redis) {
      try {
        const acquired = await redis.set(lockKey, '1', { nx: true, ex: 10 })
        if (acquired !== 'OK') {
          return NextResponse.json(
            {
              error: 'Requête en cours, réessayez dans quelques secondes',
              code: 'CONCURRENT_REQUEST',
            },
            { status: 429 }
          )
        }
        lockHeld = true
      } catch (lockErr) {
        console.warn('[certificates] Redis lock KO, continue sans lock', lockErr)
      }
    }

    try {
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
    const subscriptionRow = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: {
        plan: true,
        status: true,
        stripeSubscriptionId: true,
        currentPeriodEnd: true,
      },
    })
    const effectivePlan = resolveEffectivePlan({
      subscription: subscriptionRow,
      email: session.user.email,
      planType: userWithPlan?.plan?.type ?? null,
    })

    let maxCertificates = 1
    if (userWithPlan?.plan) {
      maxCertificates = userWithPlan.plan.maxCertificates
    } else {
      const planLimits: Record<string, number> = {
        ESSENTIEL: 1,
        PREMIUM: 5,
        FAMILLE: 10,
        FAMILLE_PLUS: 999999,
        SOLO_PRO: 100,
        STARTER: 10,
        TEAM: 50,
        BUSINESS: 999999,
        ENTERPRISE: 999999,
        B2B_ENTERPRISE: 999999,
      }
      const limitsKey = effectivePlan.replace(/^B2[BC]_/, '')
      maxCertificates = planLimits[effectivePlan] ?? planLimits[limitsKey] ?? 1
    }

    // Plan effectif (statut Stripe inclus) — décide l'ancrage Polygon (jamais pour DISCOVERY).
    const isDiscovery = isDiscoveryPlan(effectivePlan)

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

    const isOrgAdmin = await checkIsOrgAdmin(user.id)
    const role = getUserRole({
      kycStatus: user.kycStatus,
      isAdmin: isAdmin(session.user.email),
      isOrgAdmin,
    })
    const certSubject = inferCertificationSubject(entity)
    const currentCertCount = await countActiveCertificatesForSubject(user.id, certSubject)
    const { allowed, reason } = canUserCertify(role, certSubject, currentCertCount)

    if (!allowed) {
      return NextResponse.json({ error: reason, code: 'DELEGATION_DENIED' }, { status: 403 })
    }

    const subjectRight = DELEGATION_MATRIX[role]?.find((r) => r.subject === certSubject)
    if (subjectRight?.requiresKYC && user.kycStatus !== 'VERIFIED' && role !== 'ORG_ADMIN' && role !== 'BLOCKTRUST_ADMIN') {
      return NextResponse.json(
        { error: "Vérification d'identité requise", code: 'KYC_REQUIRED' },
        { status: 403 },
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
        entity: { userId: user.id },
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
          // Plan gratuit Découverte : badge signé ES256 mais JAMAIS ancré sur Polygon.
          // Les agents d'ancrage (retry stale/failed) filtrent sur PENDING/FAILED → ignorent NOT_ANCHORED.
          ...(isDiscovery ? { blockchainStatus: BLOCKCHAIN_STATUS_NOT_ANCHORED } : {}),
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

      // Signature pour le badge et liens dynamiques (QR) — vérification publique liste : /verify?certId=
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

      // FIX E2E : alerter l'admin qu'un certificat est en attente d'activation
      const certEntityName =
        certificate.entity.entityType === 'INDIVIDUAL'
          ? `${certificate.entity.firstName ?? ''} ${certificate.entity.lastName ?? ''}`.trim() ||
            certificate.entity.email
          : certificate.entity.legalName || certificate.entity.email
      await createAdminAlert({
        type: 'CERT_PENDING',
        title: 'Certificat en attente d\u2019activation',
        description: `Nouveau certificat ${certificate.publicId ?? certificate.id} pour ${certEntityName}`,
        entityId: certificate.entityId,
        userId: user.id,
        metadata: {
          certificateId: certificate.id,
          publicId: certificate.publicId,
          entityType: certificate.entity.entityType,
          level: certificate.level,
        },
      }).catch((e) =>
        console.error('[Certificate] AdminAlert CERT_PENDING failed:', e)
      )
    }

    const verifyUrl = buildPublicVerifyUrl(certificate.publicId || certificate.id)

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

    const sig = await getUserEmailSignature(user.id).catch(() => ({
      senderName: user.name?.trim() || 'Utilisateur BLOCKTRUST',
      certId: null as string | null,
      verifyUrl: null as string | null,
    }))
    const ownerCertId = certificate.publicId ?? certificate.id
    const ownerDisplayName = user.name?.trim() || sig.senderName

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
          embedSnippet: `<a href="${verifyUrl}" target="_blank" rel="noopener">Vérifier ce certificat BLOCKTRUST™</a>`,
          ownerCertId,
          ownerVerifyUrl: verifyUrl,
          ownerDisplayName,
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
    } finally {
      if (redis && lockHeld) {
        try {
          await redis.del(lockKey)
        } catch (unlockErr) {
          console.warn('[certificates] Redis unlock KO', unlockErr)
        }
      }
    }
  } catch (error) {
    console.error('❌ Certificate create error:', error)
    return NextResponse.json(
      { error: 'Erreur création certificat' },
      { status: 500 }
    )
  }
}
