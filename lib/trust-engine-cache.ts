/**
 * Cache Redis pour computeTrustEngineScore — TTL 10 min, fail-soft.
 */
import { getRedis } from "@/lib/rate-limit-redis";
import {
  computeTrustEngineScore,
  type TrustEngineOptions,
  type TrustEngineResult,
} from "@/lib/trust-engine";

const CACHE_TTL_SECONDS = 600;
const CACHE_PREFIX = "te:score:";

function buildCacheKey(
  certificateLookupId: string,
  viewerUserId?: string,
): string {
  const id = certificateLookupId.trim();
  const viewer = viewerUserId?.trim();
  if (viewer) return `${CACHE_PREFIX}${id}:v:${viewer}`;
  return `${CACHE_PREFIX}${id}`;
}

function parseCachedResult(raw: unknown): TrustEngineResult | null {
  if (!raw) return null;
  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as TrustEngineResult;
    } catch {
      return null;
    }
  }
  if (typeof raw === "object") return raw as TrustEngineResult;
  return null;
}

/** Lecture cache — null si miss ou Redis indisponible. */
export async function getCachedTrustEngineResult(
  certificateLookupId: string,
  viewerUserId?: string,
): Promise<TrustEngineResult | null> {
  const redis = getRedis();
  if (!redis) return null;

  const key = buildCacheKey(certificateLookupId, viewerUserId);
  try {
    const cached = await redis.get(key);
    return parseCachedResult(cached);
  } catch (err) {
    console.warn("[trust-engine-cache] read failed", err);
    return null;
  }
}

/** Calcule et met en cache (await — pour warm / tests). */
export async function computeAndCacheTrustEngineResult(
  certificateLookupId: string,
  viewerUserId?: string,
  options?: TrustEngineOptions,
): Promise<TrustEngineResult> {
  const result = await computeTrustEngineScore(
    certificateLookupId,
    viewerUserId,
    options,
  );

  const redis = getRedis();
  if (redis) {
    const key = buildCacheKey(certificateLookupId, viewerUserId);
    try {
      await redis.set(key, JSON.stringify(result), { ex: CACHE_TTL_SECONDS });
    } catch (err) {
      console.warn("[trust-engine-cache] write failed", err);
    }
  }

  return result;
}

/** Cache miss → calcul async ; retourne null si absent du cache. */
export function warmTrustEngineScoreCache(
  certificateLookupId: string,
  viewerUserId?: string,
  options?: TrustEngineOptions,
): void {
  void computeAndCacheTrustEngineResult(
    certificateLookupId,
    viewerUserId,
    options,
  ).catch((err) => {
    console.error("[trust-engine-cache] warm failed", err);
  });
}

/**
 * Route chaude : cache hit → résultat ; miss → warm async + null.
 * Ne modifie pas computeTrustEngineScore.
 */
export async function getTrustEngineResultForApi(
  certificateLookupId: string,
  viewerUserId?: string,
  options?: TrustEngineOptions,
): Promise<TrustEngineResult | null> {
  const cached = await getCachedTrustEngineResult(
    certificateLookupId,
    viewerUserId,
  );
  if (cached) return cached;

  warmTrustEngineScoreCache(certificateLookupId, viewerUserId, options);
  return null;
}

/** Invalidation à la révocation (id interne et/ou publicId). */
export async function invalidateTrustEngineCache(
  ...certificateLookupIds: Array<string | null | undefined>
): Promise<void> {
  const redis = getRedis();
  if (!redis) return;

  const keys = [
    ...new Set(
      certificateLookupIds
        .map((id) => id?.trim())
        .filter((id): id is string => Boolean(id))
        .map((id) => buildCacheKey(id)),
    ),
  ];

  if (keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (err) {
    console.warn("[trust-engine-cache] invalidate failed", err);
  }
}

export async function invalidateTrustEngineCacheForCertificate(
  certificateId: string,
  publicId?: string | null,
): Promise<void> {
  await invalidateTrustEngineCache(certificateId, publicId ?? undefined);
}
