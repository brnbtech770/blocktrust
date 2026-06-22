// lib/mcp/rate-limit.ts
// Rate limit MCP — 60 req/min par clé API (Upstash bt:mcp:{hash})
// ============================================================

import { getMcpLimiter, tryRedisLimit } from "@/lib/rate-limit-redis";
import type { McpRateLimitResult } from "@/lib/mcp/types";

const inMemoryBuckets = new Map<string, { count: number; resetAt: number }>();

function inMemoryLimit(keyHash: string, limit: number, windowMs: number): McpRateLimitResult {
  const now = Date.now();
  const bucket = inMemoryBuckets.get(keyHash);
  if (!bucket || now >= bucket.resetAt) {
    inMemoryBuckets.set(keyHash, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfter: Math.ceil((bucket.resetAt - now) / 1000) };
  }
  bucket.count += 1;
  return { ok: true };
}

export async function checkMcpRateLimit(keyHash: string): Promise<McpRateLimitResult> {
  const limiter = getMcpLimiter();
  const redisResult = await tryRedisLimit(limiter, keyHash);
  if (redisResult) {
    if (redisResult.success) return { ok: true };
    const retryAfter = Math.max(
      1,
      Math.ceil((redisResult.reset - Date.now()) / 1000),
    );
    return { ok: false, retryAfter };
  }
  return inMemoryLimit(keyHash, 60, 60_000);
}
