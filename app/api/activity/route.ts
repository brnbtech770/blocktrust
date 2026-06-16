// app/api/activity/route.ts
// GET /api/activity?limit=10 — Dernières vérifications (VerificationEvent[])
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { formatCertificateLabel } from '@/lib/format-certificate-label'
import type { VerificationEvent } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

export async function GET(
  req: NextRequest
): Promise<NextResponse<VerificationEvent[] | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const userId = session.user.id

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    )

    const verifications = await prisma.verification.findMany({
      where: {
        certificateId: { not: null },
        certificate: { entity: { userId } },
      },
      include: {
        certificate: {
          select: {
            id: true,
            publicId: true,
            entity: {
              select: {
                entityType: true,
                firstName: true,
                lastName: true,
                legalName: true,
                tradeName: true,
                email: true,
              },
            },
          },
        },
      },
      orderBy: { verifiedAt: 'desc' },
      take: limit,
    })

    const events: VerificationEvent[] = verifications.map((v) => {
      const cert = v.certificate
      const formatted = cert
        ? formatCertificateLabel({
            id: cert.id,
            publicId: cert.publicId,
            entity: cert.entity,
          })
        : null
      return {
        id: v.id,
        certificateId: v.certificateId,
        certificatePublicId: cert?.publicId ?? null,
        certificateLabel: formatted?.label ?? null,
        certificateFullCode: formatted?.fullCode ?? null,
        result: v.result,
        verifiedAt: v.verifiedAt.toISOString(),
        country: v.country ?? undefined,
      }
    })

    return NextResponse.json(events)
  } catch (e) {
    console.error('[API activity]', e)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de l\'activité' },
      { status: 500 }
    )
  }
}
