// lib/public-verify-url.ts
// URL de vérification publique /verify?certId= (sans session).
// ============================================================

function normalizeBaseUrl(raw: string | undefined): string | null {
  const t = raw?.trim()
  if (!t) return null
  return t.replace(/\/$/, '')
}

/** Base applicative : NEXT_PUBLIC_APP_URL || NEXTAUTH_URL || prod par défaut. */
export function getBlocktrustBaseUrl(): string {
  return (
    normalizeBaseUrl(process.env.NEXT_PUBLIC_APP_URL) ??
    normalizeBaseUrl(process.env.NEXTAUTH_URL) ??
    'https://blocktrust.tech'
  )
}

/** Lien public unique pour les emails et QR « certificat ». */
export function buildPublicVerifyUrl(publicIdOrCertificateId: string): string {
  const base = getBlocktrustBaseUrl()
  return `${base}/verify?certId=${encodeURIComponent(publicIdOrCertificateId)}`
}
