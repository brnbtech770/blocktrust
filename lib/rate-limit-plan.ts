// lib/rate-limit-plan.ts
// Rate limiting différencié par tier d'abonnement — anti-abus Sybil du plan gratuit.
// ============================================================
//
// Le plan Découverte (gratuit, sans CB) est la cible privilégiée des abus
// (Sybil, bots, scraping). On applique donc des limites STRICTES à DISCOVERY /
// DISCOVERY_EXPIRED, et des limites GÉNÉREUSES aux comptes payants.
//
// Politique : fail-soft. Si Redis est indisponible (getRedis() null), on retombe
// sur un compteur in-memory CONSERVATEUR appliquant la même limite par instance —
// on ne bloque jamais totalement le service, mais on limite quand même l'abus.

import type { Ratelimit } from "@upstash/ratelimit";
import {
  tryRedisLimit,
  getVerifyPlanDiscoveryLimiter,
  getVerifyPlanPaidLimiter,
  getExtensionPlanDiscoveryLimiter,
  getExtensionPlanPaidLimiter,
  getContactsPlanDiscoveryLimiter,
  getContactsPlanPaidLimiter,
} from "@/lib/rate-limit-redis";
import { isDiscoveryExpired, isDiscoveryPlan } from "@/lib/plan-features";

export type PlanTier = "DISCOVERY" | "PAID";
export type PlanRateAction = "verify" | "extension" | "contacts";

export type PlanRateLimitResult = {
  ok: boolean;
  retryAfter?: number;
  remaining: number;
  limit: number;
};

type LimitDef = { limit: number; windowMs: number };

/**
 * Matrice des limites par tier et par action.
 * DISCOVERY (strict) ⟷ PAID (généreux). Fenêtre glissante d'1 minute.
 */
const TIER_LIMITS: Record<PlanTier, Record<PlanRateAction, LimitDef>> = {
  DISCOVERY: {
    verify: { limit: 10, windowMs: 60_000 },
    extension: { limit: 30, windowMs: 60_000 },
    contacts: { limit: 5, windowMs: 60_000 },
  },
  PAID: {
    verify: { limit: 60, windowMs: 60_000 },
    extension: { limit: 120, windowMs: 60_000 },
    contacts: { limit: 30, windowMs: 60_000 },
  },
};

/** DISCOVERY et DISCOVERY_EXPIRED → tier strict ; tout le reste (payant, admin) → tier généreux. */
export function planTier(plan?: string | null): PlanTier {
  return isDiscoveryPlan(plan) || isDiscoveryExpired(plan) ? "DISCOVERY" : "PAID";
}

/** Limite applicable (limit + fenêtre) pour un plan et une action donnés. */
export function getRateLimitForPlan(
  plan: string | null | undefined,
  action: PlanRateAction,
): LimitDef {
  return TIER_LIMITS[planTier(plan)][action];
}

function limiterFor(action: PlanRateAction, tier: PlanTier): Ratelimit | null {
  switch (action) {
    case "verify":
      return tier === "DISCOVERY"
        ? getVerifyPlanDiscoveryLimiter()
        : getVerifyPlanPaidLimiter();
    case "extension":
      return tier === "DISCOVERY"
        ? getExtensionPlanDiscoveryLimiter()
        : getExtensionPlanPaidLimiter();
    case "contacts":
      return tier === "DISCOVERY"
        ? getContactsPlanDiscoveryLimiter()
        : getContactsPlanPaidLimiter();
  }
}

// Fallback in-memory par instance (Redis KO / non configuré). Conservateur : même limite.
const memory = new Map<string, { count: number; resetAt: number }>();

function pruneMemory(now: number) {
  if (memory.size < 5000) return;
  for (const [k, e] of memory.entries()) {
    if (e.resetAt < now) memory.delete(k);
  }
}

function checkMemory(key: string, def: LimitDef): PlanRateLimitResult {
  const now = Date.now();
  pruneMemory(now);
  let e = memory.get(key);
  if (!e || e.resetAt < now) {
    e = { count: 0, resetAt: now + def.windowMs };
    memory.set(key, e);
  }
  if (e.count >= def.limit) {
    return {
      ok: false,
      retryAfter: Math.max(1, Math.ceil((e.resetAt - now) / 1000)),
      remaining: 0,
      limit: def.limit,
    };
  }
  e.count += 1;
  return { ok: true, remaining: def.limit - e.count, limit: def.limit };
}

/**
 * Consomme 1 crédit pour (action, identifier) selon le tier du plan.
 * Redis distribué si configuré, sinon fallback in-memory conservateur. Fail-soft.
 */
export async function checkPlanRateLimit(
  action: PlanRateAction,
  plan: string | null | undefined,
  identifier: string,
): Promise<PlanRateLimitResult> {
  const tier = planTier(plan);
  const def = TIER_LIMITS[tier][action];

  const redisResult = await tryRedisLimit(limiterFor(action, tier), identifier);
  if (redisResult) {
    if (!redisResult.success) {
      return {
        ok: false,
        retryAfter: Math.max(1, Math.ceil((redisResult.reset - Date.now()) / 1000)),
        remaining: 0,
        limit: redisResult.limit,
      };
    }
    return { ok: true, remaining: redisResult.remaining, limit: redisResult.limit };
  }

  return checkMemory(`${action}:${tier}:${identifier}`, def);
}
