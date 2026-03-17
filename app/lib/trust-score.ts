// app/lib/trust-score.ts
// Calcul et gestion du TrustScore
// ============================================================

import { prisma } from './db'

/**
 * Calcule le TrustScore d'une entité
 * Score global (0-100) composé de :
 * - kycScore (0-25) : Documents vérifiés
 * - historyScore (0-25) : Ancienneté, activité
 * - interactionScore (0-20) : Relations Trust Circle
 * - behaviorScore (0-15) : Comportement normal
 * - networkScore (0-15) : Qualité du réseau
 */
export async function calculateTrustScore(entityId: string): Promise<{
  score: number
  kycScore: number
  historyScore: number
  interactionScore: number
  behaviorScore: number
  networkScore: number
  penalties: number
  level: 'UNVERIFIED' | 'STANDARD' | 'TRUSTED' | 'HIGHLY_TRUSTED' | 'ELITE'
}> {
  const entity = await prisma.entity.findUnique({
    where: { id: entityId },
    include: {
      certificates: {
        include: {
          verifications: true,
        },
      },
      trustScore: true,
    },
  })

  if (!entity) {
    throw new Error('Entité non trouvée')
  }

  // ─────────────────────────────────────────────
  // KYC Score (0-25)
  // ─────────────────────────────────────────────
  let kycScore = 0
  if (entity.kycStatus === 'VERIFIED') {
    kycScore += 15
  } else if (entity.kycStatus === 'IN_PROGRESS') {
    kycScore += 5
  }

  if (entity.emailVerified) kycScore += 3
  if (entity.phoneVerified) kycScore += 2
  if (entity.domainVerified) kycScore += 5

  // ─────────────────────────────────────────────
  // History Score (0-25)
  // ─────────────────────────────────────────────
  const daysSinceCreation = Math.floor(
    (Date.now() - entity.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  let historyScore = Math.min(daysSinceCreation / 2, 15) // Max 15 points pour ancienneté

  // Points pour activité (vérifications)
  const totalVerifications = entity.certificates.reduce(
    (sum, cert) => sum + (cert.verificationCount || 0),
    0
  )
  historyScore += Math.min(totalVerifications / 10, 10) // Max 10 points pour vérifications

  // ─────────────────────────────────────────────
  // Interaction Score (0-20)
  // ─────────────────────────────────────────────
  const trustRelations = await prisma.trustRelation.count({
    where: {
      OR: [
        { requesterId: entityId, status: 'ACCEPTED' },
        { requesteeId: entityId, status: 'ACCEPTED' },
      ],
    },
  })
  const interactionScore = Math.min(trustRelations * 2, 20) // 2 points par relation, max 20

  // ─────────────────────────────────────────────
  // Behavior Score (0-15)
  // ─────────────────────────────────────────────
  let behaviorScore = 15 // Score par défaut
  // Pénalités pour comportements suspects
  const alerts = await prisma.aIAlert.count({
    where: {
      entityId,
      status: { not: 'DISMISSED' },
      severity: { in: ['HIGH', 'CRITICAL'] },
    },
  })
  behaviorScore -= alerts * 3 // -3 points par alerte grave

  // ─────────────────────────────────────────────
  // Network Score (0-15)
  // ─────────────────────────────────────────────
  let networkScore = 0
  // Points pour relations avec entités de confiance
  const trustedRelations = await prisma.trustRelation.findMany({
    where: {
      OR: [
        { requesterId: entityId, status: 'ACCEPTED' },
        { requesteeId: entityId, status: 'ACCEPTED' },
      ],
    },
    include: {
      requester: {
        include: { trustScore: true },
      },
      requestee: {
        include: { trustScore: true },
      },
    },
  })

  for (const relation of trustedRelations) {
    const otherEntity = relation.requesterId === entityId ? relation.requestee : relation.requester
    if (otherEntity.trustScore && otherEntity.trustScore.score >= 70) {
      networkScore += 2 // +2 points pour relation avec entité de confiance
    } else if (otherEntity.trustScore && otherEntity.trustScore.score >= 50) {
      networkScore += 1 // +1 point pour relation standard
    }
  }
  networkScore = Math.min(networkScore, 15)

  // ─────────────────────────────────────────────
  // Pénalités
  // ─────────────────────────────────────────────
  let penalties = 0
  const revokedCertificates = entity.certificates.filter(
    (cert) => cert.status === 'REVOKED'
  ).length
  penalties += revokedCertificates * 5 // -5 points par certificat révoqué

  // ─────────────────────────────────────────────
  // Score total
  // ─────────────────────────────────────────────
  const totalScore = Math.max(
    0,
    Math.min(
      100,
      kycScore + historyScore + interactionScore + behaviorScore + networkScore - penalties
    )
  )

  // ─────────────────────────────────────────────
  // Niveau
  // ─────────────────────────────────────────────
  let level: 'UNVERIFIED' | 'STANDARD' | 'TRUSTED' | 'HIGHLY_TRUSTED' | 'ELITE'
  if (totalScore >= 81) {
    level = 'ELITE'
  } else if (totalScore >= 61) {
    level = 'HIGHLY_TRUSTED'
  } else if (totalScore >= 41) {
    level = 'TRUSTED'
  } else if (totalScore >= 21) {
    level = 'STANDARD'
  } else {
    level = 'UNVERIFIED'
  }

  return {
    score: Math.round(totalScore),
    kycScore: Math.round(kycScore),
    historyScore: Math.round(historyScore),
    interactionScore: Math.round(interactionScore),
    behaviorScore: Math.round(behaviorScore),
    networkScore: Math.round(networkScore),
    penalties,
    level,
  }
}

/**
 * Met à jour le TrustScore d'une entité
 */
export async function updateTrustScore(entityId: string): Promise<void> {
  const calculated = await calculateTrustScore(entityId)
  const existing = await prisma.trustScore.findUnique({
    where: { entityId },
  })

  if (existing) {
    await prisma.trustScore.update({
      where: { entityId },
      data: {
        ...calculated,
        previousScore: existing.score,
        lastCalculated: new Date(),
      },
    })
  } else {
    await prisma.trustScore.create({
      data: {
        entityId,
        ...calculated,
        lastCalculated: new Date(),
      },
    })
  }
}
