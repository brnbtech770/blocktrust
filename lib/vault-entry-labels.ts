// lib/vault-entry-labels.ts
// Libellés français des types d'entrée vault
// ============================================================

import type { VaultEntryType } from '@prisma/client'

export const VAULT_ENTRY_TYPE_LABELS: Record<VaultEntryType, string> = {
  CONTACT: 'Contact',
  DOMAIN: 'Domaine web',
  EMAIL: 'Email',
  PHONE: 'Téléphone',
  URL: 'URL',
  WALLET: 'Portefeuille crypto',
  IBAN: 'IBAN / RIB',
}

export function vaultEntryTypeLabel(type: VaultEntryType): string {
  return VAULT_ENTRY_TYPE_LABELS[type] ?? type
}
