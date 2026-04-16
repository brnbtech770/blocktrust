// app/verify/[id]/page.tsx
// Page publique de vérification (QR) — rate limit, anti-fraude, AdminAlert
// Params: id = Signature.jti, ?h = contextHash → VALID si égal, FRAUD_ALERT sinon
// ============================================================

import { headers } from 'next/headers'
import Link from 'next/link'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { Logo } from '@/app/components/ui/Logo'
import { hashIp } from '@/app/lib/auth'
import { checkRateLimitVerify } from '@/lib/rate-limit-verify'
import { checkAndIncrementVerifyQuota } from '@/lib/verify-quotas'
import {
  createAdminFraudAlert,
  evaluateVerifyAnomalies,
  logRateLimitedVerification,
} from '@/lib/verify-fraud'
import { sendEmail } from '@/lib/email'
import { FraudAlertEmail, subject as fraudAlertSubject } from '@/emails/FraudAlertEmail'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'

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
      entity: { include: { trustScore: true } },
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

  const rate = checkRateLimitVerify(ip)
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
    : expectedHash === ctxHashFromQuery
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
      metadata: {
        ipHash: hashedIp,
        userAgent: userAgent.slice(0, 200),
        reason: 'CONTEXT_MISMATCH_PUBLIC_VERIFY',
      },
    })
    const owner = await prisma.user.findUnique({
      where: { id: entity.userId },
      select: { email: true },
    })
    const entityName = entityDisplayName(entity)
    const revokeUrl = `${BASE_URL}/dashboard/certificate/${cert.id}`
    if (owner?.email) {
      await sendEmail({
        to: owner.email,
        subject: fraudAlertSubject,
        react: FraudAlertEmail({
          entityName,
          tokenId: signature.jti,
          timestamp: new Date().toLocaleString('fr-FR'),
          ip,
          revokeUrl,
        }),
      }).then(({ error }) => {
        if (error) console.error('[Verify] Fraud alert email échoué:', { to: owner.email, error })
      })
    }
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

  return (
    <ValidView
      entity={entity}
      certificate={cert}
      signature={signature}
      verificationsLast30Days={verificationsLast30Days}
      quotaFooter={quotaFooter}
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
          La vérification de badges BlockTrust est disponible à partir de notre forfait Essentiel à 4,99€/mois.
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

function ValidView({
  entity,
  certificate,
  signature,
  verificationsLast30Days,
  quotaFooter,
}: {
  entity: Prisma.EntityGetPayload<{ include: { trustScore: true } }>
  certificate: {
    id: string
    level: string
    status: string
    issuedAt: Date
    expiresAt: Date | null
    publicId: string | null
    txHash: string | null
  }
  signature: { contextHash: string | null; dynamicToken: string | null; maxScans: number }
  verificationsLast30Days: number
  quotaFooter?: { remaining: number; limit: number } | null
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
  const anchored = Boolean(certificate.txHash)
  const rotatingQr = signature.dynamicToken != null

  return (
    <div className="bt-circuit-bg min-h-screen bg-navy font-sans text-white/80">
      <div className="mx-auto max-w-xl px-3 py-6 sm:px-4 sm:py-10">
        <div className="rounded-xl border border-bt-cyan/40 bg-bt-cyan/10 p-4 backdrop-blur-sm sm:p-6 md:p-8">
          <div className="mb-4 flex justify-center sm:mb-6">
            <span
              className="text-5xl sm:text-6xl"
              style={{ filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.6))' }}
              aria-hidden
            >
              🛡️
            </span>
            <span className="sr-only">Certificat vérifié</span>
          </div>
          <p className="mb-1 text-center text-3xl text-bt-cyan" aria-hidden>
            ✓
          </p>
          <h1 className="font-syne mb-4 text-center text-xl font-bold leading-tight text-white sm:text-2xl lg:text-3xl">
            {name}
          </h1>
          <p className="mb-2 text-center font-mono text-xs text-white/60 sm:text-sm">
            ID {certificate.publicId ?? certificate.id}
          </p>
          <p className="mb-6 text-center text-sm text-white/70">
            Vérifié par BlockTrust
            {anchored ? ' — Ancré sur Polygon' : ''}
          </p>

          {entity.trustScore && (
            <div className="mb-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center">
              <p className="text-xs uppercase tracking-wider text-white/50">TrustScore</p>
              <p className="font-mono text-xl font-semibold text-bt-cyan">
                {entity.trustScore.score}/100 <span className="text-sm text-white/70">({entity.trustScore.level})</span>
              </p>
            </div>
          )}

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

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-white/50">Vérifications (30 derniers jours)</p>
              <p className="font-mono text-lg text-bt-cyan">{verificationsLast30Days}</p>
            </div>

            <div>
              <p className="mb-1 text-xs uppercase tracking-wider text-bt-cyan">Hash SHA-256 (contexte)</p>
              <p className="break-all rounded bg-black/30 px-3 py-2 font-mono text-xs text-bt-cyan/80">{hashDisplay}</p>
            </div>

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
