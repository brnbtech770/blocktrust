// lib/certificate-verify-token-constants.ts
// Constantes partagées client/serveur (sans dépendances Node).
// ============================================================

export const DEFAULT_TTL_HOURS = 24
export const MIN_TTL_HOURS = 1
export const MAX_TTL_HOURS = 24 * 7

export const TTL_PRESETS = [
  { label: '1 heure', hours: 1 },
  { label: '24 heures', hours: 24 },
  { label: '7 jours', hours: 168 },
] as const

export type VerifyTokenListItem = {
  id: string
  tokenPreview: string
  verifyUrl: string
  createdAt: string
  expiresAt: string
  used: boolean
  usedAt: string | null
  status: 'active' | 'expired' | 'used'
}
