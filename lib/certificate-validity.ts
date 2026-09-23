/**
 * Validité actuelle d'un Certificate.
 * Source unique pour l'extension, le MCP, le Trust Engine, BIS et les API publiques.
 *
 * Un badge Découverte encore PENDING avec blockchainStatus NOT_ANCHORED
 * n'est pas « actuellement valide », mais les pages publiques le présentent
 * comme un badge signé non ancré (voir certificateDisplayedVerdict).
 */

export type CertificateValidityInput = {
  status: string
  revokedAt?: Date | null
  expiresAt?: Date | null
  blockchainStatus?: string | null
}

export type CertificateDisplayedVerdict = "VALID" | "REVOKED" | "EXPIRED" | "INVALID"

export function isCertificateCurrentlyValid(
  cert: CertificateValidityInput,
  now: Date = new Date(),
): boolean {
  if (cert.revokedAt) return false
  if (cert.status !== "ACTIVE" && cert.status !== "ANCHORED") return false
  if (cert.expiresAt && cert.expiresAt.getTime() < now.getTime()) return false
  return true
}

/**
 * Verdict affiché. Révoqué et expiré priment.
 * NOT_ANCHORED sans révocation ni expiration conserve le verdict public
 * du badge Découverte (signé, non ancré) — pas une certification active.
 */
export function certificateDisplayedVerdict(
  cert: CertificateValidityInput,
  now: Date = new Date(),
): CertificateDisplayedVerdict {
  if (cert.revokedAt || cert.status === "REVOKED") return "REVOKED"
  if (cert.status === "EXPIRED") return "EXPIRED"
  if (cert.expiresAt && cert.expiresAt.getTime() < now.getTime()) return "EXPIRED"
  if (isCertificateCurrentlyValid(cert, now)) return "VALID"
  if (cert.blockchainStatus === "NOT_ANCHORED") return "VALID"
  return "INVALID"
}
