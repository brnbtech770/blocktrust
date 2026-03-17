// app/api/trust-circle/[id]/route.ts
// Supprimer une relation Trust Circle
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, checkPlanFeature } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Vérifier l'authentification
    // TODO: Remplacer par getServerSession(authOptions) quand NextAuth sera implémenté
    const user = await getAuthUser(req)
    
    if (!user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    // Vérifier si Trust Circle est activé pour ce plan
    const userPlan = user.plan || (user as any).plan // Support ancien et nouveau format
    if (!checkPlanFeature(userPlan, 'trustCircle')) {
      return NextResponse.json(
        { error: 'Trust Circle non disponible avec votre plan', code: 'PLAN_LIMIT' },
        { status: 403 }
      )
    }

    // Récupérer les entités de l'utilisateur
    const userEntities = await prisma.entity.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    const entityIds = userEntities.map((e) => e.id)

    // Déterminer le type de relation (TrustRelation ou ManualTrustEntry)
    const { searchParams } = new URL(req.url)
    const type = searchParams.get('type') || 'mutual'

    if (type === 'manual') {
      // Supprimer une entrée manuelle
      const entry = await prisma.manualTrustEntry.findUnique({
        where: { id },
      })

      if (!entry) {
        return NextResponse.json({ error: 'Entrée non trouvée' }, { status: 404 })
      }

      // Vérifier que l'utilisateur est propriétaire
      if (!entityIds.includes(entry.ownerId)) {
        return NextResponse.json(
          { error: 'Vous n\'êtes pas autorisé à supprimer cette entrée' },
          { status: 403 }
        )
      }

      await prisma.manualTrustEntry.delete({
        where: { id },
      })

      return NextResponse.json({ 
        success: true, 
        deletedCount: 1,
        type: 'manual',
      })
    } else {
      // Supprimer/Révoquer une relation mutuelle
      const relation = await prisma.trustRelation.findUnique({
        where: { id },
      })

      if (!relation) {
        return NextResponse.json({ error: 'Relation non trouvée' }, { status: 404 })
      }

      // Vérifier que l'utilisateur est impliqué dans la relation
      const isRequester = entityIds.includes(relation.requesterId)
      const isRequestee = entityIds.includes(relation.requesteeId)

      if (!isRequester && !isRequestee) {
        return NextResponse.json(
          { error: 'Vous n\'êtes pas autorisé à supprimer cette relation' },
          { status: 403 }
        )
      }

      // Si la relation est PENDING et l'utilisateur est le requester, on supprime
      // Sinon on révoque (REVOKED)
      if (relation.status === 'PENDING' && isRequester) {
        await prisma.trustRelation.delete({
          where: { id },
        })
        return NextResponse.json({ success: true, deletedCount: 1, type: 'mutual' })
      } else {
        // Révoquer la relation
        await prisma.trustRelation.update({
          where: { id },
          data: {
            status: 'REVOKED',
            revokedAt: new Date(),
            revokedBy: isRequester ? relation.requesterId : relation.requesteeId,
          },
        })
        return NextResponse.json({ success: true, revoked: true, type: 'mutual' })
      }
    }
  } catch (error) {
    console.error('❌ Trust Circle delete error:', error)
    return NextResponse.json(
      { error: 'Erreur suppression relation' },
      { status: 500 }
    )
  }
}
