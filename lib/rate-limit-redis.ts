// lib/rate-limit-redis.ts
// Rate limiting distribué via Upstash Redis (sliding window, analytics).
// Si Redis n'est pas configuré OU répond en erreur → null retourné, le caller doit fallback.
// ============================================================
//
// Variables Vercel attendues :
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// Politique : fail-soft. Jamais bloquer une requête légitime à cause de Redis KO.

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/** Retire d'éventuels guillemets entourants (artefact de copier-coller d'un secret). */
function unquote(value?: string | null): string {
  const v = (value ?? "").trim();
  return v.replace(/^["']|["']$/g, "").trim();
}

// Instanciation LAZY : jamais au module-load (sinon `new Redis()` peut lever
// une UrlError au build, lors de la collecte des pages). Le client n'est créé
// qu'au premier appel runtime, et de façon fail-soft (null si absent/invalide).
let _redis: Redis | null = null;
let _redisChecked = false;

/**
 * Client Redis lazy + fail-soft. Upstash exige une URL https et lève une
 * exception synchrone sinon. On valide d'abord, on capture toute erreur, et on
 * retombe sur null (fallback in-memory côté appelants). Mémoïsé.
 */
export function getRedis(): Redis | null {
  if (_redisChecked) return _redis;
  _redisChecked = true;

  const url = unquote(process.env.UPSTASH_REDIS_REST_URL);
  const token = unquote(process.env.UPSTASH_REDIS_REST_TOKEN);
  if (!url || !token) return _redis;
  if (!/^https:\/\//i.test(url)) {
    console.warn(
      "[RateLimit] UPSTASH_REDIS_REST_URL invalide (https requis) — fallback in-memory",
    );
    return _redis;
  }
  try {
    _redis = new Redis({ url, token });
  } catch (err) {
    console.warn("[RateLimit] Init Redis échouée — fallback in-memory", err);
    _redis = null;
  }
  return _redis;
}

/** True si Redis est utilisable (résout le client lazy). */
export function isUpstashConfigured(): boolean {
  return getRedis() !== null;
}

// Limiteurs mémoïsés par prefix — créés lazy au premier accès (pas au build).
const _limiters = new Map<string, Ratelimit | null>();

function getLimiter(
  prefix: string,
  tokens: number,
  window: `${number} ${"s" | "m" | "h" | "d"}`,
): Ratelimit | null {
  const cached = _limiters.get(prefix);
  if (cached !== undefined) return cached;
  const redis = getRedis();
  const limiter = redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(tokens, window),
        analytics: true,
        prefix,
      })
    : null;
  _limiters.set(prefix, limiter);
  return limiter;
}

// /verify : 10 req / min + 50 req / h par IP
export const getVerifyMinuteLimiter = () => getLimiter("bt:verify:m", 10, "1 m");
export const getVerifyHourLimiter = () => getLimiter("bt:verify:h", 50, "1 h");

// API publique White Label : 30 req / min par apiKeyHash
export const getApiLimiter = () => getLimiter("bt:api", 30, "1 m");

// Inscription : 3 req / h + 10 req / jour par IP
export const getRegisterHourLimiter = () => getLimiter("bt:register:h", 3, "1 h");
export const getRegisterDayLimiter = () => getLimiter("bt:register:d", 10, "1 d");

// Magic link (Auth.js email) : 3 envois / h par identifiant (IP ou email)
export const getMagicLinkHourLimiter = () => getLimiter("bt:magiclink:h", 3, "1 h");

// Vérification d'identité (Stripe Identity, coût réel ~1,50€/session) : 3 démarrages / h par userId
export const getKycHourLimiter = () => getLimiter("bt:kyc", 3, "1 h");

// Vérification JWT publique /api/v2/verify : anti-boucle sur un même token (jti) — 20 / min par jti
export const getV2VerifyJtiLimiter = () => getLimiter("bt:v2verify:jti", 20, "1 m");

// Vérification SIRET INSEE (coût API tiers) : 10 / h par userId
export const getKycSiretLimiter = () => getLimiter("bt:kyc:siret", 10, "1 h");

// Mot de passe oublié (anti-spam d'emails) : 3 / h par identifiant (IP ou email)
export const getForgotPasswordLimiter = () => getLimiter("bt:forgot", 3, "1 h");

// Résolution de token rotatif /api/verify/resolve-token (anti brute-force) : 30 / min par IP hash
export const getResolveTokenLimiter = () => getLimiter("bt:resolve-token", 30, "1 m");

// Vérification publique BIS /api/bis/verify/[id] : 30 / min par IP hash
export const getBisVerifyLimiter = () => getLimiter("bt:bis-verify", 30, "1 m");

// Génération QR / badge SVG (anti-énumération de certificats/noms) : 120 / min par IP
// Limite volontairement généreuse : ces ressources sont parfois embarquées (img) et chargées en série.
export const getBadgeLimiter = () => getLimiter("bt:badge", 120, "1 m");

// API extension Chrome TrustScan — par hash de clé (jamais la clé en clair)
export const getExtensionVerifyLimiter = () => getLimiter("bt:extension:verify", 100, "1 m");
export const getExtensionWriteLimiter = () => getLimiter("bt:extension:write", 30, "1 m");
export const getExtensionMeLimiter = () => getLimiter("bt:extension:me", 60, "1 m");
export const getExtensionKeygenLimiter = () => getLimiter("bt:extension:keygen", 10, "1 m");
export const getExtensionRevealLimiter = () => getLimiter("bt:extension:reveal", 5, "1 m");

// Serveur MCP — 60 req/min par hash de clé API
export const getMcpLimiter = () => getLimiter("bt:mcp", 60, "1 m");

// Coffre-fort organisation — 60 req/min par userId
export const getVaultLimiter = () => getLimiter("bt:vault", 60, "1 m");

// ── Limites différenciées par tier (anti-abus Sybil du plan gratuit Découverte) ──
// Tier strict (DISCOVERY / DISCOVERY_EXPIRED) vs tier généreux (comptes payants).
export const getVerifyPlanDiscoveryLimiter = () => getLimiter("bt:plan:verify:disc", 10, "1 m");
export const getVerifyPlanPaidLimiter = () => getLimiter("bt:plan:verify:paid", 60, "1 m");
export const getExtensionPlanDiscoveryLimiter = () => getLimiter("bt:plan:ext:disc", 30, "1 m");
export const getExtensionPlanPaidLimiter = () => getLimiter("bt:plan:ext:paid", 120, "1 m");
export const getContactsPlanDiscoveryLimiter = () => getLimiter("bt:plan:contacts:disc", 5, "1 m");
export const getContactsPlanPaidLimiter = () => getLimiter("bt:plan:contacts:paid", 30, "1 m");

export type RedisLimitResult = {
  success: boolean;
  remaining: number;
  reset: number;
  limit: number;
};

/**
 * Tente une requête de rate limit Redis. Retourne null si Redis n'est pas configuré
 * ou si l'appel échoue — le caller doit alors basculer sur le fallback in-memory.
 */
export async function tryRedisLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<RedisLimitResult | null> {
  if (!limiter) return null;
  try {
    const result = await limiter.limit(identifier);
    return {
      success: result.success,
      remaining: result.remaining,
      reset: result.reset,
      limit: result.limit,
    };
  } catch (err) {
    console.warn("[RateLimit] Upstash KO, fallback in-memory", err);
    return null;
  }
}
