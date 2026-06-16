/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Accès BIS — gate plan + certificat ancré.
 */
import { isInternalAccount } from '@/lib/admin-utils'
import {
  isActiveBillingStatus,
  isDiscoveryExpired,
  isDiscoveryPlan,
  isNotAnchored,
} from '@/lib/plan-features'

export const BIS_INTERACTION_TYPES = [
  'EMAIL',
  'DOCUMENT',
  'PAYMENT_REQUEST',
  'CONTRACT',
  'MARKETPLACE',
] as const

export type BisInteractionType = (typeof BIS_INTERACTION_TYPES)[number]

export const BIS_SENSITIVE_TYPES = new Set<BisInteractionType>([
  'PAYMENT_REQUEST',
  'CONTRACT',
])

export const BIS_DEFAULT_TTL_SECONDS = 86400 * 7

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export function isValidContentHash(hash: string): boolean {
  return /^[a-f0-9]{64}$/i.test(hash.trim())
}

/** Plan payant (hors Découverte) — requis pour signer une interaction BIS. */
export function canCreateBisSignature(params: {
  effectivePlan: string
  subscriptionStatus?: string | null
  email?: string | null
}): boolean {
  if (params.email && isInternalAccount(params.email)) return true
  if (isDiscoveryPlan(params.effectivePlan) || isDiscoveryExpired(params.effectivePlan)) {
    return false
  }
  return isActiveBillingStatus(params.subscriptionStatus)
}

/** Certificat éligible : ACTIVE/ANCHORED + ancré Polygon (pas NOT_ANCHORED). */
export function isCertificateBisEligible(cert: {
  status: string
  blockchainStatus?: string | null
  polygonTxHash?: string | null
  revokedAt?: Date | null
}): boolean {
  if (cert.revokedAt) return false
  if (cert.status !== 'ACTIVE' && cert.status !== 'ANCHORED') return false
  if (isNotAnchored(cert.blockchainStatus)) return false
  return cert.blockchainStatus === 'ANCHORED' || Boolean(cert.polygonTxHash)
}

export function getBisLevelLabel(level: number): string {
  switch (level) {
    case 0:
      return 'Contact inconnu'
    case 1:
      return 'Contact référencé — Identité non vérifiée'
    case 2:
      return 'Identité vérifiée'
    case 3:
      return 'Interaction signée et vérifiée'
    case 4:
      return 'Opération sensible — Vérification renforcée requise'
    default:
      return 'Niveau BIS inconnu'
  }
}
