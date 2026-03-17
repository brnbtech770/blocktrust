// app/api/activity/route.ts
// GET /api/activity?limit=10 — Dernières vérifications (VerificationEvent[])
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import type { VerificationEvent } from '@/types/dashboard'

export const dynamic = 'force-dynamic'

const DEFAULT_LIMIT = 10
const MAX_LIMIT = 50

export async function GET(
  req: NextRequest
): Promise<NextResponse<VerificationEvent[] | { error: string }>> {
  try {
    const session = await auth()
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })
    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10) || DEFAULT_LIMIT,
      MAX_LIMIT
    )

    const verifications = await prisma.verification.findMany({
      where: {
        certificate: { entity: { userId: user.id } },
      },
      include: {
        certificate: { select: { publicId: true } },
      },
      orderBy: { verifiedAt: 'desc' },
      take: limit,
    })

    const events: VerificationEvent[] = verifications.map((v) => ({
      id: v.id,
      certificateId: v.certificateId,
      certificatePublicId: v.certificate.publicId,
      result: v.result,
      verifiedAt: v.verifiedAt.toISOString(),
      country: v.country ?? undefined,
    }))

    return NextResponse.json(events)
  } catch (e) {
    console.error('[API activity]', e)
    return NextResponse.json(
      { error: 'Erreur lors du chargement de l\'activité' },
      { status: 500 }
    )
  }
}
