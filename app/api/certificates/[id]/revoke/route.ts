// app/api/certificates/[id]/revoke/route.ts
// API route pour révoquer un certificat
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'
import { sendEmailFireAndForget } from '@/lib/email'
import { CertificateRevokedEmail, subject as certificateRevokedSubject } from '@/emails/CertificateRevokedEmail'

const certificateIdSchema = z.string().cuid()

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Vérifier l'authentification
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

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

    // Récupérer le certificat avec l'entité (et user pour email) pour vérifier la propriété
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
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

    // Vérifier que l'entité appartient à l'utilisateur
    if (certificate.entity.userId !== user.id) {
      return NextResponse.json(
        { error: 'Non autorisé : ce certificat ne vous appartient pas' },
        { status: 403 }
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
    console.log(`[REVOKE] Certificat ${certificateId} révoqué par utilisateur ${user.id} (${user.email})`)

    // Email transactionnel : certificat révoqué
    const entityName = certificate.entity.entityType === 'INDIVIDUAL'
      ? `${certificate.entity.firstName || ''} ${certificate.entity.lastName || ''}`.trim() || certificate.entity.email
      : certificate.entity.legalName || certificate.entity.email
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech'
    const dashboardUrl = `${baseUrl}/dashboard/certificates`
    const owner = await prisma.user.findUnique({ where: { id: certificate.entity.userId } })
    if (owner?.email) {
      sendEmailFireAndForget({
        to: owner.email,
        subject: certificateRevokedSubject,
        react: CertificateRevokedEmail({
          entityName,
          revokedAt: revokedAt.toLocaleString('fr-FR'),
          revocationReason,
          dashboardUrl,
        }),
      })
    }

    return NextResponse.json({
      success: true,
      certificate: {
        id: revoked.id,
        status: revoked.status,
        revokedAt: revoked.revokedAt,
      },
    })
  } catch (error: any) {
    console.error('❌ Certificate revoke error:', error)
    return NextResponse.json(
      { error: 'Erreur lors de la révocation du certificat' },
      { status: 500 }
    )
  }
}
