/**
 * Cache Redis verify-sender (préfixe v8).
 * La clé inclut une génération par email expéditeur.
 * Une révocation incrémente cette génération : les entrées précédentes
 * ne sont plus lues. Elles expirent seules (TTL 300 s).
 *
 * Le cache mémoire de l'extension Chrome (5 min) n'est pas purgable
 * à distance. Fenêtre résiduelle côté navigateur : jusqu'à 5 minutes
 * après la révocation, pour un verdict déjà reçu.
 */
import { getRedis } from "@/lib/rate-limit-redis"
import { normalizeSenderEmail } from "@/lib/extension-verify-sender"

export const EXTENSION_VERIFY_CACHE_PREFIX = "bt:ext:verify:v8"
export const EXTENSION_VERIFY_GEN_PREFIX = "bt:ext:verify:gen:v8:"
export const EXTENSION_VERIFY_CACHE_TTL_SECONDS = 300

export function extensionVerifyGenerationKey(emailNorm: string): string {
  return `${EXTENSION_VERIFY_GEN_PREFIX}${emailNorm}`
}

export function extensionVerifyCacheKey(params: {
  userId: string
  emailNorm: string
  domainNorm: string
  bisId: string
  generation: number
}): string {
  const bis = params.bisId.trim() || "-"
  return `${EXTENSION_VERIFY_CACHE_PREFIX}:${params.userId}:${params.emailNorm}:${params.domainNorm}:${bis}:g${params.generation}`
}

export async function readExtensionVerifyGeneration(emailNorm: string): Promise<number> {
  if (!emailNorm) return 0
  const redis = getRedis()
  if (!redis) return 0
  try {
    const raw = await redis.get<number | string>(extensionVerifyGenerationKey(emailNorm))
    const n = typeof raw === "number" ? raw : Number(raw)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  } catch {
    return 0
  }
}

/** Invalide les verdicts verify-sender serveur pour cet email expéditeur. */
export async function invalidateExtensionVerifyCacheForEmail(
  email: string | null | undefined,
): Promise<void> {
  const emailNorm = normalizeSenderEmail(email ?? "")
  if (!emailNorm) return
  const redis = getRedis()
  if (!redis) return
  try {
    await redis.incr(extensionVerifyGenerationKey(emailNorm))
  } catch (err) {
    console.warn("[extension-verify-cache] invalidate failed", err)
  }
}
