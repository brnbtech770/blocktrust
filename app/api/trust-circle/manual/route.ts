// app/api/trust-circle/manual/route.ts
// Ajouter une entrée manuelle au Trust Circle
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, checkPlanFeature } from '@/app/lib/auth'
import { prisma } from '@/app/lib/db'
import { z } from 'zod'

const manualEntrySchema = z.object({
  ownerEntityId: z.string().cuid(),
  trustedName: z.string().min(1).max(200),
  trustedEmail: z.string().email().optional(),
  trustedPhone: z.string().optional(),
  trustedDomain: z.string().optional(),
  trustedSiret: z.string().optional(),
  category: z.enum(['banque', 'fournisseur', 'client', 'partenaire', 'administration', 'autre']).optional(),
  notes: z.string().max(1000).optional(),
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
    const parsed = manualEntrySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { ownerEntityId, trustedName, trustedEmail, trustedPhone, trustedDomain, trustedSiret, category, notes } = parsed.data

    // Vérifier si Trust Circle est activé pour ce plan
    const userPlan = user.plan || (user as any).plan // Support ancien et nouveau format
    if (!checkPlanFeature(userPlan, 'trustCircle')) {
      return NextResponse.json(
        { error: 'Trust Circle non disponible avec votre plan', code: 'PLAN_LIMIT' },
        { status: 403 }
      )
    }

    // Vérifier que l'entité appartient à l'utilisateur
    const ownerEntity = await prisma.entity.findFirst({
      where: { id: ownerEntityId, userId: user.id },
    })

    if (!ownerEntity) {
      return NextResponse.json(
        { error: 'Entité non trouvée ou non autorisée' },
        { status: 404 }
      )
    }

    // Vérifier les limites du plan (nombre d'entités Trust Circle)
    const currentCount = await prisma.manualTrustEntry.count({
      where: { ownerId: ownerEntityId },
    })

    // Récupérer les limites depuis le plan (nouveau système) ou fallback
    let maxEntities = 20
    if (userPlan && typeof userPlan === 'object' && 'maxEntities' in userPlan) {
      maxEntities = (userPlan as any).maxEntities || 20
    } else {
      // Fallback: ancien système
      const planLimits: Record<string, number> = {
        FAMILLE: 20,
        "FAMILLE_PLUS": 100,
        TEAM: 50,
        BUSINESS: 200,
        ENTERPRISE: 999999,
      }
      const planType = typeof userPlan === 'string' ? userPlan : 'ESSENTIEL'
      maxEntities = planLimits[planType] || 20
    }

    if (currentCount >= maxEntities) {
      return NextResponse.json(
        { 
          error: `Limite atteinte (${maxEntities} entrées max)`,
          code: 'LIMIT_REACHED',
          current: currentCount,
          max: maxEntities,
        },
        { status: 403 }
      )
    }

    // Vérifier si une entrée similaire existe déjà
    if (trustedEmail || trustedDomain || trustedSiret) {
      const existing = await prisma.manualTrustEntry.findFirst({
        where: {
          ownerId: ownerEntityId,
          OR: [
            trustedEmail ? { trustedEmail } : {},
            trustedDomain ? { trustedDomain } : {},
            trustedSiret ? { trustedSiret } : {},
          ].filter(obj => Object.keys(obj).length > 0),
        },
      })

      if (existing) {
        return NextResponse.json(
          { error: 'Une entrée similaire existe déjà', code: 'ALREADY_EXISTS' },
          { status: 409 }
        )
      }
    }

    // Créer l'entrée manuelle
    const entry = await prisma.manualTrustEntry.create({
      data: {
        ownerId: ownerEntityId,
        trustedName,
        trustedEmail,
        trustedPhone,
        trustedDomain,
        trustedSiret,
        category,
        notes,
        emailVerified: false,
        domainVerified: false,
      },
    })

    return NextResponse.json({
      success: true,
      entry: {
        id: entry.id,
        trustedName: entry.trustedName,
        trustedEmail: entry.trustedEmail,
        category: entry.category,
        createdAt: entry.createdAt,
      },
    })
  } catch (error) {
    console.error('❌ Trust Circle manual entry error:', error)
    return NextResponse.json(
      { error: 'Erreur ajout entrée manuelle' },
      { status: 500 }
    )
  }
}
