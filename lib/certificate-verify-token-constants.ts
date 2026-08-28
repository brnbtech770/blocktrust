// lib/certificate-verify-token-constants.ts
// Constantes partagées client/serveur (sans dépendances Node).
// ============================================================

export const DEFAULT_TTL_HOURS = 24
export const MIN_TTL_HOURS = 1
export const MAX_TTL_HOURS = 24 * 30

export const TTL_PRESETS = [
  { label: '1 heure', hours: 1 },
  { label: '24 heures', hours: 24 },
  { label: '7 jours', hours: 168 },
  { label: '30 jours', hours: 720 },
] as const

export function normalizeTtlHours(ttlHours?: number): number {
  const raw = ttlHours ?? DEFAULT_TTL_HOURS
  if (!Number.isFinite(raw)) return DEFAULT_TTL_HOURS
  return Math.min(MAX_TTL_HOURS, Math.max(MIN_TTL_HOURS, Math.floor(raw)))
}

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
