/**
 * Normalisation PEM depuis variables d'environnement (Vercel / .env.local).
 */
import { createPrivateKey, type KeyObject } from 'crypto'
import { importPKCS8 } from 'jose'

const ES256 = 'ES256' as const

export function normalizeJwtPemFromEnv(raw: string | undefined): string {
  if (!raw) return ''
  let pem = raw.trim()
  if (
    (pem.startsWith('"') && pem.endsWith('"')) ||
    (pem.startsWith("'") && pem.endsWith("'"))
  ) {
    pem = pem.slice(1, -1).trim()
  }
  return pem.replace(/\\n/g, '\n').trim()
}

function toPkcs8Pem(pem: string): string {
  if (pem.includes('BEGIN PRIVATE KEY')) {
    return pem
  }
  if (pem.includes('BEGIN EC PRIVATE KEY') || pem.includes('BEGIN RSA PRIVATE KEY')) {
    const keyObject: KeyObject = createPrivateKey({ key: pem, format: 'pem' })
    return keyObject.export({ type: 'pkcs8', format: 'pem' }) as string
  }
  return pem
}

/** Importe une clé privée ES256 pour signature JWT (PKCS#8 ou SEC1). */
export async function importEs256PrivateKeyFromEnv(raw: string | undefined) {
  const normalized = normalizeJwtPemFromEnv(raw)
  if (!normalized.includes('BEGIN')) {
    throw new Error('Clé privée JWT invalide ou absente (PEM attendu)')
  }
  const pkcs8 = toPkcs8Pem(normalized)
  return importPKCS8(pkcs8, ES256)
}

/** Importe une clé publique SPKI ES256. */
export async function importEs256PublicKeyFromEnv(raw: string | undefined) {
  const { importSPKI } = await import('jose')
  const normalized = normalizeJwtPemFromEnv(raw)
  if (!normalized.includes('BEGIN')) {
    throw new Error('Clé publique JWT invalide ou absente (PEM attendu)')
  }
  return importSPKI(normalized, ES256)
}
