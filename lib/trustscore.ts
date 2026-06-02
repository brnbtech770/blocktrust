/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// Calcul et persistance du TrustScore utilisateur (0–100), distinct du TrustScore entité.
// ============================================================

import { prisma } from '@/app/lib/db'

export async function computeTrustScore(userId: string): Promise<number> {
  let score = 0

  const kyc = await prisma.kYCVerification.findFirst({
    where: { userId, status: 'VERIFIED' },
  })
  if (kyc) score += 30

  const sub = await prisma.subscription.findUnique({
    where: { userId },
  })
  if (sub?.status === 'active') score += 15

  const cert = await prisma.certificate.findFirst({
    where: {
      entity: { userId },
      status: 'ACTIVE',
    },
  })
  if (cert) score += 20

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true, cguAcceptedAt: true },
  })
  if (user) {
    const ageMonths = Math.floor(
      (Date.now() - user.createdAt.getTime()) / (1000 * 60 * 60 * 24 * 30)
    )
    score += Math.min(ageMonths, 10)
    if (user.cguAcceptedAt) score += 5
  }

  // Une entrée par sens ; on compte les liens sortants mutuels pour ne pas doubler la paire A↔B.
  const trustRelations = await prisma.userTrustRelation.count({
    where: { fromUserId: userId, isMutual: true },
  })
  score += Math.min(trustRelations, 15)

  const fraudAlerts = await prisma.adminAlert.count({
    where: {
      userId,
      type: 'FRAUD_ALERT',
      read: false,
    },
  })
  score -= fraudAlerts * 10

  return Math.max(0, Math.min(100, score))
}

export async function persistUserTrustScore(userId: string): Promise<number> {
  const score = await computeTrustScore(userId)
  await prisma.user.update({
    where: { id: userId },
    data: { trustScore: score, trustScoreAt: new Date() },
  })
  return score
}

export function getTrustScoreLabel(score: number): string {
  if (score >= 80) return 'TRUSTED'
  if (score >= 50) return 'VERIFIED'
  if (score >= 25) return 'LOW'
  return 'UNVERIFIED'
}

/** Libellé TrustScore affiché à l'utilisateur (FR). Jamais « UNVERIFIED » brut ni de négatif. */
export function getTrustScoreLabelFr(score: number): string {
  const s = Math.max(0, score)
  if (s >= 80) return 'Excellent'
  if (s >= 50) return 'Vérifié'
  if (s >= 25) return 'Faible'
  return 'Non vérifié'
}

export function getTrustScoreColor(score: number): string {
  if (score >= 80) return '#00d4ff'
  if (score >= 50) return '#BDA76B'
  if (score >= 25) return '#f59e0b'
  return '#6b7280'
}
