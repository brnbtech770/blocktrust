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
  const rec = err as { name?: unknown; code?: unknown; message?: unknown };
  return {
    name: typeof rec.name === "string" ? rec.name : "",
    code: typeof rec.code === "string" ? rec.code : "",
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
 * P1017 = "Server has closed the connection" (idle PgBouncer / scale-to-zero).
 */
export function isPrismaConnectionRetryableError(err: unknown): boolean {
  const { name, code, message } = prismaErrorFields(err);
  if (name === "PrismaClientInitializationError") return true;
  if (code === "P1001" || code === "P1017") return true;
  if (message.includes("Can't reach database server")) return true;
  if (message.includes("Server has closed the connection")) return true;
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
      if (!isPrismaConnectionRetryableError(err) || i === attempts - 1) {
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
