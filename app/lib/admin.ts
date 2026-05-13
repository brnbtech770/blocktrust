// app/lib/admin.ts
// Gestion des administrateurs — parse multi-emails via lib/admin-utils
// ============================================================

import { getAdminEmailList, isAdmin as isAdminImpl } from '@/lib/admin-utils'

export function isAdmin(email: string | null | undefined): boolean {
  return isAdminImpl(email)
}

/** Liste figée au chargement du module (emails en minuscules). */
export const ADMIN_EMAILS = getAdminEmailList()
