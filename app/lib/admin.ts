// app/lib/admin.ts
// Gestion des administrateurs dashboard — lib/admin-utils
// ============================================================

import {
  getAdminEmailList,
  isAdmin as isAdminImpl,
  isDashboardAdmin as isDashboardAdminImpl,
  isSuperAdmin as isSuperAdminImpl,
} from '@/lib/admin-utils'

export function isAdmin(email: string | null | undefined): boolean {
  return isAdminImpl(email)
}

export function isDashboardAdmin(email: string | null | undefined): boolean {
  return isDashboardAdminImpl(email)
}

export function isSuperAdmin(email: string | null | undefined): boolean {
  return isSuperAdminImpl(email)
}

/** Liste figée au chargement du module (emails en minuscules). */
export const ADMIN_EMAILS = getAdminEmailList()
