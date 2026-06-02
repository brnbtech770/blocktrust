// lib/rate-limit-cost.ts
// Rate limiting des opérations « coûteuses » :
//   - KYC (Stripe Identity, ~1,50€/session)  → bt:kyc, 3/h par userId
//   - /api/v2/verify anti-boucle par token    → bt:v2verify:jti, 20/min par jti
// ============================================================
//
// Politique : fail-soft, exactement comme le reste de l'infra.
//   1. Redis Upstash si configuré (distribué, recommandé en prod)
//   2. Sinon → fallback in-memory conservateur par instance (jamais bloquer tout le service)

import type { Ratelimit } from "@upstash/ratelimit";
import {
  tryRedisLimit,
  getKycHourLimiter,
  getV2VerifyJtiLimiter,
  getKycSiretLimiter,
  getForgotPasswordLimiter,
  getResolveTokenLimiter,
  getBadgeLimiter,
} from "@/lib/rate-limit-redis";

export type CostRateResult = { ok: boolean; retryAfter?: number };

type Window = { count: number; resetAt: number };

function pruneStore(store: Map<string, Window>) {
  const now = Date.now();
  for (const [k, e] of store.entries()) {
    if (e.resetAt < now) store.delete(k);
  }
}

/** Compteur in-memory fenêtré (fallback quand Redis est absent/KO). Retourne true si autorisé. */
function memoryLimit(
  store: Map<string, Window>,
  key: string,
  max: number,
  windowMs: number,
): boolean {
  pruneStore(store);
  const now = Date.now();
  const e = store.get(key);
  if (!e || e.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (e.count >= max) return false;
  e.count += 1;
  return true;
}

/**
 * Générique : Redis distribué si configuré, sinon fallback in-memory conservateur.
 * Fail-soft — ne bloque jamais tout le service à cause de Redis.
 */
async function costLimit(
  limiter: Ratelimit | null,
  store: Map<string, Window>,
  key: string,
  max: number,
  windowMs: number,
): Promise<CostRateResult> {
  const r = await tryRedisLimit(limiter, key);
  if (r !== null) {
    return r.success
      ? { ok: true }
      : { ok: false, retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
  }
  const ok = memoryLimit(store, key, max, windowMs);
  return ok ? { ok: true } : { ok: false, retryAfter: Math.ceil(windowMs / 1000) };
}

const KYC_MAX = 3;
const KYC_WINDOW_MS = 3_600_000;
const kycStore = new Map<string, Window>();

/**
 * Limite les démarrages de vérification d'identité (Stripe Identity payant).
 * 3 par heure et par userId. Fail-soft : Redis KO → fallback in-memory.
 */
export async function checkKycRateLimit(userId: string): Promise<CostRateResult> {
  const r = await tryRedisLimit(getKycHourLimiter(), userId);
  if (r !== null) {
    return r.success
      ? { ok: true }
      : { ok: false, retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
  }
  const ok = memoryLimit(kycStore, userId, KYC_MAX, KYC_WINDOW_MS);
  return ok ? { ok: true } : { ok: false, retryAfter: Math.ceil(KYC_WINDOW_MS / 1000) };
}

const V2_JTI_MAX = 20;
const V2_JTI_WINDOW_MS = 60_000;
const v2JtiStore = new Map<string, Window>();

/**
 * Anti-boucle sur la vérification publique d'un même token (jti).
 * 20 vérifications par minute et par jti. Fail-soft : Redis KO → fallback in-memory.
 */
export async function checkV2VerifyJti(jti: string): Promise<CostRateResult> {
  const r = await tryRedisLimit(getV2VerifyJtiLimiter(), jti);
  if (r !== null) {
    return r.success
      ? { ok: true }
      : { ok: false, retryAfter: Math.max(1, Math.ceil((r.reset - Date.now()) / 1000)) };
  }
  const ok = memoryLimit(v2JtiStore, jti, V2_JTI_MAX, V2_JTI_WINDOW_MS);
  return ok ? { ok: true } : { ok: false, retryAfter: Math.ceil(V2_JTI_WINDOW_MS / 1000) };
}

// ── Vérification SIRET INSEE (coût API tiers) : 10 / h par userId ──
const kycSiretStore = new Map<string, Window>();
export async function checkKycSiretRateLimit(userId: string): Promise<CostRateResult> {
  return costLimit(getKycSiretLimiter(), kycSiretStore, userId, 10, 3_600_000);
}

// ── Mot de passe oublié (anti-spam d'emails) : 3 / h par identifiant (IP ou email) ──
const forgotStore = new Map<string, Window>();
export async function checkForgotPasswordRateLimit(identifier: string): Promise<CostRateResult> {
  return costLimit(getForgotPasswordLimiter(), forgotStore, identifier, 3, 3_600_000);
}

// ── Résolution de token rotatif (anti brute-force) : 30 / min par IP ──
const resolveTokenStore = new Map<string, Window>();
export async function checkResolveTokenRateLimit(ip: string): Promise<CostRateResult> {
  return costLimit(getResolveTokenLimiter(), resolveTokenStore, ip, 30, 60_000);
}

// ── QR / badge SVG (anti-énumération) : 120 / min par IP ──
const badgeStore = new Map<string, Window>();
export async function checkBadgeRateLimit(ip: string): Promise<CostRateResult> {
  return costLimit(getBadgeLimiter(), badgeStore, ip, 120, 60_000);
}
