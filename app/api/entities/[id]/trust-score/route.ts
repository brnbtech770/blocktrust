// app/api/entities/[id]/trust-score/route.ts
// Récupère le TrustScore d'une entité
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const resolvedParams = await params
    const entityId = resolvedParams.id

    // Vérifier que l'entité appartient à l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    })

    if (!user) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const entity = await prisma.entity.findFirst({
      where: {
        id: entityId,
        userId: user.id,
      },
    })

    if (!entity) {
      return NextResponse.json({ error: 'Entité non trouvée' }, { status: 404 })
    }

    // Récupérer le TrustScore
    const trustScore = await prisma.trustScore.findUnique({
      where: { entityId: entity.id },
    })

    if (!trustScore) {
      // Retourner un TrustScore par défaut si non trouvé
      return NextResponse.json({
        score: 50,
        level: 'STANDARD',
      })
    }

    return NextResponse.json({
      score: trustScore.score,
      level: trustScore.level,
    })
  } catch (error) {
    console.error('❌ TrustScore fetch error:', error)
    return NextResponse.json(
      { error: 'Erreur récupération TrustScore' },
      { status: 500 }
    )
  }
}
