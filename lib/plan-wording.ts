// lib/plan-wording.ts
// Libellés dashboard / paramètres / quotas coordonnées certifiées selon le plan
// ============================================================

export type PlanWording = {
  dashboardTitle: string
  badgeLabel: string
  contactsLabel: string
  contactsLimit: string
  usersLabel: string | null
  vaultLabel: string | null
  canCertifyDomains: boolean
  canCertifyMultipleEmails: boolean
  maxCertifiedEmails: number
  maxCertifiedPhones: number
  maxCertifiedDomains: number
}

/** Clés Stripe / Subscription courtes → enums Prisma PlanType */
const SHORT_B2C: Record<string, string> = {
  ESSENTIEL: 'B2C_ESSENTIEL',
  PREMIUM: 'B2C_PREMIUM',
  FAMILLE: 'B2C_FAMILLE',
  FAMILLE_PLUS: 'B2C_FAMILLE_PLUS',
}

const SHORT_B2B: Record<string, string> = {
  SOLO_PRO: 'B2B_SOLO_PRO',
  STARTER: 'B2B_STARTER',
  TEAM: 'B2B_TEAM',
  BUSINESS: 'B2B_BUSINESS',
  ENTERPRISE: 'B2B_ENTERPRISE',
}

function isBillingLiveStatus(status: string | null | undefined): boolean {
  if (!status) return false
  const s = status.trim().toLowerCase()
  return s === 'active' || s === 'trialing'
}

export function normalizePlanKey(raw: string): string {
  const p = raw.trim().toUpperCase().replace(/\s+/g, '_')
  if (p.startsWith('B2C_') || p.startsWith('B2B_')) return p
  return SHORT_B2C[p] ?? SHORT_B2B[p] ?? p
}

/**
 * Résolution du plan pour libellés et quotas UI.
 * Si l’abonnement Stripe est actif / en essai, on fait confiance à `subscription.plan`
 * (source facturation) — évite un `User.planId` désynchronisé qui masquerait ex. Enterprise.
 */
export function resolvePlanKeyForWording(params: {
  planType?: string | null
  subscriptionPlan?: string | null
  subscriptionStatus?: string | null
}): string {
  const subPlan = params.subscriptionPlan?.trim()
  if (isBillingLiveStatus(params.subscriptionStatus) && subPlan) {
    return normalizePlanKey(subPlan)
  }
  if (params.planType) return normalizePlanKey(params.planType)
  if (subPlan) return normalizePlanKey(subPlan)
  return 'TRIAL'
}

export function getPlanWording(
  plan: string,
  userCount?: number,
  maxUsers?: number,
): PlanWording {
  switch (normalizePlanKey(plan)) {
    case 'B2C_ESSENTIEL':
      return {
        dashboardTitle: 'Mon espace',
        badgeLabel: 'Mon badge',
        contactsLabel: 'Mes contacts',
        contactsLimit: '20 contacts',
        usersLabel: null,
        vaultLabel: null,
        canCertifyDomains: false,
        canCertifyMultipleEmails: false,
        maxCertifiedEmails: 1,
        maxCertifiedPhones: 1,
        maxCertifiedDomains: 0,
      }

    case 'B2C_PREMIUM':
      return {
        dashboardTitle: 'Mon espace',
        badgeLabel: 'Mon badge',
        contactsLabel: 'Mes contacts',
        contactsLimit: '100 contacts',
        usersLabel: null,
        vaultLabel: null,
        canCertifyDomains: false,
        canCertifyMultipleEmails: false,
        maxCertifiedEmails: 1,
        maxCertifiedPhones: 1,
        maxCertifiedDomains: 0,
      }

    case 'B2C_FAMILLE':
      return {
        dashboardTitle: 'Espace famille',
        badgeLabel: 'Badges de la famille',
        contactsLabel: 'Contacts de la famille',
        contactsLimit: '100 contacts · 5 profils',
        usersLabel: `Mes profils (${userCount ?? '?'}/5)`,
        vaultLabel: null,
        canCertifyDomains: false,
        canCertifyMultipleEmails: false,
        maxCertifiedEmails: 1,
        maxCertifiedPhones: 1,
        maxCertifiedDomains: 0,
      }

    case 'B2C_FAMILLE_PLUS':
      return {
        dashboardTitle: 'Espace famille',
        badgeLabel: 'Badges de la famille',
        contactsLabel: 'Contacts de la famille',
        contactsLimit: '300 contacts · 10 profils',
        usersLabel: `Mes profils (${userCount ?? '?'}/10)`,
        vaultLabel: null,
        canCertifyDomains: false,
        canCertifyMultipleEmails: false,
        maxCertifiedEmails: 1,
        maxCertifiedPhones: 1,
        maxCertifiedDomains: 0,
      }

    case 'B2B_SOLO_PRO':
      return {
        dashboardTitle: 'Mon espace pro',
        badgeLabel: 'Mon badge professionnel',
        contactsLabel: 'Mes contacts pro',
        contactsLimit: '100 contacts pro',
        usersLabel: null,
        vaultLabel: null,
        canCertifyDomains: true,
        canCertifyMultipleEmails: true,
        maxCertifiedEmails: 5,
        maxCertifiedPhones: 3,
        maxCertifiedDomains: 3,
      }

    case 'B2B_STARTER':
      return {
        dashboardTitle: 'Espace équipe',
        badgeLabel: 'Badge certifié',
        contactsLabel: "Contacts de l'équipe",
        contactsLimit: '100 contacts/user · Vault 200',
        usersLabel: `Mon équipe (${userCount ?? '?'}/${maxUsers ?? 5})`,
        vaultLabel: 'BlockTrust Vault (200 entrées)',
        canCertifyDomains: true,
        canCertifyMultipleEmails: true,
        maxCertifiedEmails: 5,
        maxCertifiedPhones: 3,
        maxCertifiedDomains: 5,
      }

    case 'B2B_TEAM':
      return {
        dashboardTitle: 'Espace équipe',
        badgeLabel: 'Badge certifié',
        contactsLabel: "Contacts de l'équipe",
        contactsLimit: '200 contacts/user · Vault 500',
        usersLabel: `Mon équipe (${userCount ?? '?'}/${maxUsers ?? 15})`,
        vaultLabel: 'BlockTrust Vault (500 entrées)',
        canCertifyDomains: true,
        canCertifyMultipleEmails: true,
        maxCertifiedEmails: 10,
        maxCertifiedPhones: 5,
        maxCertifiedDomains: 10,
      }

    case 'B2B_BUSINESS':
      return {
        dashboardTitle: 'Espace entreprise',
        badgeLabel: 'Badge certifié entreprise',
        contactsLabel: 'Contacts entreprise',
        contactsLimit: '500 contacts/user · Vault illimité',
        usersLabel: `Mon organisation (${userCount ?? '?'}/${maxUsers ?? 50})`,
        vaultLabel: 'BlockTrust Vault (illimité)',
        canCertifyDomains: true,
        canCertifyMultipleEmails: true,
        maxCertifiedEmails: 10,
        maxCertifiedPhones: 10,
        maxCertifiedDomains: 10,
      }

    case 'B2B_ENTERPRISE':
      return {
        dashboardTitle: 'Espace entreprise',
        badgeLabel: 'Badge certifié entreprise',
        contactsLabel: 'Contacts entreprise',
        contactsLimit: 'Illimité',
        usersLabel: 'Mon organisation (illimité)',
        vaultLabel: 'BlockTrust Vault (illimité)',
        canCertifyDomains: true,
        canCertifyMultipleEmails: true,
        maxCertifiedEmails: 10,
        maxCertifiedPhones: 10,
        maxCertifiedDomains: 10,
      }

    case 'TRIAL':
    default:
      return {
        dashboardTitle: 'Mon espace',
        badgeLabel: 'Mon badge',
        contactsLabel: 'Mes contacts',
        contactsLimit: '',
        usersLabel: null,
        vaultLabel: null,
        canCertifyDomains: false,
        canCertifyMultipleEmails: false,
        maxCertifiedEmails: 1,
        maxCertifiedPhones: 1,
        maxCertifiedDomains: 0,
      }
  }
}
