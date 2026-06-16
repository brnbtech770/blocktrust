/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * BIS — création et vérification de signatures d'interaction (ES256 / JWS).
 */
import { randomBytes } from 'crypto'
import { SignJWT, jwtVerify } from 'jose'
import { prisma } from '@/app/lib/db'
import {
  importJwtPrivateKeyFromEnv,
  importJwtPublicKeyFromEnv,
} from '@/lib/jwt-pem'
import {
  BIS_DEFAULT_TTL_SECONDS,
  BIS_SENSITIVE_TYPES,
  type BisInteractionType,
  canCreateBisSignature,
  isCertificateBisEligible,
  normalizeEmail,
} from '@/lib/bis-access'
import { resolveEffectivePlan } from '@/lib/plan-features'
import { isInternalAccount } from '@/lib/admin-utils'

const BIS_ISSUER = 'blocktrust.tech'

export interface BisPayload {
  iss: string
  sub: string
  sender: string
  recipient: string
  type: BisInteractionType
  context: string | null
  contentHash: string
  iat: number
  exp: number
  jti: string
}

export interface CreateBisSignatureInput {
  senderId: string
  senderCertId: string
  senderEmail: string
  recipientEmail: string
  interactionType: BisInteractionType
  contextLabel?: string | null
  contentHash: string
}

export interface CreateBisSignatureResult {
  signatureId: string
  signature: string
  verifyUrl: string
  payload: BisPayload
  bisLevel: number
  expiresAt: string
}

export interface VerifyBisSignatureResult {
  valid: boolean
  bisLevel: number
  sender: string
  recipient: string
  type: BisInteractionType
  context: string | null
  contentHash: string
  jti?: string
  exp?: number
  iat?: number
  certificateStatus?: 'ACTIVE' | 'ANCHORED' | 'REVOKED' | 'EXPIRED' | 'SUSPENDED' | 'PENDING'
  reason?: string
}

function appBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    'https://blocktrust.tech'
  ).replace(/\/$/, '')
}

function generateJti(): string {
  return `bis_${randomBytes(16).toString('base64url')}`
}

export function computeBisDisplayLevel(params: {
  valid: boolean
  certificateStatus: string
  interactionType: string
  verified: boolean
  senderKycVerified?: boolean
}): number {
  if (!params.valid) return 0
  if (params.certificateStatus === 'REVOKED') return 1
  if (
    params.certificateStatus !== 'ACTIVE' &&
    params.certificateStatus !== 'ANCHORED'
  ) {
    return 1
  }
  if (BIS_SENSITIVE_TYPES.has(params.interactionType as BisInteractionType)) {
    return 4
  }
  if (params.verified) return 3
  if (params.senderKycVerified) return 2
  return 2
}

async function assertSenderCanSign(
  senderId: string,
  senderCertId: string,
): Promise<{
  cert: {
    id: string
    status: string
    blockchainStatus: string | null
    polygonTxHash: string | null
    revokedAt: Date | null
    polygonExplorerUrl: string | null
  }
  senderEmail: string
}> {
  const user = await prisma.user.findUnique({
    where: { id: senderId },
    select: {
      email: true,
      subscription: { select: { plan: true, status: true } },
    },
  })

  if (!user?.email) {
    throw new BisSignError('Utilisateur introuvable', 404)
  }

  const effectivePlan = resolveEffectivePlan({
    subscription: user.subscription,
    email: user.email,
    isAdmin: isInternalAccount(user.email),
  })

  if (
    !canCreateBisSignature({
      effectivePlan,
      subscriptionStatus: user.subscription?.status,
      email: user.email,
    })
  ) {
    throw new BisSignError(
      'Plan payant avec certificat ancré requis pour signer une interaction BIS',
      403,
    )
  }

  const cert = await prisma.certificate.findFirst({
    where: {
      id: senderCertId,
      entity: { userId: senderId },
    },
    select: {
      id: true,
      status: true,
      blockchainStatus: true,
      polygonTxHash: true,
      revokedAt: true,
      polygonExplorerUrl: true,
    },
  })

  if (!cert) {
    throw new BisSignError('Certificat introuvable', 404)
  }

  if (!isCertificateBisEligible(cert)) {
    throw new BisSignError(
      'Certificat actif et ancré sur Polygon requis',
      403,
    )
  }

  if (cert.status === 'REVOKED') {
    throw new BisSignError('Certificat révoqué', 403)
  }

  return { cert, senderEmail: user.email }
}

export class BisSignError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
    this.name = 'BisSignError'
  }
}

function mapPrismaSignError(error: unknown): BisSignError | null {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  ) {
    const code = (error as { code: string }).code
    if (code === 'P2021') {
      return new BisSignError(
        'Table BIS absente — exécutez prisma migrate deploy sur la base de production',
        503,
      )
    }
  }
  return null
}

export async function createBisSignature(
  input: CreateBisSignatureInput,
): Promise<CreateBisSignatureResult> {
  const senderEmail = normalizeEmail(input.senderEmail)
  const recipientEmail = normalizeEmail(input.recipientEmail)
  const contentHash = input.contentHash.trim().toLowerCase()

  const { cert } = await assertSenderCanSign(input.senderId, input.senderCertId)

  const now = Math.floor(Date.now() / 1000)
  const exp = now + BIS_DEFAULT_TTL_SECONDS
  const jti = generateJti()

  const payload: BisPayload = {
    iss: BIS_ISSUER,
    sub: input.senderCertId,
    sender: senderEmail,
    recipient: recipientEmail,
    type: input.interactionType,
    context: input.contextLabel?.trim() || null,
    contentHash,
    iat: now,
    exp,
    jti,
  }

  let privateKeyMaterial: Awaited<ReturnType<typeof importJwtPrivateKeyFromEnv>>
  try {
    privateKeyMaterial = await importJwtPrivateKeyFromEnv(
      process.env.BLOCKTRUST_JWT_PRIVATE_KEY,
    )
  } catch (keyErr) {
    const msg =
      keyErr instanceof Error ? keyErr.message : 'Clé JWT invalide'
    throw new BisSignError(
      msg.includes('absente')
        ? 'Configuration serveur : BLOCKTRUST_JWT_PRIVATE_KEY absente'
        : `Configuration serveur : clé JWT invalide (${msg})`,
      500,
    )
  }

  const signature = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: privateKeyMaterial.alg, typ: 'JWT' })
    .setIssuer(BIS_ISSUER)
    .setSubject(input.senderCertId)
    .setIssuedAt(now)
    .setExpirationTime(exp)
    .setJti(jti)
    .sign(privateKeyMaterial.key)

  const expiresAt = new Date(exp * 1000)
  const bisLevel = BIS_SENSITIVE_TYPES.has(input.interactionType) ? 4 : 3

  let recipientCertId: string | null = null
  const recipientUser = await prisma.user.findFirst({
    where: { email: recipientEmail },
    select: {
      entities: {
        select: {
          certificates: {
            where: { status: { in: ['ACTIVE', 'ANCHORED'] } },
            orderBy: { issuedAt: 'desc' },
            take: 1,
            select: { id: true },
          },
        },
      },
    },
  })
  if (recipientUser) {
    for (const entity of recipientUser.entities) {
      const cert = entity.certificates[0]
      if (cert) {
        recipientCertId = cert.id
        break
      }
    }
  }

  let record
  try {
    record = await prisma.interactionSignature.create({
      data: {
        senderId: input.senderId,
        senderCertId: input.senderCertId,
        senderEmail,
        recipientEmail,
        recipientCertId,
        interactionType: input.interactionType,
        contextLabel: input.contextLabel?.trim() || null,
        contentHash,
        signature,
        signaturePayload: JSON.stringify(payload),
        bisLevel,
        expiresAt,
        polygonTxHash: cert.polygonTxHash,
      },
    })
  } catch (dbErr) {
    const mapped = mapPrismaSignError(dbErr)
    if (mapped) throw mapped
    throw dbErr
  }

  const verifyUrl = `${appBaseUrl()}/verify/bis/${record.id}`

  return {
    signatureId: record.id,
    signature,
    verifyUrl,
    payload,
    bisLevel,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function verifyBisSignature(
  signatureJws: string,
): Promise<VerifyBisSignatureResult> {
  let payload: Record<string, unknown>
  try {
    const { key: publicKey } = await importJwtPublicKeyFromEnv(
      process.env.BLOCKTRUST_JWT_PUBLIC_KEY,
    )
    const verified = await jwtVerify(signatureJws, publicKey, {
      issuer: BIS_ISSUER,
      algorithms: ['ES256', 'RS256'],
    })
    payload = verified.payload as Record<string, unknown>
  } catch {
    return {
      valid: false,
      bisLevel: 0,
      sender: '',
      recipient: '',
      type: 'EMAIL',
      context: null,
      contentHash: '',
      reason: 'Signature cryptographique invalide ou expirée',
    }
  }

  const senderCertId = typeof payload.sub === 'string' ? payload.sub : ''
  const sender = typeof payload.sender === 'string' ? payload.sender : ''
  const recipient =
    typeof payload.recipient === 'string' ? payload.recipient : ''
  const type = (typeof payload.type === 'string'
    ? payload.type
    : 'EMAIL') as BisInteractionType
  const context =
    typeof payload.context === 'string'
      ? payload.context
      : payload.context === null
        ? null
        : null
  const contentHash =
    typeof payload.contentHash === 'string' ? payload.contentHash : ''
  const jti = typeof payload.jti === 'string' ? payload.jti : undefined
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined
  const iat = typeof payload.iat === 'number' ? payload.iat : undefined

  if (!senderCertId) {
    return {
      valid: false,
      bisLevel: 0,
      sender,
      recipient,
      type,
      context,
      contentHash,
      reason: 'Certificat émetteur absent du payload',
    }
  }

  const cert = await prisma.certificate.findUnique({
    where: { id: senderCertId },
    select: {
      status: true,
      entity: {
        select: {
          user: { select: { kycStatus: true } },
        },
      },
    },
  })

  if (!cert) {
    return {
      valid: false,
      bisLevel: 0,
      sender,
      recipient,
      type,
      context,
      contentHash,
      jti,
      exp,
      iat,
      reason: 'Certificat émetteur introuvable',
    }
  }

  const now = Math.floor(Date.now() / 1000)
  if (exp !== undefined && exp < now) {
    return {
      valid: false,
      bisLevel: 0,
      sender,
      recipient,
      type,
      context,
      contentHash,
      jti,
      exp,
      iat,
      certificateStatus: cert.status as VerifyBisSignatureResult['certificateStatus'],
      reason: 'Signature expirée',
    }
  }

  if (cert.status === 'REVOKED') {
    return {
      valid: false,
      bisLevel: 1,
      sender,
      recipient,
      type,
      context,
      contentHash,
      jti,
      exp,
      iat,
      certificateStatus: 'REVOKED',
      reason: 'Certificat émetteur révoqué',
    }
  }

  if (cert.status !== 'ACTIVE' && cert.status !== 'ANCHORED') {
    return {
      valid: false,
      bisLevel: 1,
      sender,
      recipient,
      type,
      context,
      contentHash,
      jti,
      exp,
      iat,
      certificateStatus: cert.status as VerifyBisSignatureResult['certificateStatus'],
      reason: 'Certificat émetteur inactif',
    }
  }

  const bisLevel = computeBisDisplayLevel({
    valid: true,
    certificateStatus: cert.status,
    interactionType: type,
    verified: false,
    senderKycVerified: cert.entity.user.kycStatus === 'VERIFIED',
  })

  return {
    valid: true,
    bisLevel,
    sender,
    recipient,
    type,
    context,
    contentHash,
    jti,
    exp,
    iat,
    certificateStatus: cert.status as 'ACTIVE' | 'ANCHORED',
  }
}

/** Résout le certificat actif ancré de l'utilisateur pour signature BIS. */
export async function resolveSenderBisCertificate(userId: string): Promise<{
  id: string
  polygonTxHash: string | null
  polygonExplorerUrl: string | null
} | null> {
  return prisma.certificate.findFirst({
    where: {
      entity: { userId },
      status: { in: ['ACTIVE', 'ANCHORED'] },
      OR: [{ blockchainStatus: 'ANCHORED' }, { polygonTxHash: { not: null } }],
      NOT: { blockchainStatus: 'NOT_ANCHORED' },
    },
    orderBy: { issuedAt: 'desc' },
    select: {
      id: true,
      polygonTxHash: true,
      polygonExplorerUrl: true,
    },
  })
}
