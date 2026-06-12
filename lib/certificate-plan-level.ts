// lib/certificate-plan-level.ts
// Niveau certificat / entité aligné sur les plans (plus de BRONZE/SILVER/GOLD).
// ============================================================

import type { ValidationLevel } from '@prisma/client'
import { getPlanDisplayLabel, resolveEffectivePlan } from '@/lib/plan-features'

/** Normalise un code plan (court ou préfixé) vers un ValidationLevel Prisma. */
export function normalizePlanToCertificateLevel(plan?: string | null): ValidationLevel {
  const key = (plan ?? '')
    .trim()
    .toUpperCase()
    .replace(/-/g, '_')
    .replace(/\s+/g, '_')
    .replace(/^B2C_/, '')
    .replace(/^B2B_/, '')

  switch (key) {
    case 'DISCOVERY':
    case 'DISCOVERY_EXPIRED':
      return 'DISCOVERY'
    case 'ESSENTIEL':
      return 'ESSENTIEL'
    case 'PREMIUM':
      return 'PREMIUM'
    case 'FAMILLE':
    case 'FAMILLE_PLUS':
      return 'FAMILLE'
    case 'STARTER':
    case 'SOLO_PRO':
      return 'STARTER'
    case 'TEAM':
    case 'BUSINESS':
      return 'TEAM'
    case 'ENTERPRISE':
      return 'ENTERPRISE'
    default:
      return 'DISCOVERY'
  }
}

export function deriveCertificateLevelFromPlan(plan?: string | null): ValidationLevel {
  return normalizePlanToCertificateLevel(plan)
}

export function deriveCertificateLevelForUser(params: {
  subscription?: { plan?: string | null; status?: string | null } | null
  email?: string | null
}): ValidationLevel {
  const effective = resolveEffectivePlan(params)
  return normalizePlanToCertificateLevel(effective)
}

/** Libellé affiché (Essentiel, Premium, Découverte…) — jamais le code brut. */
export function getCertificateLevelDisplayLabel(
  level: string,
  _effectivePlan?: string | null,
): string {
  return getPlanDisplayLabel(level)
}

export function getValidationLevelLabel(level: string): string {
  return getCertificateLevelDisplayLabel(level)
}

/** Couleurs d’accent par plan (charte BLOCKTRUST). */
export function getValidationLevelAccentClass(level: string): string {
  switch (level) {
    case 'DISCOVERY':
      return 'text-white/60'
    case 'ESSENTIEL':
      return 'text-bt-cyan'
    case 'PREMIUM':
      return 'text-sky-300'
    case 'FAMILLE':
      return 'text-[#BDA76B]'
    case 'STARTER':
      return 'text-bt-cyan'
    case 'TEAM':
      return 'text-sky-300'
    case 'ENTERPRISE':
      return 'text-[#BDA76B]'
    default:
      return 'text-white/70'
  }
}

/** Classes badge pill (fond + texte) pour la page badge publique. */
export function getValidationLevelBadgeClass(level: string): string {
  switch (level) {
    case 'DISCOVERY':
      return 'bg-white/10 text-white/70'
    case 'ESSENTIEL':
    case 'STARTER':
      return 'bg-cyan-500/20 text-cyan-400'
    case 'PREMIUM':
    case 'TEAM':
      return 'bg-sky-500/20 text-sky-300'
    case 'FAMILLE':
    case 'ENTERPRISE':
      return 'bg-[#BDA76B]/20 text-[#BDA76B]'
    default:
      return 'bg-orange-500/20 text-orange-400'
  }
}
