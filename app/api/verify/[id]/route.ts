// app/api/verify/[id]/route.ts
// Route publique de vérification V2
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/app/lib/db'
import { hashIp } from '@/app/lib/auth'
import { createHash, timingSafeEqual } from 'crypto'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function GET(req: NextRequest, { params }: RouteParams) {
  const { id } = await params
  const { searchParams } = new URL(req.url)
  
  const sig = searchParams.get('sig') // JTI de la signature
  const ctx = searchParams.get('ctx') // Hash contextuel (16 premiers chars)

  try {
    // Récupérer le certificat par publicId ou id
    let certificate = await prisma.certificate.findUnique({
      where: { publicId: id },
      include: {
        entity: {
          select: {
            id: true,
            legalName: true,
            email: true,
            siret: true,
            website: true,
            validationLevel: true,
            kycStatus: true,
          },
        },
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          take: 1,
        },
      },
    })

    // Si pas trouvé par tokenId, essayer par id
    if (!certificate) {
      certificate = await prisma.certificate.findUnique({
        where: { id },
        include: {
          entity: {
            select: {
              id: true,
              legalName: true,
              email: true,
              siret: true,
              website: true,
              validationLevel: true,
              kycStatus: true,
            },
          },
          verifications: {
            orderBy: { verifiedAt: 'desc' },
            take: 1,
          },
        },
      })
    }

    if (!certificate) {
      return NextResponse.json({
        status: 'NOT_FOUND',
        message: 'Certificat introuvable',
        code: 'CERTIFICATE_NOT_FOUND',
      }, { status: 404 })
    }

    // Vérifier le statut du certificat
    if (certificate.status === 'REVOKED') {
      return NextResponse.json({
        status: 'REVOKED',
        message: 'Ce certificat a été révoqué',
        code: 'CERTIFICATE_REVOKED',
        // TODO: Ajouter revokedAt et revocationReason au modèle Certificate si nécessaire
        // revokedAt: certificate.revokedAt,
        // reason: certificate.revocationReason,
      }, { status: 410 })
    }

    // Vérifier l'expiration (si expiresAt existe dans le modèle)
    // TODO: Ajouter expiresAt au modèle Certificate si nécessaire
    // if (certificate.status === 'EXPIRED' || (certificate.expiresAt && certificate.expiresAt < new Date())) {
    //   return NextResponse.json({
    //     status: 'EXPIRED',
    //     message: 'Ce certificat a expiré',
    //     code: 'CERTIFICATE_EXPIRED',
    //     expiredAt: certificate.expiresAt,
    //   }, { status: 410 })
    // }

    if (certificate.status === 'SUSPENDED') {
      return NextResponse.json({
        status: 'SUSPENDED',
        message: 'Ce certificat est temporairement suspendu',
        code: 'CERTIFICATE_SUSPENDED',
      }, { status: 403 })
    }

    // Si une signature V2 est fournie, vérifier l'intégrité
    let signatureVerification = null
    let fraudAlert = false

    if (sig) {
      const signature = await prisma.signature.findUnique({
        where: { jti: sig },
      })

      if (!signature) {
        fraudAlert = true
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_NOT_FOUND',
          message: 'Signature inconnue - possible tentative de fraude',
        }
      } else if (signature.certificateId !== certificate.id) {
        fraudAlert = true
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_MISMATCH',
          message: 'Signature ne correspond pas au certificat',
        }
      } else if (signature.expiresAt && signature.expiresAt < new Date()) {
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_EXPIRED',
          message: 'Signature expirée',
        }
      } else if (signature.revoked) {
        signatureVerification = {
          valid: false,
          reason: 'SIGNATURE_REVOKED',
          message: 'Signature révoquée',
        }
      } else if (ctx && signature.contextHash) {
        // Vérifier le hash contextuel (détection de copie)
        const expectedCtx = signature.contextHash.slice(0, 16)
        
        // Comparaison timing-safe
        const ctxBuffer = Buffer.from(ctx)
        const expectedBuffer = Buffer.from(expectedCtx)
        
        if (ctxBuffer.length !== expectedBuffer.length || !timingSafeEqual(ctxBuffer, expectedBuffer)) {
          fraudAlert = true
          signatureVerification = {
            valid: false,
            reason: 'CONTEXT_MISMATCH',
            message: 'Badge utilisé hors de son contexte original - ALERTE FRAUDE',
            // TODO: Ajouter targetUrl au modèle Signature si nécessaire
            // originalUrl: signature.targetUrl,
          }
        } else {
          signatureVerification = {
            valid: true,
            reason: 'VALID',
            message: 'Signature et contexte vérifiés',
            // TODO: Ajouter purpose et targetUrl au modèle Signature si nécessaire
            // purpose: signature.purpose,
            // targetUrl: signature.targetUrl,
          }
        }
      } else {
        signatureVerification = {
          valid: true,
          reason: 'VALID_NO_CONTEXT',
          message: 'Signature valide (contexte non vérifié)',
        }
      }
    }

    // Calculer le nombre de vérifications depuis la relation
    const verificationCount = await prisma.verification.count({
      where: { certificateId: certificate.id },
    })

    // Logger la vérification
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') || 
               'unknown'
    const hashedIp = hashIp(ip)
    const userAgent = req.headers.get('user-agent') || 'unknown'
    const referer = req.headers.get('referer')

    // Créer l'enregistrement de vérification
    await prisma.verification.create({
      data: {
        certificateId: certificate.id,
        ipHash: hashedIp, // IP hashée pour RGPD
        userAgent: userAgent.slice(0, 500),
        referer: referer || null,
        result: fraudAlert ? 'FRAUD_ALERT' : 'VALID',
        signatureJti: sig || null,
      },
    })

    // Construire la réponse
    const entityName = certificate.entity.legalName || certificate.entity.email
    const publicId = certificate.publicId || certificate.id

    const response = {
      status: fraudAlert ? 'FRAUD_ALERT' : 'VALID',
      message: fraudAlert
        ? '⚠️ ALERTE - Anomalie détectée sur ce badge'
        : '✅ Certificat authentique et valide',
      certificate: {
        id: publicId,
        level: certificate.level,
        status: certificate.status,
        issuedAt: certificate.issuedAt,
        expiresAt: null, // TODO: Ajouter expiresAt au modèle Certificate si nécessaire
        verificationCount: verificationCount + 1,
      },
      entity: {
        name: entityName,
        email: certificate.entity.email,
        siret: certificate.entity.siret,
        website: certificate.entity.website,
        logoUrl: null, // TODO: Ajouter logoUrl au modèle Entity si nécessaire
        type: null, // TODO: Ajouter entityType au modèle Entity si nécessaire
        validationLevel: certificate.entity.validationLevel,
        kycStatus: certificate.entity.kycStatus,
      },
      blockchain: certificate.txHash
        ? {
            anchored: true,
            txHash: certificate.txHash,
            blockNumber: null, // TODO: Ajouter blockNumber au modèle Certificate si nécessaire
            anchoredAt: null, // TODO: Ajouter anchoredAt au modèle Certificate si nécessaire
          }
        : { anchored: false },
      signature: signatureVerification,
      verifiedAt: new Date().toISOString(),
    }

    return NextResponse.json(response, {
      status: 200, // On retourne 200 même pour FRAUD_ALERT car le certificat existe
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error) {
    console.error('❌ Verify error:', error)
    return NextResponse.json({
      status: 'ERROR',
      message: 'Erreur de vérification',
      code: 'INTERNAL_ERROR',
    }, { status: 500 })
  }
}
