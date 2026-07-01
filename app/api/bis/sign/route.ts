/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * POST /api/bis/sign — signature sortante BIS (session ou clé API extension)
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { hashApiKey } from '@/lib/api-key'
import {
  BisSignError,
  createBisSignature,
  resolveSenderBisCertificate,
} from '@/lib/bis-sign'
import {
  notifyBisRecipientFireAndForget,
  resolveBisSenderDisplayName,
} from '@/lib/bis-email-notify'
import {
  BIS_INTERACTION_TYPES,
  isValidContentHash,
  normalizeEmail,
} from '@/lib/bis-access'
import { assertSafeDisplayText } from '@/lib/sanitize-display-text'
import {
  extractExtensionApiKey,
  findUserIdByExtensionApiKey,
  EXTENSION_UNAUTHORIZED_BODY,
} from '@/lib/extension-auth'
import {
  extensionOptionsResponse,
  getCorsHeaders,
  rejectForbiddenExtensionOrigin,
} from '@/lib/extension-cors'
import { checkRateLimitExtensionAsync } from '@/lib/rate-limit-extension'
import { btErrorDevDetails } from '@/lib/prodLog'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const signBodySchema = z
  .object({
    recipientEmail: z.string().email(),
    interactionType: z.enum(BIS_INTERACTION_TYPES),
    contextLabel: z.string().max(200).optional(),
    context: z.string().max(200).optional(),
    contentHash: z.string().min(64).max(64),
    notifyRecipient: z.boolean().optional().default(true),
  })
  .transform((data) => ({
    recipientEmail: data.recipientEmail,
    interactionType: data.interactionType,
    contextLabel: data.contextLabel ?? data.context,
    contentHash: data.contentHash,
    notifyRecipient: data.notifyRecipient,
  }))

type BisSignActor = {
  userId: string
  userEmail: string
  userName: string | null
}

function safeSignErrorMessage(error: unknown): string {
  if (error instanceof BisSignError) return error.message
  if (process.env.NODE_ENV === 'production') {
    return 'Erreur serveur lors de la signature'
  }
  if (error instanceof Error) {
    if (error.message.includes('Invalid key type')) {
      return 'Configuration serveur : BLOCKTRUST_JWT_PRIVATE_KEY incompatible (RSA attendu RS256, EC attendu ES256 — vérifiez le format PEM sur Vercel)'
    }
    if (error.message.includes('PEM attendu') || error.message.includes('absente')) {
      return `Configuration serveur : ${error.message}`
    }
    return error.message
  }
  return 'Erreur inconnue'
}

function bisJson(req: NextRequest, body: unknown, status = 200): NextResponse {
  const forbidden = rejectForbiddenExtensionOrigin(req)
  if (forbidden) return forbidden
  return NextResponse.json(body, { status, headers: getCorsHeaders(req) })
}

async function resolveBisSignActor(req: NextRequest): Promise<BisSignActor | null> {
  const session = await auth()
  if (session?.user?.id && session.user.email) {
    const rate = await checkRateLimitExtensionAsync('write', session.user.id)
    if (!rate.ok) {
      throw new BisSignError('Trop de requêtes. Réessayez plus tard.', 429)
    }
    return {
      userId: session.user.id,
      userEmail: session.user.email,
      userName: session.user.name ?? null,
    }
  }

  const apiKey = extractExtensionApiKey(req)
  const userId = await findUserIdByExtensionApiKey(apiKey)
  if (!userId || !apiKey) return null

  const rate = await checkRateLimitExtensionAsync('write', hashApiKey(apiKey))
  if (!rate.ok) {
    throw new BisSignError('Trop de requêtes. Réessayez plus tard.', 429)
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  })
  if (!user?.email) return null

  return {
    userId,
    userEmail: user.email,
    userName: user.name,
  }
}

export async function OPTIONS(req: NextRequest) {
  return extensionOptionsResponse(req)
}

export async function POST(req: NextRequest) {
  try {
    let actor: BisSignActor | null
    try {
      actor = await resolveBisSignActor(req)
    } catch (error) {
      if (error instanceof BisSignError) {
        return bisJson(req, { error: error.message }, error.status)
      }
      throw error
    }

    if (!actor) {
      const apiKey = extractExtensionApiKey(req)
      if (apiKey) {
        return bisJson(req, EXTENSION_UNAUTHORIZED_BODY, 401)
      }
      return bisJson(req, { error: 'Non autorisé' }, 401)
    }

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return bisJson(req, { error: 'Corps JSON invalide' }, 400)
    }

    const parsed = signBodySchema.safeParse(body)
    if (!parsed.success) {
      return bisJson(
        req,
        { error: 'Données invalides', details: parsed.error.flatten() },
        400,
      )
    }

    const { recipientEmail, interactionType, contextLabel, contentHash, notifyRecipient } =
      parsed.data

    if (!isValidContentHash(contentHash)) {
      return bisJson(
        req,
        { error: 'contentHash doit être un SHA-256 hex (64 caractères)' },
        400,
      )
    }

    let safeContextLabel: string | undefined
    if (contextLabel?.trim()) {
      const ctxCheck = assertSafeDisplayText(contextLabel, 'Contexte')
      if (!ctxCheck.ok) {
        return bisJson(req, { error: ctxCheck.reason }, 400)
      }
      safeContextLabel = ctxCheck.value
    }

    const senderCert = await resolveSenderBisCertificate(actor.userId)
    if (!senderCert) {
      return bisJson(
        req,
        {
          error:
            'Certificat actif ancré requis — disponible à partir de Premium ou plans professionnels',
        },
        403,
      )
    }

    const result = await createBisSignature({
      senderId: actor.userId,
      senderCertId: senderCert.id,
      senderEmail: actor.userEmail,
      recipientEmail: normalizeEmail(recipientEmail),
      interactionType,
      contextLabel: safeContextLabel,
      contentHash: contentHash.toLowerCase(),
    })

    const normalizedRecipient = normalizeEmail(recipientEmail)
    const notificationRequested = notifyRecipient && Boolean(normalizedRecipient)

    if (notificationRequested) {
      notifyBisRecipientFireAndForget({
        signatureId: result.signatureId,
        senderUserId: actor.userId,
        recipientEmail: normalizedRecipient,
        senderDisplayName: resolveBisSenderDisplayName(
          actor.userName,
          actor.userEmail,
        ),
        senderEmail: actor.userEmail,
        interactionType,
        contextLabel: safeContextLabel ?? null,
        contentHash: contentHash.toLowerCase(),
        bisLevel: result.bisLevel,
        signedAt: new Date(result.payload.iat * 1000),
        expiresAt: new Date(result.expiresAt),
        verifyUrl: result.verifyUrl,
      })
    }

    return bisJson(req, {
      signatureId: result.signatureId,
      bisId: result.signatureId,
      signature: result.signature,
      bisLevel: result.bisLevel,
      verifyUrl: result.verifyUrl,
      expiresAt: result.expiresAt,
      notificationRequested,
      payload: {
        sender: result.payload.sender,
        recipient: result.payload.recipient,
        type: result.payload.type,
        context: result.payload.context,
        contentHash: result.payload.contentHash,
        iat: result.payload.iat,
        exp: result.payload.exp,
      },
    })
  } catch (error) {
    btErrorDevDetails(error, '[BIS] Sign error')
    if (error instanceof BisSignError) {
      return bisJson(req, { error: error.message }, error.status)
    }
    const message = safeSignErrorMessage(error)
    return bisJson(req, { error: message || 'Erreur inconnue' }, 500)
  }
}
