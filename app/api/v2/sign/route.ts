// app/api/v2/sign/route.ts
// Génère une signature V2 anti-falsification pour un certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { createHash, createSign, generateKeyPairSync, createPrivateKey } from 'crypto'
import { z } from 'zod'

const signSchema = z.object({
  certificateId: z.string().cuid(),
  targetUrl: z.string().url(), // URL où le badge sera affiché
  context: z.object({
    purpose: z.enum(['email', 'website', 'document', 'social']),
    recipient: z.string().optional(),
  }).optional(),
})

// Fonction pour obtenir la clé privée (depuis env ou générée temporairement)
function getPrivateKey() {
  if (process.env.BLOCKTRUST_JWT_PRIVATE_KEY) {
    // Convertir la string PEM en KeyObject
    const privateKeyPem = process.env.BLOCKTRUST_JWT_PRIVATE_KEY.replace(/\\n/g, '\n')
    return createPrivateKey(privateKeyPem)
  } else {
    // Fallback: générer une clé temporaire (non recommandé en production)
    console.warn('⚠️ BLOCKTRUST_JWT_PRIVATE_KEY non définie, génération d\'une clé temporaire')
    const { privateKey: pk } = generateKeyPairSync('ec', {
      namedCurve: 'P-256',
    })
    return pk
  }
}

export async function POST(req: NextRequest) {
  try {
    // Vérifier l'authentification
    // TODO: Remplacer par getServerSession(authOptions) quand NextAuth sera implémenté
    const user = await getAuthUser(req)
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Valider le body
    const body = await req.json()
    const parsed = signSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { certificateId, targetUrl, context } = parsed.data

    // Récupérer le certificat et vérifier la propriété
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        entity: {
          select: {
            id: true,
            userId: true,
            legalName: true,
            email: true,
            siret: true,
            validationLevel: true,
          },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json({ error: 'Certificat non trouvé' }, { status: 404 })
    }

    if (certificate.entity.userId !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    if (certificate.status !== 'ACTIVE' && certificate.status !== 'ANCHORED') {
      return NextResponse.json(
        { error: 'Certificat non actif', status: certificate.status },
        { status: 400 }
      )
    }

    // Utiliser tokenId comme publicId, fallback sur id
    const publicId = certificate.tokenId || certificate.id

    // Créer le payload pour la signature
    const now = Math.floor(Date.now() / 1000)
    const jti = `sig_${publicId}_${now}_${Math.random().toString(36).slice(2, 8)}`
    
    const entityName = certificate.entity.legalName || certificate.entity.email

    const payload = {
      jti,
      iss: 'blocktrust.tech',
      sub: publicId,
      iat: now,
      exp: now + 86400 * 365, // 1 an
      entity: {
        name: entityName,
        email: certificate.entity.email,
        siret: certificate.entity.siret,
        level: certificate.entity.validationLevel,
      },
      certificate: {
        id: publicId,
        level: certificate.level,
        issuedAt: certificate.issuedAt.toISOString(),
      },
      context: {
        targetUrl,
        purpose: context?.purpose || 'website',
        recipient: context?.recipient,
      },
    }

    // Hash contextuel SHA-256 (inclut l'URL cible pour détecter les copies)
    const contextualData = `${jti}:${publicId}:${targetUrl}:${now}`
    const contextualHash = createHash('sha256').update(contextualData).digest('hex')

    // Obtenir la clé privée
    const privateKeyObj = getPrivateKey()

    // Signature EC P-256
    const signer = createSign('SHA256')
    signer.update(JSON.stringify(payload))
    const signatureBuffer = signer.sign(privateKeyObj, 'base64')

    // Stocker la signature en DB
    // Note: Le modèle Signature n'a pas les champs payload, signature, targetUrl, purpose
    // On stocke uniquement les champs disponibles dans le schéma Prisma
    await prisma.signature.create({
      data: {
        jti,
        certificateId: certificate.id,
        entityId: certificate.entityId,
        purpose: context?.purpose || 'website',
        contextHash: contextualHash,
        expiresAt: new Date((now + 86400 * 365) * 1000),
        // TODO: Ajouter les champs suivants au modèle Signature si nécessaire:
        // - payload (JSON)
        // - signature (String)
        // - targetUrl (String)
        // - purpose (String)
      },
    })

    // Générer l'URL de vérification
    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/verify/${publicId}?sig=${jti}&ctx=${contextualHash.slice(0, 16)}`

    return NextResponse.json({
      success: true,
      signature: {
        jti,
        contextHash: contextualHash,
        signature: signatureBuffer,
        verifyUrl,
        expiresAt: new Date((now + 86400 * 365) * 1000).toISOString(),
      },
      badge: {
        embedCode: `<a href="${verifyUrl}" target="_blank" rel="noopener"><img src="${process.env.NEXT_PUBLIC_APP_URL}/api/badge/${publicId}?sig=${jti}" alt="Vérifié par BlockTrust" width="120" height="40" /></a>`,
        qrCodeUrl: `${process.env.NEXT_PUBLIC_APP_URL}/api/qr/${publicId}?sig=${jti}`,
      },
    })
  } catch (error) {
    console.error('❌ V2 Sign error:', error)
    return NextResponse.json(
      { error: 'Erreur génération signature' },
      { status: 500 }
    )
  }
}
