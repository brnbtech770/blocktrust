// app/verify/qr/[token]/page.tsx
// Vérification via QR dynamique (token rotatif, usage limité)
// Ne pas toucher à la logique ES256/ctxHash/FRAUD_ALERT de /verify/[id]
// ============================================================

import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { prisma } from '@/app/lib/db'
import { auth } from '@/app/lib/auth-server'
import { isAdmin } from '@/app/lib/admin'
import { Logo } from '@/app/components/ui/Logo'
import { hashIp } from '@/app/lib/auth'
import { checkRateLimitVerify } from '@/lib/rate-limit-verify'
import { peekVerifyQuota } from '@/lib/verify-quotas'

export const dynamic = 'force-dynamic'

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'

export default async function VerifyQRTokenPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>
  searchParams: Promise<{ h?: string }>
}) {
  const { token } = await params
  const { h: ctxHashFromQuery = '' } = await searchParams

  const session = await auth()
  if (!session?.user?.id) {
    const cb = `/verify/qr/${encodeURIComponent(token)}${ctxHashFromQuery ? `?h=${encodeURIComponent(ctxHashFromQuery)}` : ''}`
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(cb)}`)
  }

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  const rate = checkRateLimitVerify(ip)
  if (!rate.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a1628' }}>
        <div className="w-full max-w-md rounded-xl border border-gold/30 bg-white/5 p-8 text-center backdrop-blur-lg">
          <h1 className="font-syne mb-4 text-2xl font-bold tracking-tight text-gold">Trop de requêtes</h1>
          <p className="mb-6 text-white/60">Veuillez réessayer dans {rate.retryAfter ? `${rate.retryAfter} seconde(s)` : '1 minute'}.</p>
          <Link href={BASE_URL} className="text-[#BDA76B] hover:underline text-sm">Retour à blocktrust.tech</Link>
        </div>
      </div>
    )
  }

  const userIsAdmin = isAdmin(session.user.email)
  if (!userIsAdmin) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId: session.user.id },
    })
    if (!subscription || subscription.status !== 'active') {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a1628] p-4">
          <div className="w-full max-w-md rounded-xl border border-[#BDA76B]/40 bg-white/5 p-8 text-center">
            <p className="mb-4 text-4xl" aria-hidden>
              🔒
            </p>
            <h1 className="font-syne mb-4 text-xl font-bold text-white">Vérification réservée aux abonnés</h1>
            <p className="mb-6 text-sm text-white/70">
              La vérification de badges BLOCKTRUST est disponible à partir du forfait Essentiel.
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-lg px-5 py-2 text-sm font-bold text-[#0a1628]"
              style={{ background: '#00d4ff' }}
            >
              Voir les forfaits
            </Link>
          </div>
        </div>
      )
    }
    const peek = await peekVerifyQuota(session.user.id, subscription.plan, false)
    if (!peek.allowed) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-[#0a1628] p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-white/5 p-8 text-center">
            <p className="mb-4 text-4xl" aria-hidden>
              ⏱️
            </p>
            <h1 className="font-syne mb-4 text-xl font-bold text-white">Limite mensuelle atteinte</h1>
            <p className="mb-6 text-sm text-white/70">
              Vous avez utilisé vos {peek.limit} vérifications ce mois-ci.
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-lg px-5 py-2 text-sm font-bold text-[#0a1628]"
              style={{ background: '#00d4ff' }}
            >
              Upgrader mon forfait
            </Link>
          </div>
        </div>
      )
    }
  }

  const signature = await prisma.signature.findUnique({
    where: { dynamicToken: token },
    include: {
      certificate: { include: { entity: true } },
    },
  })

  if (!signature || signature.revoked) {
    return <QRExpiredView reason="introuvable" />
  }

  const cert = signature.certificate
  const entity = cert.entity

  if (String(cert.status) === 'REVOKED' || String(cert.status) === 'EXPIRED') {
    return <QRExpiredView reason="certificat révoqué ou expiré" />
  }

  if (signature.tokenExpiry && signature.tokenExpiry < new Date()) {
    return <QRExpiredView reason="expiré" />
  }

  if (signature.scanCount >= signature.maxScans) {
    return <QRExpiredView reason="max_scans" />
  }

  const expectedHash = signature.contextHash ?? ''
  if (ctxHashFromQuery && expectedHash !== ctxHashFromQuery) {
    await prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashIp(ip),
        userAgent,
        result: 'FRAUD_ALERT',
        signatureJti: signature.jti,
      },
    })
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bt-navy)' }}>
        <div className="w-full max-w-md rounded-xl border border-red-500/30 bg-white/5 p-8 text-center backdrop-blur-lg">
          <h1 className="font-syne mb-4 text-2xl font-bold tracking-tight text-red-400">Alerte fraude</h1>
          <p className="mb-6 text-white/60">Le lien de vérification ne correspond pas au certificat.</p>
          <Link href={BASE_URL} className="text-[#BDA76B] hover:underline text-sm">Retour à blocktrust.tech</Link>
        </div>
      </div>
    )
  }

  const newDynamicToken = crypto.randomBytes(32).toString('hex')
  const newTokenExpiry = new Date(Date.now() + 24 * 3600 * 1000)

  await prisma.$transaction([
    prisma.signature.update({
      where: { id: signature.id },
      data: {
        scanCount: { increment: 1 },
        lastScannedAt: new Date(),
        dynamicToken: newDynamicToken,
        tokenExpiry: newTokenExpiry,
      },
    }),
    prisma.verification.create({
      data: {
        certificateId: cert.id,
        ipHash: hashIp(ip),
        userAgent,
        result: 'VALID',
        signatureJti: signature.jti,
      },
    }),
    prisma.certificate.update({
      where: { id: cert.id },
      data: {
        verificationCount: { increment: 1 },
        lastVerifiedAt: new Date(),
      },
    }),
  ])

  redirect(`${BASE_URL}/verify/${signature.jti}?h=${encodeURIComponent(expectedHash)}`)
}

function QRExpiredView({ reason }: { reason: string }) {
  const isMaxScans = reason === 'max_scans'
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bt-navy)' }}>
      <div className="w-full max-w-md rounded-xl border border-gold/30 bg-white/5 p-8 text-center backdrop-blur-lg">
        <div className="mb-4 text-5xl">⏰</div>
        <h1 className="font-syne mb-2 text-2xl font-bold tracking-tight text-white">
          QR code expiré
        </h1>
        <p className="mb-4 text-white/60">
          {isMaxScans
            ? 'Ce QR code a atteint son nombre maximum d\'utilisations.'
            : 'Ce lien de vérification n\'est plus valide.'}
        </p>
        <p className="mb-6 text-sm text-white/45">
          {isMaxScans
            ? 'Contactez le propriétaire du certificat pour obtenir un nouveau QR code.'
            : 'Demandez un nouveau QR code au propriétaire du certificat.'}
        </p>
        <Link
          href={BASE_URL}
          className="inline-block rounded-lg border border-bt-cyan/40 px-4 py-2 text-sm font-medium text-bt-cyan transition-colors hover:bg-bt-cyan/10"
        >
          Retour à blocktrust.tech
        </Link>
        <footer className="mt-8 flex justify-center">
          <Logo size="sm" withText={true} />
        </footer>
      </div>
    </div>
  )
}
