// GET — génère un lien /verify?vt=… valable 24h (token stocké dans Redis)
// ============================================================

import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { redis } from '@/lib/rate-limit-redis'

export const dynamic = 'force-dynamic'

const TTL_SEC = 86400

function appBaseUrl(): string {
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ||
    process.env.NEXTAUTH_URL?.replace(/\/$/, '') ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : '')
  return fromEnv || 'https://blocktrust.tech'
}

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteParams) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const { id: paramId } = await params

  const certificate = await prisma.certificate.findFirst({
    where: {
      OR: [{ id: paramId }, { publicId: paramId }],
      entity: { userId: session.user.id },
    },
    select: { id: true, publicId: true },
  })

  if (!certificate) {
    return NextResponse.json({ error: 'Certificat introuvable' }, { status: 404 })
  }

  if (!redis) {
    console.warn('[verify-link] Redis non configuré — lien rotatif indisponible')
    return NextResponse.json(
      {
        error: 'service_unavailable',
        message: 'Lien sécurisé temporairement indisponible.',
      },
      { status: 503 },
    )
  }

  const token = randomBytes(16).toString('base64url')
  const certKey = certificate.publicId || certificate.id
  const redisKey = `vt:${token}`

  try {
    await redis.set(redisKey, certKey, { ex: TTL_SEC })
  } catch (err) {
    console.warn('[verify-link] Redis set KO (fail-soft)', err)
    return NextResponse.json(
      {
        error: 'service_unavailable',
        message: 'Lien sécurisé temporairement indisponible.',
      },
      { status: 503 },
    )
  }

  const expiresAt = new Date(Date.now() + TTL_SEC * 1000).toISOString()
  const verifyUrl = `${appBaseUrl()}/verify?vt=${encodeURIComponent(token)}`

  return NextResponse.json({ verifyUrl, expiresAt })
}
