/**
 * Neon scale-to-zero : le pooler peut refuser la 1re connexion (P1001).
 * Retry court, puis fail-soft — jamais un verdict FRAUD / INVALID de substitution.
 */

export type PrismaRetryOptions = {
  attempts?: number;
  delayMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

const UNREACHABLE_CODES = new Set(["P1001", "P1002", "P1008", "P1017"]);

export function isPrismaUnreachableError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const rec = err as { name?: unknown; code?: unknown; message?: unknown };
  const name = typeof rec.name === "string" ? rec.name : "";
  const code = typeof rec.code === "string" ? rec.code : "";
  const message = typeof rec.message === "string" ? rec.message : "";
  if (name === "PrismaClientInitializationError") return true;
  if (UNREACHABLE_CODES.has(code)) return true;
  if (message.includes("Can't reach database server")) return true;
  if (message.includes("Timed out fetching a new connection from the connection pool")) {
    return true;
  }
  return false;
}

function defaultSleep(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Vitest : pas d’attente réelle. Prod : 500 ms, 1 s entre tentatives. */
export const PRISMA_RETRY_DEFAULTS: Required<Pick<PrismaRetryOptions, "attempts" | "delayMs">> = {
  attempts: 3,
  delayMs: process.env.VITEST ? 0 : 500,
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
      if (!isPrismaUnreachableError(err) || i === attempts - 1) {
        throw err;
      }
      await sleep(delayMs * (i + 1));
    }
  }
  throw last;
}

export const DATABASE_UNAVAILABLE_VERIFY_PAYLOAD = {
  verdict: "ERROR" as const,
  error: "service_unavailable",
  reason: "database_unreachable",
};
