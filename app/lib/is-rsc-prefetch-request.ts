import { headers } from 'next/headers'

/**
 * Détecte les requêtes de préchargement RSC (Next.js).
 * Dans ce cas, `auth()` peut être vide alors que la navigation « réelle » enverrait les cookies ;
 * éviter un redirect vers /auth/signin qui casse le flux après OAuth.
 */
export async function isRscPrefetchRequest(): Promise<boolean> {
  const h = await headers()
  if (
    h.get('Next-Router-Prefetch') === '1' ||
    h.get('next-router-prefetch') === '1'
  ) {
    return true
  }
  const sec = (h.get('sec-purpose') ?? h.get('Sec-Purpose') ?? '').toLowerCase()
  if (sec.includes('prefetch')) return true
  const purpose = (h.get('purpose') ?? h.get('Purpose') ?? '').toLowerCase()
  if (purpose.includes('prefetch')) return true
  return false
}
