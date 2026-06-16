// lib/certificate-verify-token.ts
// Tokens rotatifs pour liens /verify?vt= (badges).
// ============================================================

import { nanoid } from 'nanoid'
import { hashIp } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import {
  DEFAULT_TTL_HOURS,
  MAX_TTL_HOURS,
  MIN_TTL_HOURS,
  type VerifyTokenListItem,
} from '@/lib/certificate-verify-token-constants'
import { getBlocktrustBaseUrl } from '@/lib/public-verify-url'
import { getRedis } from '@/lib/rate-limit-redis'

export {
  DEFAULT_TTL_HOURS,
  MAX_TTL_HOURS,
  MIN_TTL_HOURS,
  TTL_PRESETS,
  type VerifyTokenListItem,
} from '@/lib/certificate-verify-token-constants'

export function normalizeTtlHours(ttlHours?: number): number {
  const raw = ttlHours ?? DEFAULT_TTL_HOURS
  if (!Number.isFinite(raw)) return DEFAULT_TTL_HOURS
  return Math.min(MAX_TTL_HOURS, Math.max(MIN_TTL_HOURS, Math.floor(raw)))
}

export function buildRotatingVerifyUrl(token: string): string {
  return `${getBlocktrustBaseUrl()}/verify?vt=${encodeURIComponent(token)}`
}

export async function createCertificateVerifyToken(params: {
  certId: string
  ttlHours?: number
}): Promise<{
  id: string
  token: string
  verifyUrl: string
  expiresAt: string
}> {
  const ttlHours = normalizeTtlHours(params.ttlHours)
  const token = nanoid(21)
  const expiresAt = new Date(Date.now() + ttlHours * 60 * 60 * 1000)

  const row = await prisma.certificateVerifyToken.create({
    data: {
      token,
      certId: params.certId,
      expiresAt,
    },
    select: { id: true },
  })

  return {
    id: row.id,
    token,
    verifyUrl: buildRotatingVerifyUrl(token),
    expiresAt: expiresAt.toISOString(),
  }
}

export type ResolveCertificateVerifyTokenResult =
  | { status: 'ok'; certId: string; used: boolean }
  | { status: 'expired' }
  | { status: 'not_found' }

export async function resolveCertificateVerifyToken(
  token: string,
  clientIp?: string,
): Promise<ResolveCertificateVerifyTokenResult> {
  const row = await prisma.certificateVerifyToken.findUnique({
    where: { token },
    include: {
      certificate: { select: { id: true, publicId: true } },
    },
  })

  if (row) {
    if (row.expiresAt.getTime() < Date.now()) {
      return { status: 'expired' }
    }

    const certKey = row.certificate.publicId || row.certificate.id
    const wasUsed = row.used

    if (!row.used) {
      const ipHash = clientIp ? hashIp(clientIp) : undefined
      void prisma.certificateVerifyToken
        .update({
          where: { id: row.id },
          data: {
            used: true,
            usedAt: new Date(),
            ...(ipHash ? { usedByIp: ipHash } : {}),
          },
        })
        .catch((err: unknown) => {
          console.warn('[verify-token] mark used failed', err)
        })
    } else {
      console.log(
        `[verify-token] reused token=${token.slice(0, 6)}… certId=${row.certId.slice(0, 8)}…`,
      )
    }

    return { status: 'ok', certId: certKey, used: wasUsed }
  }

  const redis = getRedis()
  if (redis) {
    try {
      const certId = await redis.get(`vt:${token}`)
      if (certId && typeof certId === 'string') {
        return { status: 'ok', certId, used: false }
      }
    } catch (err: unknown) {
      console.warn('[verify-token] Redis fallback failed', err)
    }
  }

  return { status: 'not_found' }
}

export async function assertCertificateOwnedByUser(
  certificateId: string,
  userId: string,
): Promise<{ id: string; publicId: string | null } | null> {
  return prisma.certificate.findFirst({
    where: {
      OR: [{ id: certificateId }, { publicId: certificateId }],
      entity: { userId },
    },
    select: { id: true, publicId: true },
  })
}

export async function listCertificateVerifyTokensForUser(
  certificateId: string,
  userId: string,
): Promise<VerifyTokenListItem[]> {
  const certificate = await assertCertificateOwnedByUser(certificateId, userId)
  if (!certificate) return []

  const rows = await prisma.certificateVerifyToken.findMany({
    where: { certId: certificate.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: {
      id: true,
      token: true,
      createdAt: true,
      expiresAt: true,
      used: true,
      usedAt: true,
    },
  })

  const now = Date.now()

  return rows.map((row) => {
    const expired = row.expiresAt.getTime() < now
    const status: VerifyTokenListItem['status'] = expired
      ? 'expired'
      : row.used
        ? 'used'
        : 'active'

    return {
      id: row.id,
      tokenPreview: `${row.token.slice(0, 6)}…${row.token.slice(-4)}`,
      verifyUrl: buildRotatingVerifyUrl(row.token),
      createdAt: row.createdAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      used: row.used,
      usedAt: row.usedAt?.toISOString() ?? null,
      status,
    }
  })
}
