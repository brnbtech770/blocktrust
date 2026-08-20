// lib/turnstile-ip-block.ts
// Blocage IP après trop de bypass Turnstile (inscription).
// ============================================================

import { getRedis, getTurnstileBypassHourLimiter, tryRedisLimit } from "@/lib/rate-limit-redis";

const BLOCK_KEY_PREFIX = "bt:turnstile:block:";
const BLOCK_TTL_SECONDS = 24 * 60 * 60;

export async function isTurnstileIpBlocked(ip: string): Promise<boolean> {
  const redis = getRedis();
  if (!redis || !ip || ip === "unknown") return false;
  try {
    const val = await redis.get(`${BLOCK_KEY_PREFIX}${ip}`);
    return val === "1" || val === 1;
  } catch (err) {
    console.warn("[turnstile] block check failed", err);
    return false;
  }
}

async function setTurnstileIpBlock(ip: string): Promise<void> {
  const redis = getRedis();
  if (!redis || !ip || ip === "unknown") return;
  try {
    await redis.set(`${BLOCK_KEY_PREFIX}${ip}`, "1", { ex: BLOCK_TTL_SECONDS });
  } catch (err) {
    console.warn("[turnstile] block set failed", err);
  }
}

/**
 * Compte un bypass Turnstile pour l'IP. Retourne false si l'IP doit être bloquée (> 3/h).
 */
export async function recordTurnstileBypass(ip: string | null | undefined): Promise<boolean> {
  if (!ip || ip === "unknown") return true;

  if (await isTurnstileIpBlocked(ip)) return false;

  const limiter = getTurnstileBypassHourLimiter();
  const result = await tryRedisLimit(limiter, ip);

  if (result && !result.success) {
    await setTurnstileIpBlock(ip);
    return false;
  }

  return true;
}
