// app/verify/qr/[token]/page.tsx
// Vérification via QR dynamique (token rotatif, usage limité)
// Ne pas toucher à la logique ES256/ctxHash/FRAUD_ALERT de /verify/[id]
// ============================================================

import { headers } from 'next/headers'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import crypto from 'crypto'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'
import { hashIp } from '@/app/lib/auth'
import { checkRateLimitVerify } from '@/lib/rate-limit-verify'

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

  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() || headersList.get('x-real-ip') || 'unknown'
  const userAgent = headersList.get('user-agent') || 'unknown'

  const rate = checkRateLimitVerify(ip)
  if (!rate.ok) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#0a1628' }}>
        <div className="max-w-md w-full text-center rounded-2xl border border-[#BDA76B]/30 bg-[#001a33]/90 p-8">
          <h1 className="text-2xl font-bold text-[#BDA76B] mb-4">Trop de requêtes</h1>
          <p className="text-gray-400 mb-6">Veuillez réessayer dans {rate.retryAfter ? `${rate.retryAfter} seconde(s)` : '1 minute'}.</p>
          <Link href={BASE_URL} className="text-[#BDA76B] hover:underline text-sm">Retour à blocktrust.tech</Link>
        </div>
      </div>
    )
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
        <div className="max-w-md w-full text-center rounded-2xl border border-red-500/30 bg-[#001a33]/90 p-8">
          <h1 className="text-2xl font-bold text-red-400 mb-4">Alerte fraude</h1>
          <p className="text-gray-400 mb-6">Le lien de vérification ne correspond pas au certificat.</p>
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
      <div className="max-w-md w-full text-center rounded-2xl border border-[#BDA76B]/30 p-8" style={{ background: 'rgba(13,31,60,0.8)' }}>
        <div className="text-5xl mb-4">⏰</div>
        <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          QR code expiré
        </h1>
        <p className="text-gray-400 mb-4">
          {isMaxScans
            ? 'Ce QR code a atteint son nombre maximum d\'utilisations.'
            : 'Ce lien de vérification n\'est plus valide.'}
        </p>
        <p className="text-sm text-gray-500 mb-6">
          {isMaxScans
            ? 'Contactez le propriétaire du certificat pour obtenir un nouveau QR code.'
            : 'Demandez un nouveau QR code au propriétaire du certificat.'}
        </p>
        <Link
          href={BASE_URL}
          className="inline-block rounded-lg px-4 py-2 text-sm font-medium text-[#00d4ff] border border-[#00d4ff]/30 hover:bg-[#00d4ff]/10 transition-colors"
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
