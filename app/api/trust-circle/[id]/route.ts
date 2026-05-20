// app/api/trust-circle/[id]/route.ts
// Supprimer une relation Trust Circle
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser, checkPlanFeature } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'

const deleteBodySchema = z
  .object({
    type: z.enum(['manual', 'mutual', 'relation']).optional(),
  })
  .strict()

interface RouteParams {
  params: Promise<{ id: string }>
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params
    const user = await getAuthUser(req)
    if (!user?.email) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    let typeFromBody: string | undefined
    try {
      const json = await req.json()
      const parsed = deleteBodySchema.safeParse(json)
      if (!parsed.success) {
        return NextResponse.json({ error: 'Corps invalide' }, { status: 400 })
      }
      typeFromBody = parsed.data.type
    } catch {
      typeFromBody = undefined
    }
    const type =
      typeFromBody || new URL(req.url).searchParams.get('type') || 'mutual'

    // User-centric — body attendu : { type: 'manual' } | { type: 'relation' }
    // (alias historique : 'mutual' = même traitement que 'relation')

    // UserManualTrustEntry
    if (type === 'manual') {
      const userEntry = await prisma.userManualTrustEntry.findFirst({
        where: { id, requestedBy: user.id },
      })
      if (userEntry) {
        await prisma.userManualTrustEntry.delete({ where: { id } })
        return NextResponse.json({ success: true, deletedCount: 1, type: 'manual' })
      }
    }

    // UserTrustRelation (mutuel, unilatéral, invitation PENDING, etc.)
    if (type === 'mutual' || type === 'relation') {
      const userRel = await prisma.userTrustRelation.findFirst({
        where: { id, fromUserId: user.id },
      })
      if (userRel) {
        await prisma.userTrustRelation.delete({ where: { id } })
        return NextResponse.json({ success: true, deletedCount: 1, type: 'mutual' })
      }
    }

    // Legacy: Entity-based
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
    const userEntities = await prisma.entity.findMany({
      where: { userId: user.id },
      select: { id: true },
    })
    const entityIds = userEntities.map((e) => e.id)

    if (type === 'manual') {
      const entry = await prisma.manualTrustEntry.findUnique({ where: { id } })
      if (!entry) return NextResponse.json({ error: 'Entrée non trouvée' }, { status: 404 })
      if (!entityIds.includes(entry.ownerId)) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
      }
      await prisma.manualTrustEntry.delete({ where: { id } })
      return NextResponse.json({ success: true, deletedCount: 1, type: 'manual' })
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
