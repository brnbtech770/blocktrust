/**
 * Normalisation PEM depuis variables d'environnement (Vercel / .env.local).
 */
import { createPrivateKey, createPublicKey, type KeyObject } from 'crypto'
import { importPKCS8, importSPKI } from 'jose'

const ES256 = 'ES256' as const
const RS256 = 'RS256' as const

export type JwtSigningAlgorithm = typeof ES256 | typeof RS256

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

export function detectJwtAlgorithmFromPrivatePem(pem: string): JwtSigningAlgorithm {
  const keyObject = createPrivateKey({ key: pem, format: 'pem' })
  if (keyObject.asymmetricKeyType === 'rsa') return RS256
  if (keyObject.asymmetricKeyType === 'ec') return ES256
  throw new Error('Type de clé JWT non supporté (EC P-256 ou RSA requis)')
}

export function detectJwtAlgorithmFromPublicPem(pem: string): JwtSigningAlgorithm {
  const keyObject = createPublicKey({ key: pem, format: 'pem' })
  if (keyObject.asymmetricKeyType === 'rsa') return RS256
  if (keyObject.asymmetricKeyType === 'ec') return ES256
  throw new Error('Type de clé JWT non supporté (EC P-256 ou RSA requis)')
}

export interface JwtKeyPair {
  key: Awaited<ReturnType<typeof importPKCS8>>
  alg: JwtSigningAlgorithm
}

/** Importe la clé privée JWT en détectant ES256 (EC P-256) ou RS256 (RSA). */
export async function importJwtPrivateKeyFromEnv(
  raw: string | undefined,
): Promise<JwtKeyPair> {
  const normalized = normalizeJwtPemFromEnv(raw)
  if (!normalized.includes('BEGIN')) {
    throw new Error('Clé privée JWT invalide ou absente (PEM attendu)')
  }
  const pkcs8 = toPkcs8Pem(normalized)
  const alg = detectJwtAlgorithmFromPrivatePem(pkcs8)
  const key = await importPKCS8(pkcs8, alg)
  return { key, alg }
}

/** Importe la clé publique JWT en détectant ES256 (EC P-256) ou RS256 (RSA). */
export async function importJwtPublicKeyFromEnv(
  raw: string | undefined,
): Promise<JwtKeyPair> {
  const normalized = normalizeJwtPemFromEnv(raw)
  if (!normalized.includes('BEGIN')) {
    throw new Error('Clé publique JWT invalide ou absente (PEM attendu)')
  }
  const alg = detectJwtAlgorithmFromPublicPem(normalized)
  const key = await importSPKI(normalized, alg)
  return { key, alg }
}

/** Importe une clé privée JWT (EC → ES256, RSA → RS256). */
export async function importEs256PrivateKeyFromEnv(raw: string | undefined) {
  return (await importJwtPrivateKeyFromEnv(raw)).key
}

/** Importe une clé publique JWT (EC → ES256, RSA → RS256). */
export async function importEs256PublicKeyFromEnv(raw: string | undefined) {
  return (await importJwtPublicKeyFromEnv(raw)).key
}
