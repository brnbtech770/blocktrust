/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// app/api/verify/[id]/route.ts
// Route publique de vérification V2 — rate limit, anti-fraude, en-têtes no-store
// ============================================================

import { after, NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { hashIp } from '@/app/lib/auth'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { timingSafeEqual } from 'crypto'
import { checkRateLimitVerifyAsync } from '@/lib/rate-limit-verify'
import { checkPlanRateLimit } from '@/lib/rate-limit-plan'
import { checkAndIncrementVerifyQuota } from '@/lib/verify-quotas'
import {
  createAdminFraudAlert,
  evaluateVerifyAnomalies,
  logRateLimitedVerification,
  notifyCertificateOwnerFraudAlertFireAndForget,
  verifyRateLimitHeaders,
} from '@/lib/verify-fraud'
import { runEventualAnomalyCheck } from '@/lib/agents/eventual-anomaly-check'
import { persistUserTrustScore } from '@/lib/trustscore'
import { isActiveBillingStatus, resolveEffectivePlan } from '@/lib/plan-features'

function quotaJson(remaining: number, limit: number) {
  const unlimited = limit === Number.POSITIVE_INFINITY
  return {
    remaining: unlimited ? null : remaining,
    limit: unlimited ? null : limit,
  }
}

interface RouteParams {
  params: Promise<{ id: string }>
}

function clientIp(req: NextRequest) {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'
  )
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { searchParams } = new URL(req.url)

  const sig = searchParams.get('sig')
  const ctx = searchParams.get('ctx')

  const ip = clientIp(req)
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const referer = req.headers.get('referer')
  const hashedIp = hashIp(ip)

  const rate = await checkRateLimitVerifyAsync(ip)
  if (!rate.ok) {
    await logRateLimitedVerification({
      ipHash: hashedIp,
      userAgent,
      referer,
      jti: sig,
    })
    return NextResponse.json(
      {
        status: 'RATE_LIMITED',
        message: 'Trop de requêtes',
        code: 'RATE_LIMITED',
      },
      {
        status: 429,
        headers: {
          ...verifyRateLimitHeaders(0),
          ...(rate.retryAfter != null ? { 'Retry-After': String(rate.retryAfter) } : {}),
        },
      }
    )
  }

  const rateHeaders = verifyRateLimitHeaders(rate.remaining)

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'AUTH_REQUIRED', redirectUrl: '/auth/signin' },
        { status: 401, headers: rateHeaders }
      )
    }

    const userIsAdmin = isAdmin(session.user.email)
    let quotaForResponse: { remaining: number | null; limit: number | null } | undefined

    if (!userIsAdmin) {
      const [subscription, userPlan] = await Promise.all([
        prisma.subscription.findUnique({
          where: { userId: session.user.id },
          select: {
            plan: true,
            status: true,
            stripeSubscriptionId: true,
            currentPeriodEnd: true,
          },
        }),
        prisma.user.findUnique({
          where: { id: session.user.id },
          select: { plan: { select: { type: true } } },
        }),
      ])

      if (!subscription || !isActiveBillingStatus(subscription.status)) {
        return NextResponse.json(
          { error: 'SUBSCRIPTION_REQUIRED', redirectUrl: '/pricing' },
          { status: 403, headers: rateHeaders }
        )
      }

      const effectivePlan = resolveEffectivePlan({
        subscription,
        email: session.user.email,
        planType: userPlan?.plan?.type,
      })

      // Rate limit par tier et par compte (anti-abus, en plus du quota mensuel).
      const planRate = await checkPlanRateLimit('verify', effectivePlan, session.user.id)
      if (!planRate.ok) {
        return NextResponse.json(
          { status: 'RATE_LIMITED', message: 'Trop de requêtes', code: 'RATE_LIMITED' },
          {
            status: 429,
            headers: {
              ...rateHeaders,
              ...(planRate.retryAfter != null
                ? { 'Retry-After': String(planRate.retryAfter) }
                : {}),
            },
          }
        )
      }
      const quota = await checkAndIncrementVerifyQuota(
        session.user.id,
        effectivePlan,
        false
      )
      if (!quota.allowed) {
        return NextResponse.json(
          {
            error: 'QUOTA_EXCEEDED',
            message: `Limite de ${quota.limit} vérifications/mois atteinte`,
            redirectUrl: '/pricing',
          },
          { status: 403, headers: rateHeaders }
        )
      }
      quotaForResponse = quotaJson(quota.remaining, quota.limit)
    } else {
      quotaForResponse = { remaining: null, limit: null }
    }

    let certificate = await prisma.certificate.findUnique({
      where: { publicId: id },
      include: {
        entity: {
          select: {
            id: true,
            userId: true,
            legalName: true,
            email: true,
            siret: true,
            website: true,
            validationLevel: true,
            kycStatus: true,
          },
        },
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          take: 1,
        },
      },
    })

    if (!certificate) {
      certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          entity: {
            select: {
              id: true,
              userId: true,
              legalName: true,
              email: true,
              siret: true,
              website: true,
              validationLevel: true,
              kycStatus: true,
            },
          },
          verifications: {
            orderBy: { verifiedAt: 'desc' },
            take: 1,
          },
        },
      })
    }

    if (!certificate) {
      return NextResponse.json(
        {
          status: 'NOT_FOUND',
          message: 'Certificat introuvable',
          code: 'CERTIFICATE_NOT_FOUND',
          quota: quotaForResponse,
        },
        { status: 404, headers: rateHeaders }
      )
    }

    if (certificate.status === 'REVOKED') {
      await prisma.verification.create({
        data: {
          certificateId: certificate.id,
          ipHash: hashedIp,
          userAgent: userAgent.slice(0, 500),
          referer,
          result: 'REVOKED',
          signatureJti: sig,
          metadata: {
            verdict: 'REVOKED',
            referer,
            timestamp: new Date().toISOString(),
          },
        },
      })
      after(() => {
        runEventualAnomalyCheck(certificate.id, session.user.id).catch((err: unknown) =>
          console.error('[anomaly]', err)
        )
      })
      return NextResponse.json(
        {
          status: 'REVOKED',
          message: 'Ce certificat a été révoqué',
          code: 'CERTIFICATE_REVOKED',
          revokedAt: certificate.revokedAt?.toISOString() ?? null,
          quota: quotaForResponse,
        },
        { status: 410, headers: rateHeaders }
      )
    }

    if (certificate.status === 'SUSPENDED') {
      return NextResponse.json(
        {
          status: 'SUSPENDED',
          message: 'Ce certificat est temporairement suspendu',
          code: 'CERTIFICATE_SUSPENDED',
          quota: quotaForResponse,
        },
        { status: 403, headers: rateHeaders }
      )
    }

    let signatureVerification: Record<string, unknown> | null = null
    let fraudAlert = false
    let qrExpired = false

    if (sig) {
      const signature = await prisma.signature.findUnique({
        where: { jti: sig },
      })

      if (!signature) {
        fraudAlert = true
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_NOT_FOUND',
          message: 'Signature inconnue - possible tentative de fraude',
        }
      } else if (signature.certificateId !== certificate.id) {
        fraudAlert = true
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_MISMATCH',
          message: 'Signature ne correspond pas au certificat',
        }
      } else if (signature.revoked) {
        qrExpired = true
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_REVOKED',
          message: 'Signature révoquée ou invalide',
        }
      } else if (signature.expiresAt && signature.expiresAt < new Date()) {
        qrExpired = true
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_EXPIRED',
          message: 'Signature ou QR expiré',
        }
      } else if (ctx && signature.contextHash) {
        const expectedCtx = signature.contextHash.slice(0, 16)
        const ctxBuffer = Buffer.from(ctx)
        const expectedBuffer = Buffer.from(expectedCtx)

        if (ctxBuffer.length !== expectedBuffer.length || !timingSafeEqual(ctxBuffer, expectedBuffer)) {
          fraudAlert = true
          signatureVerification = {
            valid: false,
            reason: 'CONTEXT_MISMATCH',
            message: 'Badge utilisé hors de son contexte original - ALERTE FRAUDE',
          }
        } else {
          signatureVerification = {
            valid: true,
            reason: 'VALID',
            message: 'Signature et contexte vérifiés',
          }
        }
      } else {
        signatureVerification = {
          valid: true,
          reason: 'VALID_NO_CONTEXT',
          message: 'Signature valide (contexte non vérifié)',
        }
      }
    }

    const verificationCount = await prisma.verification.count({
      where: { certificateId: certificate.id },
    })

    let responseStatus: 'VALID' | 'FRAUD_ALERT' | 'QR_EXPIRED' | 'SUSPICIOUS_VOLUME' | 'SUSPICIOUS_SCANNING' =
      fraudAlert ? 'FRAUD_ALERT' : qrExpired ? 'QR_EXPIRED' : 'VALID'

    let anomalyMeta: { kind: 'SUSPICIOUS_VOLUME' | 'SUSPICIOUS_SCANNING'; distinctIpCount?: number; distinctCertCount?: number } | null =
      null

    if (responseStatus === 'VALID') {
      const anomaly = await evaluateVerifyAnomalies(certificate.id, hashedIp)
      if (anomaly.kind === 'SUSPICIOUS_SCANNING') {
        responseStatus = 'SUSPICIOUS_SCANNING'
        anomalyMeta = {
          kind: 'SUSPICIOUS_SCANNING',
          distinctCertCount: anomaly.distinctCertCount,
        }
        await createAdminFraudAlert({
          type: 'SUSPICIOUS_SCANNING',
          entityId: certificate.entityId,
          certificateId: certificate.id,
          metadata: {
            ipHash: hashedIp,
            userAgent: userAgent.slice(0, 200),
            count: anomaly.distinctCertCount,
          },
        })
      } else if (anomaly.kind === 'SUSPICIOUS_VOLUME') {
        responseStatus = 'SUSPICIOUS_VOLUME'
        anomalyMeta = {
          kind: 'SUSPICIOUS_VOLUME',
          distinctIpCount: anomaly.distinctIpCount,
        }
        await createAdminFraudAlert({
          type: 'SUSPICIOUS_VOLUME',
          entityId: certificate.entityId,
          certificateId: certificate.id,
          metadata: {
            ipHash: hashedIp,
            userAgent: userAgent.slice(0, 200),
            count: anomaly.distinctIpCount,
          },
        })
      }
    }

    const dbResult =
      responseStatus === 'FRAUD_ALERT'
        ? 'FRAUD_ALERT'
        : responseStatus === 'QR_EXPIRED'
          ? 'QR_EXPIRED'
          : responseStatus === 'SUSPICIOUS_SCANNING'
            ? 'SUSPICIOUS_SCANNING'
            : responseStatus === 'SUSPICIOUS_VOLUME'
              ? 'SUSPICIOUS_VOLUME'
              : 'VALID'

    await prisma.verification.create({
      data: {
        certificateId: certificate.id,
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 500),
        referer,
        result: dbResult,
        signatureJti: sig || null,
        metadata: {
          jti: sig,
          referer,
          verdict: responseStatus,
          timestamp: new Date().toISOString(),
          userAgentShort: userAgent.slice(0, 120),
          ...(anomalyMeta ? { anomaly: anomalyMeta } : {}),
        },
      },
    })

    after(() => {
      runEventualAnomalyCheck(certificate.id, session.user.id).catch((err: unknown) =>
        console.error('[anomaly]', err)
      )
    })

    if (fraudAlert) {
      await createAdminFraudAlert({
        type: 'FRAUD_ALERT',
        entityId: certificate.entityId,
        certificateId: certificate.id,
        userId: certificate.entity.userId,
        metadata: {
          ipHash: hashedIp,
          userAgent: userAgent.slice(0, 200),
          reason: (signatureVerification?.reason as string) ?? 'FRAUD_ALERT',
        },
      })
      notifyCertificateOwnerFraudAlertFireAndForget({
        certificateId: certificate.id,
        alertType: 'Anomalie lors de la vérification (signature ou contexte)',
        detail: (signatureVerification?.reason as string) ?? 'FRAUD_ALERT',
      })
      void persistUserTrustScore(certificate.entity.userId).catch((e) =>
        console.error('TrustScore update failed:', e)
      )
    }

    const entityName = certificate.entity.legalName || certificate.entity.email
    const publicId = certificate.publicId || certificate.id

    if (responseStatus === 'SUSPICIOUS_SCANNING') {
      return NextResponse.json(
        {
          status: 'SUSPICIOUS_SCANNING',
          message: 'Activité inhabituelle détectée',
          code: 'SUSPICIOUS_SCANNING',
          verifiedAt: new Date().toISOString(),
          quota: quotaForResponse,
        },
        { status: 200, headers: rateHeaders }
      )
    }

    if (responseStatus === 'QR_EXPIRED') {
      return NextResponse.json(
        {
          status: 'QR_EXPIRED',
          message: 'Ce lien ou QR de vérification a expiré',
          code: 'QR_EXPIRED',
          verifiedAt: new Date().toISOString(),
          quota: quotaForResponse,
        },
        { status: 200, headers: rateHeaders }
      )
    }

    if (responseStatus === 'FRAUD_ALERT') {
      return NextResponse.json(
        {
          status: 'FRAUD_ALERT',
          message: 'Certificat non reconnu ou potentiellement frauduleux',
          code: 'FRAUD_ALERT',
          verifiedAt: new Date().toISOString(),
          quota: quotaForResponse,
        },
        { status: 200, headers: rateHeaders }
      )
    }

    const responseBody = {
      status: responseStatus,
      message:
        responseStatus === 'SUSPICIOUS_VOLUME'
          ? 'Certificat authentique (volume de vérifications élevé — signalé aux équipes)'
          : '✅ Certificat authentique et valide',
      certificate: {
        id: publicId,
        level: certificate.level,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        expiresAt: certificate.expiresAt,
        verificationCount: verificationCount + 1,
      },
      entity: {
        name: entityName,
        email: certificate.entity.email,
        siret: certificate.entity.siret,
        website: certificate.entity.website,
        logoUrl: null,
        type: null,
        validationLevel: certificate.entity.validationLevel,
        kycStatus: certificate.entity.kycStatus,
      },
      blockchain: certificate.txHash
        ? {
            anchored: true,
            txHash: certificate.txHash,
            blockNumber: certificate.blockNumber,
            anchoredAt: certificate.anchoredAt,
          }
        : { anchored: false },
      signature: signatureVerification,
      verifiedAt: new Date().toISOString(),
      ...(responseStatus === 'SUSPICIOUS_VOLUME' && anomalyMeta
        ? { anomaly: { distinctIpCount: anomalyMeta.distinctIpCount } }
        : {}),
      quota: quotaForResponse,
    }

    return NextResponse.json(responseBody, {
      status: 200,
      headers: rateHeaders,
    })
  } catch (error) {
    console.error('❌ Verify error:', error)
    return NextResponse.json(
      {
        status: 'ERROR',
        message: 'Erreur de vérification',
        code: 'INTERNAL_ERROR',
      },
      { status: 500, headers: verifyRateLimitHeaders(0) }
    )
  }
}
