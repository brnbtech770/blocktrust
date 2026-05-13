// lib/truncate-public-id.ts
// Affichage dashboard client — ID de vérification (publicId) sans exposer le cuid interne
// ============================================================

/**
 * Tronque le publicId pour l’affichage utilisateur (ex. liste certificats).
 */
export function truncateVerificationPublicId(publicId: string | null | undefined): string {
  if (publicId == null || publicId.trim() === '') return '—'
  const p = publicId.trim()
  if (p.length <= 8) return p
  return `${p.slice(0, 8)}...`
}
