/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * POST /api/bis/sign — signature sortante BIS
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/app/lib/auth-server'
import {
  BisSignError,
  createBisSignature,
  resolveSenderBisCertificate,
} from '@/lib/bis-sign'
import {
  BIS_INTERACTION_TYPES,
  isValidContentHash,
  normalizeEmail,
} from '@/lib/bis-access'
import { btErrorDevDetails } from '@/lib/prodLog'

const signBodySchema = z.object({
  recipientEmail: z.string().email(),
  interactionType: z.enum(BIS_INTERACTION_TYPES),
  contextLabel: z.string().max(200).optional(),
  contentHash: z.string().min(64).max(64),
})

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id || !session.user.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const body = await req.json()
    const parsed = signBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      )
    }

    const { recipientEmail, interactionType, contextLabel, contentHash } =
      parsed.data

    if (!isValidContentHash(contentHash)) {
      return NextResponse.json(
        { error: 'contentHash doit être un SHA-256 hex (64 caractères)' },
        { status: 400 },
      )
    }

    const senderCert = await resolveSenderBisCertificate(session.user.id)
    if (!senderCert) {
      return NextResponse.json(
        {
          error:
            'Certificat actif ancré requis — disponible à partir de Premium ou plans professionnels',
        },
        { status: 403 },
      )
    }

    const result = await createBisSignature({
      senderId: session.user.id,
      senderCertId: senderCert.id,
      senderEmail: session.user.email,
      recipientEmail: normalizeEmail(recipientEmail),
      interactionType,
      contextLabel,
      contentHash: contentHash.toLowerCase(),
    })

    return NextResponse.json({
      signatureId: result.signatureId,
      signature: result.signature,
      bisLevel: result.bisLevel,
      verifyUrl: result.verifyUrl,
      expiresAt: result.expiresAt,
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
    if (error instanceof BisSignError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }
    btErrorDevDetails(error, 'BIS sign error')
    return NextResponse.json(
      { error: 'Erreur lors de la signature BIS' },
      { status: 500 },
    )
  }
}
