/**
 * Neon scale-to-zero : le pooler peut refuser la 1re connexion (P1001)
 * ou couper une connexion idle (P1017). Retry puis fail-soft —
 * jamais un verdict FRAUD / INVALID de substitution.
 */

export type PrismaRetryOptions = {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const UNREACHABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);
/** Connexion / cold start — pas P1008 (timeout requête, l'écriture peut avoir eu lieu). */
const CONNECTION_RETRYABLE_CODES = new Set(["P1001", "P1017"]);

const PRISMA_READ_OPERATIONS = new Set([
  "findUnique",
  "findUniqueOrThrow",
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "count",
  "aggregate",
  "groupBy",
  "queryRaw",
  "queryRawUnsafe",
]);

function prismaErrorFields(err: unknown): { name: string; code: string; message: string } {
  if (!err || typeof err !== "object") return { name: "", code: "", message: "" };
  const rec = err as {
    name?: unknown;
    code?: unknown;
    errorCode?: unknown;
    message?: unknown;
  };
  const code = typeof rec.code === "string" ? rec.code : "";
  const errorCode = typeof rec.errorCode === "string" ? rec.errorCode : "";
  return {
    name: typeof rec.name === "string" ? rec.name : "",
    code: code || errorCode,
    message: typeof rec.message === "string" ? rec.message : "",
  };
}

/** UI fail-soft : panne DB (y compris timeout). Ne pas substituer un verdict FRAUD. */
export function isPrismaUnreachableError(err: unknown): boolean {
  const { name, code, message } = prismaErrorFields(err);
  if (name === "PrismaClientInitializationError") return true;
  if (UNREACHABLE_CODES.has(code)) return true;
  if (message.includes("Can't reach database server")) return true;
  if (message.includes("Timed out fetching a new connection from the connection pool")) {
    return true;
  }
  return false;
}

/**
 * Retry connexions Neon / pooler — pas P1008 (timeout requête, écriture peut avoir eu lieu).
 * P1001 = unreachable ; P1017 = "Server has closed the connection" (idle / scale-to-zero).
 */
export function isPrismaConnectionRetryableError(err: unknown): boolean {
  const { name, code, message } = prismaErrorFields(err);
  if (name === "PrismaClientInitializationError") return true;
  if (CONNECTION_RETRYABLE_CODES.has(code)) return true;
  if (message.includes("Can't reach database server")) return true;
  if (/server has closed the connection/i.test(message)) return true;
  return false;
}

export function isPrismaReadOperation(operation: string): boolean {
  return PRISMA_READ_OPERATIONS.has(operation);
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Vitest : pas d’attente réelle.
 * Prod / crons : 5 tentatives, 1 s fixe entre elles (~4 s d’attente, ~5 s avec les requêtes).
 * Suffisant pour un cold start Neon (3–5 s), sans backoff linéaire trop long.
 */
export const PRISMA_RETRY_DEFAULTS: Required<Pick<PrismaRetryOptions, "attempts" | "delayMs">> = {
  attempts: 5,
  delayMs: process.env.VITEST ? 0 : 1000,
};

export async function withPrismaRetry<T>(
  fn: () => Promise<T>,
  opts: PrismaRetryOptions = {},
): Promise<T> {
  const attempts = opts.attempts ?? PRISMA_RETRY_DEFAULTS.attempts;
  const delayMs = opts.delayMs ?? PRISMA_RETRY_DEFAULTS.delayMs;
  const sleep = opts.sleep ?? defaultSleep;
  let last: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      last = err;
      if (!isPrismaConnectionRetryableError(err) || i === attempts - 1) {
        throw err;
      }
      await sleep(delayMs);
    }
  }
  throw last;
}

export const DATABASE_UNAVAILABLE_VERIFY_PAYLOAD = {
  verdict: "ERROR" as const,
  error: "service_unavailable",
  reason: "database_unreachable",
};
