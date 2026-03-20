// app/verify/[id]/page.tsx
// Page publique de vérification (QR) — sans auth, rate limit 20/min/IP
// Params: id = Signature.jti, ?h = contextHash → VALID si égal, FRAUD_ALERT sinon
// ============================================================

import { headers } from 'next/headers'
import Link from 'next/link'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'
import { hashIp } from '@/app/lib/auth'
import { checkRateLimitVerify } from '@/lib/rate-limit-verify'
import { sendEmailFireAndForget } from '@/lib/email'
import { FraudAlertEmail, subject as fraudAlertSubject } from '@/emails/FraudAlertEmail'
import type { Metadata } from 'next'
import type { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

type Verdict = 'VALID' | 'FRAUD_ALERT' | 'NOT_FOUND' | 'RATE_LIMITED'

const signatureVerifyInclude = {
  certificate: {
    include: {
      entity: true,
    },
  },
} as const

/** Payload JWT uniquement (sans vérification de signature) pour récupérer jti si l’URL contient un token. */
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
 * Verdict basé sur la DB + ctxHash uniquement (aucune vérification cryptographique du JWT).
 * Ordre : jti (évent. extrait du JWT) → certificateId interne → certificat par id / publicId.
 */
async function resolveSignatureForPublicVerify(rawId: string): Promise<SignatureForVerify | null> {
  const lookupKey = tryJtiFromUnverifiedJwt(rawId) ?? rawId

  let signature = await prisma.signature.findUnique({
    where: { jti: lookupKey },
    include: signatureVerifyInclude,
  })

  if (signature?.revoked) {
    return null
  }

  if (!signature) {
    signature = await prisma.signature.findFirst({
      where: { certificateId: lookupKey, revoked: false },
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
        where: { certificateId: cert.id, revoked: false },
        orderBy: { issuedAt: 'desc' },
        include: signatureVerifyInclude,
      })
    }
  }

  if (!signature || signature.revoked) {
    return null
  }

  return signature
}

function entityDisplayName(entity: { entityType: string; legalName: string | null; tradeName: string | null; firstName: string | null; lastName: string | null; email: string }): string {
  if (entity.entityType === 'INDIVIDUAL') {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(' ').trim()
    return name || entity.email
  }
  return entity.legalName || entity.tradeName || entity.email
}

export async function generateMetadata({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ h?: string }>
}): Promise<Metadata> {
  const { id } = await params
  const { h = '' } = await searchParams

  const signature = await resolveSignatureForPublicVerify(id)

  if (!signature) {
    return { title: 'Certificat introuvable — BlockTrust' }
  }

  const expectedHash = signature.contextHash ?? ''
  const verdict: Verdict = !h
    ? 'VALID'
    : expectedHash === h
      ? 'VALID'
      : 'FRAUD_ALERT'
  const entityName = entityDisplayName(signature.certificate.entity)

  if (verdict === 'VALID') {
    return { title: `${entityName} — Certifié BlockTrust ✓` }
  }
  if (verdict === 'FRAUD_ALERT') {
    return { title: '⚠ Alerte fraude — BlockTrust' }
  }
  return { title: 'Certificat introuvable — BlockTrust' }
}

export default async function VerifyPublicPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ h?: string }>
}) {
  const resolvedParams = await params
  const resolvedSearchParams = await searchParams
  const id = resolvedParams.id
  const ctxHashFromQuery = resolvedSearchParams.h ?? ''

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  const rate = checkRateLimitVerify(ip)
  if (!rate.ok) {
    return <RateLimitedView retryAfter={rate.retryAfter} />
  }

  const signature = await resolveSignatureForPublicVerify(id)

  if (!signature) {
    return <NotFoundView />
  }

  const cert = signature.certificate
  const entity = cert.entity

  if (String(cert.status) === 'REVOKED' || String(cert.status) === 'EXPIRED') {
    return <NotFoundView />
  }

  const expectedHash = signature.contextHash ?? ''
  // Pas de ?h= = accès direct (dashboard / ancien QR) → VALID ; avec ?h= = vérification anti-fraude
  let verdict: Verdict = !ctxHashFromQuery
    ? 'VALID'
    : expectedHash === ctxHashFromQuery
      ? 'VALID'
      : 'FRAUD_ALERT'

  const hashedIp = hashIp(ip)

  await prisma.verification.create({
    data: {
      certificateId: cert.id,
      ipHash: hashedIp,
      userAgent,
      result: verdict === 'VALID' ? 'VALID' : verdict === 'FRAUD_ALERT' ? 'FRAUD_ALERT' : 'NOT_FOUND',
      signatureJti: signature.jti,
    },
  })

  if (verdict === 'VALID') {
    await prisma.certificate.update({
      where: { id: cert.id },
      data: {
        verificationCount: { increment: 1 },
        lastVerifiedAt: new Date(),
      },
    })
  }

  if (verdict === 'FRAUD_ALERT') {
    const owner = await prisma.user.findUnique({
      where: { id: entity.userId },
      select: { email: true },
    })
    const entityName = entityDisplayName(entity)
    const revokeUrl = `${BASE_URL}/dashboard/certificate/${cert.id}`
    if (owner?.email) {
      sendEmailFireAndForget({
        to: owner.email,
        subject: fraudAlertSubject,
        react: FraudAlertEmail({
          entityName,
          tokenId: signature.jti,
          timestamp: new Date().toLocaleString('fr-FR'),
          ip,
          revokeUrl,
        }),
      })
    }
  }

  if (verdict === 'VALID') {
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const verificationsLast30Days = await prisma.verification.count({
      where: {
        certificateId: cert.id,
        verifiedAt: { gte: thirtyDaysAgo },
        result: 'VALID',
      },
    })

    return (
      <ValidView
        entity={entity}
        certificate={cert}
        signature={signature}
        verificationsLast30Days={verificationsLast30Days}
      />
    )
  }

  return (
    <FraudAlertView
      jti={signature.jti}
      expectedHash={expectedHash}
      receivedHash={ctxHashFromQuery}
      ip={ip}
    />
  )
}

function RateLimitedView({ retryAfter }: { retryAfter?: number }) {
  return (
    <div className="min-h-screen bg-[#001a33] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center rounded-2xl border border-[#BDA76B]/30 bg-[#001a33]/90 p-8">
        <h1 className="text-2xl font-bold text-[#BDA76B] mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          Trop de requêtes
        </h1>
        <p className="text-gray-400 mb-6">
          Veuillez réessayer dans {retryAfter ? `${retryAfter} seconde(s)` : '1 minute'}.
        </p>
        <Link href={BASE_URL} className="text-[#BDA76B] hover:underline text-sm">
          Retour à blocktrust.tech
        </Link>
      </div>
    </div>
  )
}

function NotFoundView() {
  return (
    <div className="min-h-screen bg-[#001a33] flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center rounded-2xl border border-gray-700 bg-[#001a33]/90 p-8">
        <p className="text-xl text-gray-300 mb-6" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          Certificat introuvable ou révoqué
        </p>
        <Link
          href={BASE_URL}
          className="inline-block text-[#BDA76B] hover:underline font-medium"
          style={{ fontFamily: 'var(--font-mono-bt), monospace' }}
        >
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
}: {
  entity: { entityType: string; legalName: string | null; tradeName: string | null; firstName: string | null; lastName: string | null; email: string }
  certificate: { level: string; status: string; issuedAt: Date; expiresAt: Date | null; publicId: string | null }
  signature: { contextHash: string | null }
  verificationsLast30Days: number
}) {
  const name = entityDisplayName(entity)
  const level = certificate.level
  const issued = new Date(certificate.issuedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
  const expires = certificate.expiresAt
    ? new Date(certificate.expiresAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    : null
  const hashDisplay = signature.contextHash ?? '—'

  return (
    <div className="min-h-screen bt-circuit-bg text-gray-100" style={{ fontFamily: 'var(--font-syne), sans-serif', background: 'var(--bt-navy)' }}>
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-2xl border p-6 md:p-8" style={{ borderColor: 'rgba(0,212,255,0.3)', background: 'rgba(13,31,60,0.8)' }}>
          <div className="flex justify-center mb-6">
            <div className="relative">
              <span className="text-6xl block animate-pulse" style={{ filter: 'drop-shadow(0 0 12px rgba(0,212,255,0.6))' }}>🛡️</span>
            </div>
          </div>
          <h1 className="text-2xl font-bold text-center mb-2" style={{ color: '#00d4ff' }}>Certificat valide</h1>
          <p className="text-center text-sm mb-8" style={{ color: 'var(--bt-muted)' }}>Vérifié par BlockTrust</p>

          <div className="space-y-6">
            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--bt-muted)' }}>Entité</p>
              <p className="text-white text-xl font-semibold">{name}</p>
              <p className="text-sm mt-1" style={{ color: 'var(--bt-muted)' }}>
                {entity.entityType === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'} · Niveau {level}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--bt-muted)' }}>Émis le</p>
                <p className="text-white font-mono text-sm">{issued}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--bt-muted)' }}>Expire le</p>
                <p className="text-white font-mono text-sm">{expires ?? '—'}</p>
              </div>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--bt-muted)' }}>Contact officiel</p>
              <p className="font-mono text-sm break-all" style={{ color: 'var(--bt-gold)' }}>{entity.email}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: 'var(--bt-muted)' }}>Vérifications (30 derniers jours)</p>
              <p className="text-white font-mono text-lg">{verificationsLast30Days}</p>
            </div>

            <div>
              <p className="text-xs uppercase tracking-wider mb-1" style={{ color: '#00d4ff' }}>Hash SHA-256 (contexte)</p>
              <p className="font-mono text-xs break-all px-3 py-2 rounded" style={{ color: 'rgba(0,212,255,0.35)', background: 'rgba(0,0,0,0.3)' }}>{hashDisplay}</p>
            </div>

            <ul className="space-y-2 text-sm text-gray-300">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: '#00d4ff' }} />
                Signature valide
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: '#00d4ff' }} />
                Contenu conforme
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: '#00d4ff' }} />
                Ancré blockchain
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0 animate-pulse" style={{ background: '#00d4ff' }} />
                Certificat actif
              </li>
            </ul>

            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <a
                href="mailto:legal@blocktrust.tech?subject=Signalement%20certificat%20BlockTrust"
                className="inline-flex justify-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--bt-gold-dim)]"
                style={{ borderColor: 'var(--bt-border-gold)', color: 'var(--bt-gold)' }}
              >
                Signaler
              </a>
            </div>
          </div>
        </div>

        <footer className="mt-8 flex justify-center">
          <Logo size="sm" withText={true} />
        </footer>
      </div>
    </div>
  )
}

function FraudAlertView({
  jti,
  expectedHash,
  receivedHash,
  ip,
}: {
  jti: string
  expectedHash: string
  receivedHash: string
  ip: string
}) {
  const verifyUrl = `${BASE_URL}/verify/${jti}`

  return (
    <div className="min-h-screen bg-[#0d0505] text-gray-100" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
      <div className="max-w-xl mx-auto px-4 py-10">
        <div className="rounded-lg border-2 border-[#E05252] bg-[#0d0505] p-6 md:p-8">
          <div className="bg-[#E05252]/20 border border-[#E05252] rounded-lg px-4 py-3 mb-6 animate-pulse">
            <h1 className="text-xl font-bold text-[#E05252] text-center">FRAUDE DÉTECTÉE</h1>
          </div>

          <p className="text-gray-300 text-sm mb-6">
            Le contexte de vérification ne correspond pas au certificat officiel. Ne faites pas confiance à ce support.
          </p>

          <div className="space-y-4 mb-6 font-mono text-xs bg-black/40 rounded-lg p-4">
            <div>
              <p className="text-gray-500 mb-1">Hash attendu</p>
              <p className="text-gray-300 break-all">{expectedHash}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">Hash reçu</p>
              <p className="text-[#E05252] break-all">{receivedHash}</p>
            </div>
            <div>
              <p className="text-gray-500 mb-1">IP</p>
              <p className="text-gray-300">{ip}</p>
            </div>
            <p className="text-[#E05252] font-semibold">Verdict : FRAUD_ALERT</p>
          </div>

          <ol className="list-decimal list-inside space-y-2 text-gray-300 text-sm mb-6">
            <li>Ne pas effectuer de paiement ou transmettre de données sensibles.</li>
            <li>Contacter l&apos;entité par un canal officiel (site, email vérifié).</li>
            <li>Signaler la fraude pour aider à protéger les autres.</li>
          </ol>

          <div className="flex flex-col sm:flex-row gap-3">
            <a
              href="mailto:legal@blocktrust.tech?subject=Signaler%20une%20fraude%20BlockTrust"
              className="inline-flex justify-center rounded-lg bg-[#E05252] text-white px-4 py-2 text-sm font-medium hover:opacity-90 transition-opacity"
            >
              Signaler la fraude
            </a>
            <Link
              href={verifyUrl}
              className="inline-flex justify-center rounded-lg border border-[#BDA76B]/50 text-[#BDA76B] px-4 py-2 text-sm font-medium hover:bg-[#BDA76B]/10 transition-colors"
            >
              Voir le certificat original
            </Link>
          </div>
        </div>
        <footer className="mt-8 flex justify-center opacity-60">
          <Logo size="sm" withText={false} />
        </footer>
      </div>
    </div>
  )
}
