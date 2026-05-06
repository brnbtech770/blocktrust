// GET : score en base (session) — POST : recalcul + persistance.
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import {
  computeTrustScore,
  getTrustScoreColor,
  getTrustScoreLabel,
} from '@/lib/trustscore'
import { ensureStrictEmptyBody } from '@/lib/api-json-body'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { trustScore: true, trustScoreAt: true },
  })
  if (!user) {
    return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
  }

  const score = user.trustScore
  return NextResponse.json({
    score,
    label: getTrustScoreLabel(score),
    color: getTrustScoreColor(score),
    trustScoreAt: user.trustScoreAt?.toISOString() ?? null,
  })
}

export async function POST(req: NextRequest) {
  const invalid = await ensureStrictEmptyBody(req)
  if (invalid) return invalid

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const score = await computeTrustScore(session.user.id)

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      trustScore: score,
      trustScoreAt: new Date(),
    },
  })

  return NextResponse.json({
    score,
    label: getTrustScoreLabel(score),
    color: getTrustScoreColor(score),
  })
}
