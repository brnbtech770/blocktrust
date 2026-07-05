// lib/vault-rate-limit.ts
// Rate limit routes coffre — bt:vault (fail-soft).
// ============================================================

import { getVaultLimiter, tryRedisLimit } from "@/lib/rate-limit-redis";

export async function checkVaultRateLimit(
  userId: string,
): Promise<{ allowed: true } | { allowed: false; retryAfterSec: number }> {
  const limiter = getVaultLimiter();
  const result = await tryRedisLimit(limiter, userId);
  if (!result) return { allowed: true };
  if (result.success) return { allowed: true };
  const retryAfterSec = Math.max(
    1,
    Math.ceil((result.reset - Date.now()) / 1000),
  );
  return { allowed: false, retryAfterSec };
}
