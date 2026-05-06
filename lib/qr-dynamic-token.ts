// lib/qr-dynamic-token.ts
// Token QR rotatif : entropie 256 bits + comparaison constant-time côté app.
// ============================================================

import { randomBytes, timingSafeEqual } from 'node:crypto'

/** Génère un secret URL-safe (32 octets → base64url). */
export function generateQrDynamicToken(): string {
  return randomBytes(32).toString('base64url')
}

/**
 * Comparaison constant-time de deux chaînes UTF-8.
 * Longueurs différentes → false (pas d’appel timingSafeEqual avec tailles distinctes).
 */
export function timingSafeEqualUtf8(a: string, b: string): boolean {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}
