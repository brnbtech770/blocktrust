// app/api/trust-circle/invite/route.ts
// Envoie une invitation Trust Circle
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { resolveEffectivePlan, planAllowsTrustCircle } from '@/lib/plan-features'
import { z } from 'zod'

const inviteSchema = z.object({
  fromEntityId: z.string().cuid(),
  toEmail: z.string().email(),
  relationshipType: z.enum(['client', 'fournisseur', 'partenaire', 'autre']).optional(),
  message: z.string().max(500).optional(),
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
    const parsed = inviteSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { fromEntityId, toEmail, relationshipType, message } = parsed.data

    // Trust Circle réservé à Premium et plus (plan effectif, statut Stripe inclus).
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
      select: { plan: true, status: true },
    })
    const userPlan = resolveEffectivePlan({ subscription, email: user.email })
    if (!planAllowsTrustCircle(userPlan)) {
      return NextResponse.json(
        { error: 'Trust Circle non disponible avec votre plan', code: 'PLAN_LIMIT' },
        { status: 403 }
      )
    }

    // Vérifier que l'entité appartient à l'utilisateur
    const fromEntity = await prisma.entity.findFirst({
      where: { id: fromEntityId, userId: user.id },
    })

    if (!fromEntity) {
      return NextResponse.json(
        { error: 'Entité non trouvée ou non autorisée' },
        { status: 404 }
      )
    }

    // Chercher l'entité destinataire par email
    const toEntity = await prisma.entity.findFirst({
      where: { email: toEmail },
    })

    if (!toEntity) {
      return NextResponse.json(
        { 
          error: 'Aucune entité BLOCKTRUST™ trouvée avec cet email. Utilisez l\'ajout manuel.',
          code: 'NOT_FOUND',
          suggestion: 'manual'
        },
        { status: 404 }
      )
    }

    // Vérifier si une relation existe déjà
    const existingRelation = await prisma.trustRelation.findFirst({
      where: {
        OR: [
          { requesterId: fromEntityId, requesteeId: toEntity.id },
          { requesterId: toEntity.id, requesteeId: fromEntityId },
        ],
      },
    })

    if (existingRelation) {
      return NextResponse.json(
        { error: 'Une relation existe déjà avec cette entité', code: 'ALREADY_EXISTS' },
        { status: 409 }
      )
    }

    // Créer la relation
    const relation = await prisma.trustRelation.create({
      data: {
        requesterId: fromEntityId,
        requesteeId: toEntity.id,
        status: 'PENDING',
        relationshipType,
        message,
      },
      include: {
        requestee: {
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

    // TODO: Envoyer un email de notification

    return NextResponse.json({
      success: true,
      relation: {
        id: relation.id,
        status: relation.status,
        toEntity: relation.requestee,
        createdAt: relation.createdAt,
      },
      message: 'Invitation créée (modèle TrustRelation à créer dans Prisma)',
    })
  } catch (error) {
    console.error('❌ Trust Circle invite error:', error)
    return NextResponse.json(
      { error: 'Erreur envoi invitation' },
      { status: 500 }
    )
  }
}
