// app/verify/[id]/page.tsx
// Page publique de vérification (QR) — rate limit, anti-fraude, AdminAlert
// Params: id = Signature.jti, ?h = contextHash → VALID si égal, FRAUD_ALERT sinon
// ============================================================

import { headers } from 'next/headers'
import Link from 'next/link'
import { AlertTriangle, ShieldAlert, ShieldCheck } from 'lucide-react'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { Logo } from '@/app/components/ui/Logo'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'
import { hashIp } from '@/app/lib/auth'
import { checkRateLimitVerifyAsync } from '@/lib/rate-limit-verify'
import { checkAndIncrementVerifyQuota } from '@/lib/verify-quotas'
import {
  createAdminFraudAlert,
  evaluateVerifyAnomalies,
  logRateLimitedVerification,
  notifyCertificateOwnerFraudAlertFireAndForget,
} from '@/lib/verify-fraud'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'
import {
  getTrustScoreColor,
  getTrustScoreLabel,
  persistUserTrustScore,
} from '@/lib/trustscore'
import { timingSafeEqualUtf8 } from '@/lib/qr-dynamic-token'
import { walletNetworkLabelFr } from '@/lib/wallet-validation'
import {
  trustedCircleShouldWarnUncertifiedDomainContext,
} from '@/lib/certified-contact'
import { formatPriceFr, ESSENTIEL_MONTHLY_EUR } from '@/lib/pricing'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

type PageVerdict =
  | 'VALID'
  | 'FRAUD_ALERT'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'QR_EXPIRED'
  | 'REVOKED'
  | 'SUSPICIOUS_SCANNING'

const signatureVerifyInclude = {
  certificate: {
    include: {
      entity: { include: { user: { select: { trustScore: true } } } },
    },
  },
} as const

function tryJtiFromUnverifiedJwt(raw: string): string | null {
  const parts = raw.split('.')
  if (parts.length !== 3 || !parts[0] || !parts[1]) return null
  try {
    const json = Buffer.from(parts[1], 'base64url').toString('utf8')
    const payload = JSON.parse(json) as { jti?: unknown }
    if (typeof payload.jti === 'string' && payload.jti.length > 0) return payload.jti
  } catch {
    /* pas un JWT */
  }
  return null
}

type SignatureForVerify = Prisma.SignatureGetPayload<{ include: typeof signatureVerifyInclude }>

/**
 * Contacts Trust Circle confirmés (user-centric), des deux côtés de la relation.
 */
async function collectTrustedPeerUserIds(viewerId: string): Promise<Set<string>> {
  const [outMutual, outConfirmed, inbound] = await Promise.all([
    prisma.userTrustRelation.findMany({
      where: {
        fromUserId: viewerId,
        isMutual: true,
        toUserId: { not: null },
      },
      select: { toUserId: true },
    }),
    prisma.userTrustRelation.findMany({
      where: {
        fromUserId: viewerId,
        isMutual: false,
        status: 'CONFIRMED',
        toUserId: { not: null },
      },
      select: { toUserId: true },
    }),
    prisma.userTrustRelation.findMany({
      where: { toUserId: viewerId, status: 'CONFIRMED' },
      select: { fromUserId: true },
    }),
  ])

  const set = new Set<string>()
  for (const row of outMutual) if (row.toUserId) set.add(row.toUserId)
  for (const row of outConfirmed) if (row.toUserId) set.add(row.toUserId)
  for (const row of inbound) set.add(row.fromUserId)
  return set
}

/** Certificats « Portfolio » connus pour l’utilisateur émetteur (aligné KYC BlockTrust). */
async function issuerCertificatePortfolioIds(issuerUserId: string): Promise<Set<string>> {
  const rows = await prisma.certificate.findMany({
    where: {
      entity: { userId: issuerUserId },
      status: { in: ['ACTIVE', 'ANCHORED', 'PENDING'] },
    },
    select: { id: true },
  })
  return new Set(rows.map((r) => r.id))
}

async function resolveSignatureForPublicVerify(rawId: string): Promise<SignatureForVerify | null> {
  const lookupKey = tryJtiFromUnverifiedJwt(rawId) ?? rawId

  let signature = await prisma.signature.findUnique({
    where: { jti: lookupKey },
    include: signatureVerifyInclude,
  })

  if (!signature) {
    signature = await prisma.signature.findFirst({
      where: { certificateId: lookupKey },
      orderBy: { issuedAt: 'desc' },
      include: signatureVerifyInclude,
    })
  }

  if (!signature) {
    const cert = await prisma.certificate.findFirst({
      where: { OR: [{ id: lookupKey }, { publicId: lookupKey }] },
      select: { id: true },
    })
    if (cert) {
      signature = await prisma.signature.findFirst({
        where: { certificateId: cert.id },
        orderBy: { issuedAt: 'desc' },
        include: signatureVerifyInclude,
      })
    }
  }

  if (!signature) {
    return null
  }

  return signature
}

function entityDisplayName(entity: {
  entityType: string
  legalName: string | null
  tradeName: string | null
  firstName: string | null
  lastName: string | null
  email: string
}): string {
  if (entity.entityType === 'INDIVIDUAL') {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim()
    return name || entity.email
  }
  return entity.legalName || entity.tradeName || entity.email
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Vérification — BlockTrust',
    description: 'Vérifiez un certificat BlockTrust (réservé aux abonnés).',
  }
}

export default async function VerifyPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ h?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) {
    return <VerifySignInFallbackView />
  }

  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const id = resolvedParams.id
  const ctxHashFromQuery = resolvedSearchParams.h ?? ''

  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    headersList.get('x-real-ip') ||
    'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'
  const referer = headersList.get('referer')
  const hashedIp = hashIp(ip)

  const userIsAdmin = isAdmin(session.user.email)
  let quotaFooter: { remaining: number; limit: number } | null = null

  if (!userIsAdmin) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })
    if (!subscription || subscription.status !== 'active') {
      return <SubscriptionRequiredVerifyView />
    }
    const quota = await checkAndIncrementVerifyQuota(
      session.user.id,
      subscription.plan,
      false
    )
    if (!quota.allowed) {
      return <QuotaExceededVerifyView limit={quota.limit} />
    }
    if (quota.limit !== Number.POSITIVE_INFINITY) {
      quotaFooter = { remaining: quota.remaining, limit: quota.limit }
    }
  }

  const rate = await checkRateLimitVerifyAsync(ip)
  if (!rate.ok) {
    await logRateLimitedVerification({
      ipHash: hashedIp,
      userAgent,
      referer,
      jti: tryJtiFromUnverifiedJwt(id) ?? id,
    })
    return <RateLimitedView retryAfter={rate.retryAfter} />
  }

  const signature = await resolveSignatureForPublicVerify(id)

  if (!signature) {
    return <NotFoundView />
  }

  const cert = signature.certificate
  const entity = cert.entity

  if (String(cert.status) === 'REVOKED') {
    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 500),
        referer,
        result: 'REVOKED',
        signatureJti: signature.jti,
        metadata: {
          verdict: 'REVOKED',
          referer,
          timestamp: new Date().toISOString(),
        },
      },
    })
    return <RevokedView revokedAt={cert.revokedAt} />
  }

  if (String(cert.status) === 'EXPIRED') {
    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 500),
        referer,
        result: 'EXPIRED',
        signatureJti: signature.jti,
        metadata: { timestamp: new Date().toISOString() },
      },
    })
    return <NotFoundView />
  }

  if (signature.revoked || (signature.expiresAt && signature.expiresAt < new Date())) {
    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 500),
        referer,
        result: 'QR_EXPIRED',
        signatureJti: signature.jti,
        metadata: { verdict: 'QR_EXPIRED', timestamp: new Date().toISOString() },
      },
    })
    return <QrExpiredView />
  }

  const expectedHash = signature.contextHash ?? ''
  const verdict: PageVerdict = !ctxHashFromQuery
    ? 'VALID'
    : timingSafeEqualUtf8(expectedHash, ctxHashFromQuery)
      ? 'VALID'
      : 'FRAUD_ALERT'

  if (verdict === 'FRAUD_ALERT') {
    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 500),
        referer,
        result: 'FRAUD_ALERT',
        signatureJti: signature.jti,
        metadata: {
          jti: signature.jti,
          referer,
          verdict: 'FRAUD_ALERT',
          timestamp: new Date().toISOString(),
        },
      },
    })
    await createAdminFraudAlert({
      type: 'FRAUD_ALERT',
      entityId: entity.id,
      certificateId: cert.id,
      userId: entity.userId,
      metadata: {
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 200),
        reason: 'CONTEXT_MISMATCH_PUBLIC_VERIFY',
      },
    })
    notifyCertificateOwnerFraudAlertFireAndForget({
      certificateId: cert.id,
      alertType: 'Contexte de vérification incorrect',
      detail: 'CONTEXT_MISMATCH_PUBLIC_VERIFY',
    })
    await persistUserTrustScore(entity.userId)
    return <FraudAlertView />
  }

  const anomaly = await evaluateVerifyAnomalies(cert.id, hashedIp)
  if (anomaly.kind === 'SUSPICIOUS_SCANNING') {
    await createAdminFraudAlert({
      type: 'SUSPICIOUS_SCANNING',
      entityId: entity.id,
      certificateId: cert.id,
      metadata: {
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 200),
        count: anomaly.distinctCertCount,
      },
    })
    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 500),
        referer,
        result: 'SUSPICIOUS_SCANNING',
        signatureJti: signature.jti,
        metadata: {
          verdict: 'SUSPICIOUS_SCANNING',
          referer,
          timestamp: new Date().toISOString(),
        },
      },
    })
    return <SuspiciousScanningView />
  }

  if (anomaly.kind === 'SUSPICIOUS_VOLUME') {
    await createAdminFraudAlert({
      type: 'SUSPICIOUS_VOLUME',
      entityId: entity.id,
      certificateId: cert.id,
      metadata: {
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 200),
        count: anomaly.distinctIpCount,
      },
    })
  }

  const viewerUserId = session.user.id
  const issuerUserId = entity.userId

  type TrustUiKind = null | 'cas1' | 'cas2' | 'in_network'
  let trustUi: TrustUiKind = null

  if (viewerUserId !== issuerUserId) {
    const peers = await collectTrustedPeerUserIds(viewerUserId)
    const inCircle = peers.has(issuerUserId)
    if (!inCircle) {
      trustUi = 'cas1'
    } else {
      const portfolio = await issuerCertificatePortfolioIds(issuerUserId)
      if (portfolio.has(cert.id)) trustUi = 'in_network'
      else trustUi = 'cas2'
    }
  }

  if (trustUi === 'cas2') {
    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 500),
        referer,
        result: 'FRAUD_ALERT',
        signatureJti: signature.jti,
        metadata: {
          verdict: 'TRUST_CIRCLE_CERT_MISMATCH',
          referer,
          verifierUserId: viewerUserId,
          timestamp: new Date().toISOString(),
        },
      },
    })
    await createAdminFraudAlert({
      type: 'FRAUD_ALERT',
      entityId: entity.id,
      certificateId: cert.id,
      userId: entity.userId,
      metadata: {
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 200),
        reason: 'TRUST_CIRCLE_CERT_MISMATCH',
        verifierUserId: viewerUserId,
      },
    })
    notifyCertificateOwnerFraudAlertFireAndForget({
      certificateId: cert.id,
      alertType: 'Incohérence avec votre réseau de confiance',
      detail: 'TRUST_CIRCLE_CERT_MISMATCH',
    })
    return <TrustCircleFraudCertainView />
  }

  await prisma.verification.create({
    data: {
      certificateId: cert.id,
      ipHash: hashedIp,
      userAgent: userAgent.slice(0, 500),
      referer,
      result: anomaly.kind === 'SUSPICIOUS_VOLUME' ? 'SUSPICIOUS_VOLUME' : 'VALID',
      signatureJti: signature.jti,
      metadata: {
        jti: signature.jti,
        referer,
        verdict: anomaly.kind === 'SUSPICIOUS_VOLUME' ? 'SUSPICIOUS_VOLUME' : 'VALID',
        timestamp: new Date().toISOString(),
      },
    },
  })

  await prisma.certificate.update({
    where: { id: cert.id },
    data: {
      verificationCount: { increment: 1 },
      lastVerifiedAt: new Date(),
    },
  })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const verificationsLast30Days = await prisma.verification.count({
    where: {
      certificateId: cert.id,
      verifiedAt: { gte: thirtyDaysAgo },
      result: { in: ['VALID', 'SUSPICIOUS_VOLUME'] },
    },
  })

  const trustedCircleUncertDomainWarn =
    trustUi === 'in_network' &&
    trustedCircleShouldWarnUncertifiedDomainContext({
      certifiedDomains: entity.certifiedDomains ?? [],
      forwardedHost: headersList.get('x-forwarded-host'),
      host: headersList.get('host'),
      referer,
    })

  return (
    <ValidView
      entity={entity}
      certificate={cert}
      signature={signature}
      verificationsLast30Days={verificationsLast30Days}
      quotaFooter={quotaFooter}
      trustCircleCas1Banner={trustUi === 'cas1'}
      trustCircleInNetworkBadge={trustUi === 'in_network'}
      trustedCircleUncertDomainWarn={trustedCircleUncertDomainWarn}
    />
  )
}

function VerifySignInFallbackView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a1628] p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-lg">
        <p className="font-syne mb-4 text-lg text-white/90">Connexion requise</p>
        <Link
          href="/auth/signin"
          className="inline-block rounded-lg px-4 py-2 text-sm font-semibold text-[#0a1628]"
          style={{ background: '#00d4ff' }}
        >
          Se connecter
        </Link>
      </div>
    </div>
  )
}

function SubscriptionRequiredVerifyView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a1628] p-4 font-sans">
      <div className="w-full max-w-md rounded-xl border border-[#BDA76B]/40 bg-[#0a1628]/95 p-8 text-center backdrop-blur-md">
        <p className="mb-4 text-4xl" aria-hidden>
          🔒
        </p>
        <h1 className="font-syne mb-4 text-2xl font-bold text-white">
          Vérification réservée aux abonnés
        </h1>
        <p className="mb-8 text-sm leading-relaxed text-white/70">
          La vérification de badges BLOCKTRUST est disponible à partir de notre forfait Essentiel à{' '}
          {formatPriceFr(ESSENTIEL_MONTHLY_EUR)}€/mois.
        </p>
        <Link
          href="/pricing"
          className="inline-block rounded-lg px-6 py-3 text-sm font-bold text-[#0a1628] transition hover:brightness-110"
          style={{ background: '#00d4ff' }}
        >
          Voir les forfaits
        </Link>
        <p className="mt-6 text-xs text-white/40">
          <Link href={BASE_URL} className="text-[#BDA76B] hover:underline">
            blocktrust.tech
          </Link>
        </p>
      </div>
    </div>
  )
}

function QuotaExceededVerifyView({ limit }: { limit: number }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a1628] p-4 font-sans">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-lg">
        <p className="mb-4 text-4xl" aria-hidden>
          ⏱️
        </p>
        <h1 className="font-syne mb-4 text-2xl font-bold text-white">Limite mensuelle atteinte</h1>
        <p className="mb-8 text-sm leading-relaxed text-white/70">
          Vous avez utilisé vos {limit} vérifications ce mois-ci. Passez à un forfait supérieur pour continuer.
        </p>
        <Link
          href="/pricing"
          className="inline-block rounded-lg px-6 py-3 text-sm font-bold text-[#0a1628] transition hover:brightness-110"
          style={{ background: '#00d4ff' }}
        >
          Upgrader mon forfait
        </Link>
      </div>
    </div>
  )
}

function RateLimitedView({ retryAfter }: { retryAfter?: number }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001a33] p-4">
      <div className="w-full max-w-md rounded-2xl border border-gold/30 bg-[#001a33]/90 p-8 text-center">
        <h1 className="font-syne mb-4 text-2xl font-bold text-gold">Trop de requêtes</h1>
        <p className="mb-6 font-sans text-base text-white/80">
          Veuillez réessayer dans {retryAfter ? `${retryAfter} seconde(s)` : '1 minute'}.
        </p>
        <Link href={BASE_URL} className="text-sm text-[#BDA76B] hover:underline">
          Retour à blocktrust.tech
        </Link>
      </div>
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#001a33] p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-lg">
        <p className="font-syne mb-6 text-xl font-semibold text-white/80">Certificat introuvable</p>
        <Link
          href={BASE_URL}
          className="inline-block font-medium text-[#BDA76B] hover:underline"
          style={{ fontFamily: 'var(--font-mono-bt), monospace' }}
        >
          blocktrust.tech
        </Link>
      </div>
    </div>
  )
}

function RevokedView({ revokedAt }: { revokedAt: Date | null }) {
  const d = revokedAt
    ? new Date(revokedAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4 font-sans text-white/90">
      <div className="w-full max-w-md rounded-xl border border-orange-500/50 bg-orange-500/10 p-8 text-center backdrop-blur-lg">
        <p className="mb-2 text-4xl" aria-hidden>
          ⛔
        </p>
        <h1 className="font-syne mb-3 text-xl font-bold text-orange-200">Ce certificat a été révoqué</h1>
        {d && (
          <p className="font-mono text-sm text-white/70">
            Révocation&nbsp;: {d}
          </p>
        )}
        <Link href={BASE_URL} className="mt-6 inline-block text-sm text-gold hover:underline">
          blocktrust.tech
        </Link>
      </div>
    </div>
  )
}

function QrExpiredView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4 font-sans text-white/90">
      <div className="w-full max-w-md rounded-xl border border-white/20 bg-white/5 p-8 text-center">
        <p className="mb-2 text-3xl" aria-hidden>
          ⏱️
        </p>
        <h1 className="font-syne mb-2 text-lg font-bold text-white">Lien ou QR expiré</h1>
        <p className="text-sm text-white/60">Demandez un nouveau lien de vérification à l&apos;émetteur.</p>
        <Link href={BASE_URL} className="mt-6 inline-block text-sm text-bt-cyan hover:underline">
          blocktrust.tech
        </Link>
      </div>
    </div>
  )
}

function SuspiciousScanningView() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-navy p-4 font-sans text-white/90">
      <div className="w-full max-w-md rounded-xl border border-amber-500/40 bg-amber-500/10 p-8 text-center">
        <h1 className="font-syne mb-3 text-lg font-bold text-amber-200">Activité inhabituelle</h1>
        <p className="text-sm text-white/70">
          Trop de vérifications récentes depuis cette connexion. Réessayez plus tard.
        </p>
        <Link href={BASE_URL} className="mt-6 inline-block text-sm text-gold hover:underline">
          blocktrust.tech
        </Link>
      </div>
    </div>
  )
}

function TrustCircleFraudCertainView() {
  const actions = [
    'Ne répondez pas à ce message',
    'Contactez votre interlocuteur par un autre canal',
    'Signalez cette tentative de fraude',
    'Prévenez votre réseau de confiance',
  ]
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-[#0a1628] px-4 py-12 text-center font-sans text-white/85">
      <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-6">
        <div className="relative">
          <div
            className="absolute inset-0 animate-pulse rounded-full bg-[#E05252]/30 blur-2xl"
            aria-hidden
          />
          <div
            className="relative z-10 flex h-28 w-28 items-center justify-center rounded-full border-2 border-[#E05252]/60 bg-[#E05252]/10 animate-pulse"
          >
            <ShieldAlert className="h-12 w-12 text-[#E05252]" strokeWidth={2} aria-hidden />
          </div>
        </div>

        <div className="space-y-2">
          <span className="font-syne block text-xl font-bold uppercase tracking-widest text-[#E05252]">
            FRAUDE CERTAINE
          </span>
          <p className="text-sm text-white/70">
            Ce contact fait partie de votre réseau certifié mais ce badge{' '}
            <span className="font-semibold text-white/85">ne correspond pas</span> à son certificat
            enregistré.
          </p>
          <p className="text-xs text-white/50">
            Quelqu&apos;un se fait passer pour lui. Ne partagez aucune information.
          </p>
        </div>

        <div className="w-full rounded-xl border border-[#E05252]/25 bg-[#E05252]/10 p-4 text-left">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-[#E05252]">
            Actions immédiates
          </p>
          <ul className="space-y-2">
            {actions.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-white/60">
                <span className="text-[#E05252]" aria-hidden>
                  →
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <a
          href="mailto:security@blocktrust.tech?subject=Fraude%20d%C3%A9tect%C3%A9e%20%E2%80%94%20Trust%20Circle"
          className="w-full rounded-xl border border-[#E05252]/40 bg-[#E05252]/20 py-3 text-center text-sm font-semibold text-[#E05252] transition hover:bg-[#E05252]/30"
        >
          Signaler cette fraude →
        </a>
      </div>
      <footer className="mt-4 flex justify-center opacity-60">
        <Logo size="sm" withText={false} />
      </footer>
    </div>
  )
}

function ValidView({
  entity,
  certificate,
  signature,
  verificationsLast30Days,
  quotaFooter,
  trustCircleCas1Banner = false,
  trustCircleInNetworkBadge = false,
  trustedCircleUncertDomainWarn = false,
}: {
  entity: Prisma.EntityGetPayload<{ include: { user: { select: { trustScore: true } } } }>
  certificate: {
    id: string
    level: string
    status: string
    issuedAt: Date
    expiresAt: Date | null
    publicId: string | null
    txHash: string | null
    blockchainStatus?: string | null
    polygonTxHash?: string | null
    polygonBlock?: number | null
    polygonExplorerUrl?: string | null
  }
  signature: { contextHash: string | null; dynamicToken: string | null; maxScans: number }
  verificationsLast30Days: number
  quotaFooter?: { remaining: number; limit: number } | null
  trustCircleCas1Banner?: boolean
  trustCircleInNetworkBadge?: boolean
  trustedCircleUncertDomainWarn?: boolean
}) {
  const name = entityDisplayName(entity)
  const level = certificate.level
  const issued = new Date(certificate.issuedAt).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const expires = certificate.expiresAt
    ? new Date(certificate.expiresAt).toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  const hashDisplay = signature.contextHash ?? '—'
  const polygonAnchored = certificate.blockchainStatus === 'ANCHORED' && Boolean(certificate.polygonTxHash)
  const anchored = polygonAnchored || Boolean(certificate.txHash)
  const rotatingQr = signature.dynamicToken != null
  const holderTrustScore = entity.user?.trustScore ?? 0
  const holderLabel = getTrustScoreLabel(holderTrustScore)
  const holderColor = getTrustScoreColor(holderTrustScore)

  return (
    <div className="bt-circuit-bg min-h-screen bg-navy font-sans text-white/80">
      <div className="mx-auto max-w-xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="rounded-xl border border-bt-cyan/40 bg-bt-cyan/10 p-4 backdrop-blur-sm sm:p-6 md:p-8">
          <div className="mb-4 flex justify-center sm:mb-6">
            <BlockTrustBadge size={120} instanceId="verify-id" />
            <span className="sr-only">Certificat vérifié</span>
          </div>
          <h1 className="font-syne mb-4 text-center text-xl font-bold leading-tight text-white sm:text-2xl lg:text-3xl">
            {name}
          </h1>
          <p className="mb-2 text-center font-mono text-xs text-white/60 sm:text-sm">
            ID {certificate.publicId ?? certificate.id}
          </p>
          <p className="mb-6 text-center text-sm text-white/70">
            Vérifié par BLOCKTRUST
            {anchored ? ' — Ancré sur Polygon' : ''}
          </p>

          {trustCircleInNetworkBadge ? (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400" strokeWidth={2} aria-hidden />
              <span className="text-xs text-emerald-400">Dans votre réseau de confiance certifié</span>
            </div>
          ) : null}

          {trustedCircleUncertDomainWarn ? (
            <div
              role="alert"
              className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2.5 text-left"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" strokeWidth={2} aria-hidden />
              <p className="text-xs leading-relaxed text-amber-100/95">
                Vous consultez ce badge depuis un domaine non certifié pour ce contact.
              </p>
            </div>
          ) : null}

          <div className="mb-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center">
            <p className="text-xs uppercase tracking-wider text-white/50">TrustScore (titulaire)</p>
            <p
              className="font-mono text-xl font-semibold"
              style={{ color: holderColor }}
            >
              {holderTrustScore}/100{' '}
              <span className="text-sm text-white/70">({holderLabel})</span>
            </p>
          </div>

          <div className="space-y-6">
            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-white/50">Type</p>
              <p className="text-sm text-white/80">
                {entity.entityType === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'} · Niveau {level}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-white/50">Émis le</p>
                <p className="font-mono text-sm text-bt-cyan">{issued}</p>
              </div>
              <div>
                <p className="mb-1 text-xs uppercase tracking-wider text-white/50">Expire le</p>
                <p className="font-mono text-sm text-bt-cyan">{expires ?? '—'}</p>
              </div>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-white/50">Contact officiel</p>
              <p className="break-all font-mono text-sm text-gold">{entity.email}</p>
            </div>

            {entity.walletAddress?.trim() && entity.walletNetwork?.trim() ? (
              <div className="rounded-lg border border-white/10 bg-white/[0.03] p-3">
                <p className="mb-1 text-xs uppercase tracking-widest text-[#00d4ff]">Wallet certifié</p>
                <p className="break-all font-mono text-xs text-white/70">{entity.walletAddress.trim()}</p>
                <p className="mt-1 text-xs text-white/35">
                  Réseau : {walletNetworkLabelFr(entity.walletNetwork.trim())}
                </p>
              </div>
            ) : null}

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-white/50">Vérifications (30 derniers jours)</p>
              <p className="font-mono text-lg text-bt-cyan">{verificationsLast30Days}</p>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-bt-cyan">Hash SHA-256 (contexte)</p>
              <p className="break-all rounded bg-black/30 px-3 py-2 font-mono text-xs text-bt-cyan/80">{hashDisplay}</p>
            </div>

            {polygonAnchored && (
              <div className="rounded-lg border border-bt-cyan/30 bg-bt-cyan/5 px-4 py-3">
                <p className="mb-1 text-xs uppercase tracking-wider text-bt-cyan">
                  Ancré sur Polygon
                </p>
                <p className="font-mono text-sm text-white/85">
                  Bloc #{certificate.polygonBlock ?? '—'}
                </p>
                {certificate.polygonExplorerUrl && (
                  <a
                    href={certificate.polygonExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block break-all font-mono text-xs text-gold hover:underline"
                  >
                    Voir sur PolygonScan ↗
                  </a>
                )}
              </div>
            )}

            {rotatingQr && (
              <p className="rounded-lg border border-bt-cyan/30 bg-bt-cyan/5 px-3 py-2 text-xs text-bt-cyan/90">
                Ce QR expire après utilisation (lien rotatif).
              </p>
            )}

            <ul className="space-y-2 text-sm text-white/70">
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-bt-cyan" />
                Signature valide
              </li>
              <li className="flex items-center gap-2">
                <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-bt-cyan" />
                Certificat actif
              </li>
            </ul>
          </div>
        </div>

        {trustCircleCas1Banner ? (
          <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
            <div className="mb-2 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" strokeWidth={2} aria-hidden />
              <span className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Contact non certifié dans votre réseau
              </span>
            </div>
            <p className="text-xs leading-relaxed text-white/60">
              Ce contact n&apos;est pas dans votre réseau de confiance certifié. Le certificat est valide mais vous
              n&apos;avez pas encore établi de relation de confiance avec cette personne.
            </p>
            <Link
              href="/dashboard/trust-circle"
              className="mt-3 inline-flex items-center gap-1.5 text-xs text-amber-400/80 transition hover:text-amber-400"
            >
              Ajouter à mon réseau de confiance →
            </Link>
          </div>
        ) : null}

        {quotaFooter ? (
          <p className="mt-4 text-center font-mono text-xs text-white/40">
            {quotaFooter.remaining} vérification(s) restante(s) ce mois sur {quotaFooter.limit}
          </p>
        ) : null}

        <footer className="mt-6 flex justify-center sm:mt-8">
          <Logo size="sm" withText={true} />
        </footer>
      </div>
    </div>
  )
}

function FraudAlertView() {
  return (
    <div className="min-h-screen bg-[#0d0505] font-sans text-white/80">
      <div className="mx-auto max-w-xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="rounded-xl border border-red-500/50 bg-red-500/10 p-4 sm:p-6 md:p-8">
          <p className="mb-4 text-center text-4xl" aria-hidden>
            ⚠️
          </p>
          <h1 className="font-syne mb-4 text-center text-lg font-bold leading-snug text-red-300 sm:text-xl lg:text-2xl">
            Certificat non reconnu ou potentiellement frauduleux
          </h1>
          <p className="mb-4 text-center text-sm leading-relaxed text-white/75">
            Si vous avez reçu ce badge dans un e-mail ou sur un site, ne communiquez aucune information personnelle ni
            bancaire.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <a
              href="mailto:security@blocktrust.tech?subject=Signalement%20fraude%20BlockTrust"
              className="inline-flex justify-center rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90"
            >
              Signaler une fraude
            </a>
            <Link
              href={BASE_URL}
              className="inline-flex justify-center rounded-lg border border-white/20 px-4 py-2 text-sm font-medium text-white/90 hover:bg-white/5"
            >
              Retour au site
            </Link>
          </div>
        </div>
        <footer className="mt-6 flex justify-center opacity-60">
          <Logo size="sm" withText={false} />
        </footer>
      </div>
    </div>
  )
}
