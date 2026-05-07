// lib/api-key.ts
// Helpers pour générer / hasher / comparer une clé API publique BlockTrust.
// ============================================================
//
// Format de clé : "bt_live_<32 hex>"  → 256 bits de random.
// La clé est stockée en clair (pour permettre l'affichage masqué dans le
// dashboard) ET hashée (sha256) pour permettre les lookups rapides via
// l'index `apiKeyHash` sans dépendre de la valeur exacte.
//
// La comparaison côté API publique se fait :
//   1. par lookup sur apiKeyHash (index)
//   2. par timing-safe equal sur la valeur en clair stockée

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import type { PrismaClient } from '@prisma/client'

const PREFIX = 'bt_live_'

export function generateApiKey(): { apiKey: string; apiKeyHash: string } {
  const raw = randomBytes(32).toString('hex')
  const apiKey = `${PREFIX}${raw}`
  const apiKeyHash = hashApiKey(apiKey)
  return { apiKey, apiKeyHash }
}

/**
 * Génère une paire clé + hash unique pour WhiteLabelConfig (évite collision DB si appels concurrents rares).
 */
export async function generateUniqueApiKeyPair(
  db: Pick<PrismaClient, 'whiteLabelConfig'>
): Promise<{ apiKey: string; apiKeyHash: string }> {
  for (let attempts = 0; attempts < 5; attempts++) {
    const pair = generateApiKey()
    const existing = await db.whiteLabelConfig.findUnique({
      where: { apiKey: pair.apiKey },
      select: { id: true },
    })
    if (!existing) return pair
  }
  throw new Error('Impossible de générer une clé API unique')
}

export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex')
}

/**
 * Affiche la clé masquée façon "bt_live_•••••••••••••••••••••••••••abcd".
 * Garde le préfixe + les 4 derniers caractères pour identification visuelle.
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) return '••••••••'
  const tail = apiKey.slice(-4)
  return `${PREFIX}${'•'.repeat(20)}${tail}`
}

export function isValidApiKeyShape(apiKey: string | null | undefined): apiKey is string {
  return Boolean(apiKey && /^bt_live_[a-f0-9]{16,}$/i.test(apiKey))
}

// ─── Extension Chrome (TrustScan) — préfixe bt_ext_ + 64 caractères hex (32 octets) ───

const EXT_PREFIX = "bt_ext_"

export function generateExtensionApiKey(): { apiKey: string; apiKeyHash: string; maskedDisplay: string } {
  const raw = randomBytes(32).toString("hex")
  const apiKey = `${EXT_PREFIX}${raw}`
  const apiKeyHash = hashApiKey(apiKey)
  const maskedDisplay = `${EXT_PREFIX}${"•".repeat(24)}${raw.slice(-4)}`
  return { apiKey, apiKeyHash, maskedDisplay }
}

export function maskExtensionApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 16) return "••••••••"
  const tail = apiKey.slice(-4)
  return `${EXT_PREFIX}${"•".repeat(24)}${tail}`
}

export function isValidExtensionApiKeyShape(apiKey: string | null | undefined): apiKey is string {
  return Boolean(apiKey && /^bt_ext_[a-f0-9]{64}$/i.test(apiKey))
}

/**
 * Comparaison timing-safe entre la clé reçue et la clé stockée.
 * Retourne false si les longueurs diffèrent (pas d'exception).
 */
export function timingSafeEqualString(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
