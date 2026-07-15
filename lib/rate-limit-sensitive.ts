// lib/rate-limit-sensitive.ts
// Rate limits — upload, changement MDP, webhooks test, liens verify.
// Politique : Redis si dispo, sinon fallback in-memory fail-soft.
// ============================================================

import {
  getUploadHourLimiter,
  getPasswordChangeLimiter,
  getWhitelabelTestLimiter,
  getVerifyLinkHourLimiter,
  tryRedisLimit,
} from "@/lib/rate-limit-redis";

export type SensitiveRateLimitResult = {
  ok: boolean;
  retryAfter?: number;
};

type MemoryEntry = { count: number; resetAt: number };

const memoryStores = new Map<string, Map<string, MemoryEntry>>();

function memoryLimit(
  storeKey: string,
  identifier: string,
  max: number,
  windowMs: number,
): SensitiveRateLimitResult {
  let store = memoryStores.get(storeKey);
  if (!store) {
    store = new Map();
    memoryStores.set(storeKey, store);
  }

  const now = Date.now();
  let entry = store.get(identifier);
  if (!entry || entry.resetAt < now) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(identifier, entry);
  }

  if (entry.count >= max) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)),
    };
  }

  entry.count += 1;
  return { ok: true };
}

async function redisOrMemory(
  limiter: ReturnType<typeof getUploadHourLimiter>,
  identifier: string,
  storeKey: string,
  max: number,
  windowMs: number,
): Promise<SensitiveRateLimitResult> {
  const redis = await tryRedisLimit(limiter, identifier);
  if (redis) {
    if (redis.success) return { ok: true };
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((redis.reset - Date.now()) / 1000)),
    };
  }
  return memoryLimit(storeKey, identifier, max, windowMs);
}

/** 10 uploads / h par utilisateur */
export async function checkRateLimitUploadAsync(
  userId: string,
): Promise<SensitiveRateLimitResult> {
  return redisOrMemory(
    getUploadHourLimiter(),
    userId,
    "upload:h",
    10,
    3_600_000,
  );
}

/** 5 échecs « mot de passe actuel » / h par utilisateur */
export async function checkRateLimitPasswordChangeAsync(
  userId: string,
): Promise<SensitiveRateLimitResult> {
  return redisOrMemory(
    getPasswordChangeLimiter(),
    userId,
    "password:h",
    5,
    3_600_000,
  );
}

/** 5 tests webhook / min par utilisateur */
export async function checkRateLimitWhitelabelTestAsync(
  userId: string,
): Promise<SensitiveRateLimitResult> {
  return redisOrMemory(
    getWhitelabelTestLimiter(),
    userId,
    "wl-test:m",
    5,
    60_000,
  );
}

/** 20 liens verify / h par utilisateur */
export async function checkRateLimitVerifyLinkAsync(
  userId: string,
): Promise<SensitiveRateLimitResult> {
  return redisOrMemory(
    getVerifyLinkHourLimiter(),
    userId,
    "verify-link:h",
    20,
    3_600_000,
  );
}
