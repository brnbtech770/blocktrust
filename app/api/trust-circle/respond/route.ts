// app/api/trust-circle/respond/route.ts
// Accepter ou refuser une invitation Trust Circle
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, checkPlanFeature } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'

const respondSchema = z.object({
  relationId: z.string().cuid(),
  action: z.enum(['accept', 'reject']),
})

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
    const parsed = respondSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { relationId, action } = parsed.data

    // Vérifier si Trust Circle est activé pour ce plan
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true },
    })
    const userPlan = user.plan ?? subscription?.plan ?? 'ESSENTIEL'
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

    // Récupérer la relation
    const relation = await prisma.trustRelation.findUnique({
      where: { id: relationId },
    })

    if (!relation) {
      return NextResponse.json({ error: 'Relation non trouvée' }, { status: 404 })
    }

    // Vérifier que l'utilisateur est bien le destinataire (requestee)
    if (!entityIds.includes(relation.requesteeId)) {
      return NextResponse.json(
        { error: 'Vous n\'êtes pas autorisé à répondre à cette invitation' },
        { status: 403 }
      )
    }

    // Vérifier que la relation est en attente
    if (relation.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'Cette invitation a déjà été traitée' },
        { status: 400 }
      )
    }

    // Mettre à jour la relation
    const updatedRelation = await prisma.trustRelation.update({
      where: { id: relationId },
      data: {
        status: action === 'accept' ? 'ACCEPTED' : 'REJECTED',
        respondedAt: new Date(),
      },
      include: {
        requester: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    // TODO: Envoyer un email de notification au demandeur

    return NextResponse.json({
      success: true,
      relation: {
        id: updatedRelation.id,
        status: updatedRelation.status,
        fromEntity: updatedRelation.requester,
        respondedAt: updatedRelation.respondedAt,
      },
    })
  } catch (error) {
    console.error('❌ Trust Circle respond error:', error)
    return NextResponse.json(
      { error: 'Erreur traitement réponse' },
      { status: 500 }
    )
  }
}
