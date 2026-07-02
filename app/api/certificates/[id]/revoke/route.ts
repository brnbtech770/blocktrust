// app/api/certificates/[id]/revoke/route.ts
// API route pour révoquer un certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { redactEmailRecipient, sendEmail } from '@/lib/email'
import { invalidateTrustEngineCacheForCertificate } from '@/lib/trust-engine-cache'
import { CertificateRevokedEmail, subject as certificateRevokedSubject } from '@/emails/CertificateRevokedEmail'
import { writeSecurityAuditLogFireAndForget } from '@/lib/security-audit'

const certificateIdSchema = z.string().cuid()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = session.user.id

    // Valider l'ID du certificat
    const resolvedParams = await params
    const parsed = certificateIdSchema.safeParse(resolvedParams.id)
    
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'ID de certificat invalide' },
        { status: 400 }
      )
    }

    const certificateId = parsed.data

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certificateId,
        entity: { userId },
      },
      include: {
        entity: {
          select: {
            userId: true,
            legalName: true,
            firstName: true,
            lastName: true,
            email: true,
            entityType: true,
          },
        },
      },
    })

    if (!certificate) {
      return NextResponse.json(
        { error: 'Certificat non trouvé' },
        { status: 404 }
      )
    }

    // Vérifier que le certificat n'est pas déjà révoqué
    if (certificate.status === 'REVOKED') {
      return NextResponse.json(
        { error: 'Ce certificat est déjà révoqué' },
        { status: 400 }
      )
    }

    // Révoquer le certificat
    const revokedAt = new Date()
    const revocationReason = 'Révoqué par l\'utilisateur'
    const revoked = await prisma.certificate.update({
      where: { id: certificateId },
      data: {
        status: 'REVOKED',
        revokedAt,
        revocationReason,
      },
    })

    // Logger l'événement
    console.log(`[REVOKE] Certificat ${certificateId.slice(0, 8)}… révoqué par userId=${userId.slice(0, 8)}`)

    void invalidateTrustEngineCacheForCertificate(
      certificateId,
      certificate.publicId,
    )

    // Email transactionnel : certificat révoqué
    const entityName = certificate.entity.entityType === 'INDIVIDUAL'
      ? `${certificate.entity.firstName || ''} ${certificate.entity.lastName || ''}`.trim() || certificate.entity.email
      : certificate.entity.legalName || certificate.entity.email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'
    const dashboardUrl = `${baseUrl}/dashboard/certificates`
    const owner = await prisma.user.findUnique({ where: { id: certificate.entity.userId } })
    if (owner?.email) {
      const dest = owner.email
      await sendEmail({
        to: dest,
        subject: certificateRevokedSubject,
        react: CertificateRevokedEmail({
          entityName,
          revokedAt: revokedAt.toLocaleString('fr-FR'),
          revocationReason,
          dashboardUrl,
        }),
      }).then(({ error }) => {
        if (error)
          console.error('[Certificate] Revoked email échoué:', {
            to: redactEmailRecipient(dest),
            error,
          })
        else console.log('[Certificate] Revoked notification envoyée entityUserId=', certificate.entity.userId.slice(0, 8))
      })
    }

    writeSecurityAuditLogFireAndForget({
      action: 'CERTIFICATE_REVOKED',
      userId,
      resource: 'certificate',
      resourceId: certificateId,
    })

    return NextResponse.json({
      success: true,
      certificate: {
        id: revoked.id,
        status: revoked.status,
        revokedAt: revoked.revokedAt,
      },
    })
  } catch (error: unknown) {
    console.error('❌ Certificate revoke error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la révocation du certificat' },
      { status: 500 }
    )
  }
}
