// app/api/trust-circle/route.ts
// Liste les relations de confiance de l'utilisateur
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, checkPlanFeature } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'

export async function GET(req: NextRequest) {
  try {
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

    // Récupérer les relations mutuelles (TrustRelation)
    const mutualRelations = await prisma.trustRelation.findMany({
      where: {
        OR: [
          { requesterId: { in: entityIds } },
          { requesteeId: { in: entityIds } },
        ],
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
            logoUrl: true,
            entityType: true,
          },
        },
        requestee: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            email: true,
            logoUrl: true,
            entityType: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Récupérer les entrées manuelles (ManualTrustEntry)
    const manualEntries = await prisma.manualTrustEntry.findMany({
      where: { ownerId: { in: entityIds } },
      orderBy: { createdAt: 'desc' },
    })

    // Formater les données
    const relations = mutualRelations.map((rel) => {
      const isRequester = entityIds.includes(rel.requesterId)
      const otherParty = isRequester ? rel.requestee : rel.requester
      const displayName = otherParty.legalName || otherParty.tradeName || `${otherParty.firstName || ''} ${otherParty.lastName || ''}`.trim() || otherParty.email
      
      return {
        id: rel.id,
        type: 'mutual' as const,
        status: rel.status,
        direction: isRequester ? 'outgoing' : 'incoming',
        otherParty: {
          id: otherParty.id,
          name: displayName,
          email: otherParty.email,
          logoUrl: otherParty.logoUrl,
          entityType: otherParty.entityType,
        },
        relationshipType: rel.relationshipType,
        message: rel.message,
        createdAt: rel.createdAt,
        respondedAt: rel.respondedAt,
      }
    })

    const manual = manualEntries.map((entry) => ({
      id: entry.id,
      type: 'manual' as const,
      name: entry.trustedName,
      email: entry.trustedEmail,
      phone: entry.trustedPhone,
      domain: entry.trustedDomain,
      siret: entry.trustedSiret,
      category: entry.category,
      notes: entry.notes,
      emailVerified: entry.emailVerified,
      domainVerified: entry.domainVerified,
      createdAt: entry.createdAt,
    }))

    // Stats
    const stats = {
      totalMutual: relations.filter((r) => r.status === 'ACCEPTED').length,
      totalManual: manual.length,
      pending: relations.filter((r) => r.status === 'PENDING').length,
    }

    return NextResponse.json({
      relations,
      manual,
      stats,
    })
  } catch (error) {
    console.error('❌ Trust Circle list error:', error)
    return NextResponse.json(
      { error: 'Erreur récupération Trust Circle' },
      { status: 500 }
    )
  }
}
