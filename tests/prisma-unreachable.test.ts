import { describe, expect, it, vi } from "vitest";
import {
  DATABASE_UNAVAILABLE_VERIFY_PAYLOAD,
  isPrismaConnectionRetryableError,
  isPrismaReadOperation,
  isPrismaUnreachableError,
  PRISMA_RETRY_DEFAULTS,
  withPrismaRetry,
} from "@/lib/prisma-unreachable";

function unreachableError(message = "Can't reach database server at `ep-example:5432`") {
  return Object.assign(new Error(message), {
    name: "PrismaClientInitializationError",
    clientVersion: "6.19.3",
  });
}

describe("isPrismaUnreachableError", () => {
  it("reconnaît PrismaClientInitializationError / P1001", () => {
    expect(isPrismaUnreachableError(unreachableError())).toBe(true);
    expect(isPrismaUnreachableError({ code: "P1001", message: "x" })).toBe(true);
    expect(isPrismaUnreachableError({ errorCode: "P1017", message: "x" })).toBe(true);
    expect(isPrismaUnreachableError(new Error("schema mismatch"))).toBe(false);
  });

  it("traite P1008 comme indisponible UI, sans retry", () => {
    const timeout = { code: "P1008", message: "Operations timed out" };
    expect(isPrismaUnreachableError(timeout)).toBe(true);
    expect(isPrismaConnectionRetryableError(timeout)).toBe(false);
  });
});

describe("isPrismaConnectionRetryableError", () => {
  it("retente init / P1001 / P1017 / messages Neon, pas les erreurs métier", () => {
    expect(isPrismaConnectionRetryableError(unreachableError())).toBe(true);
    expect(isPrismaConnectionRetryableError({ code: "P1001" })).toBe(true);
    expect(isPrismaConnectionRetryableError({ code: "P1017" })).toBe(true);
    expect(isPrismaConnectionRetryableError({ errorCode: "P1017" })).toBe(true);
    expect(
      isPrismaConnectionRetryableError({
        message: "the server has closed the connection",
      }),
    ).toBe(true);
    expect(
      isPrismaConnectionRetryableError({
        message: "Server has closed the connection.",
      }),
    ).toBe(true);
    expect(isPrismaConnectionRetryableError({ code: "P2002" })).toBe(false);
  });
});

describe("isPrismaReadOperation", () => {
  it("autorise le retry sur les lectures seulement", () => {
    expect(isPrismaReadOperation("findFirst")).toBe(true);
    expect(isPrismaReadOperation("queryRaw")).toBe(true);
    expect(isPrismaReadOperation("create")).toBe(false);
    expect(isPrismaReadOperation("update")).toBe(false);
    expect(isPrismaReadOperation("upsert")).toBe(false);
    expect(isPrismaReadOperation("delete")).toBe(false);
    expect(isPrismaReadOperation("executeRaw")).toBe(false);
  });
});

describe("withPrismaRetry", () => {
  it("retente P1017 puis réussit", async () => {
    const err = Object.assign(new Error("Server has closed the connection."), { code: "P1017" });
    const fn = vi
      .fn()
      .mockRejectedValueOnce(err)
      .mockResolvedValueOnce("ok");
    await expect(withPrismaRetry(fn, { delayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("retente puis réussit après un Neon cold start", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(unreachableError())
      .mockResolvedValueOnce("ok");

    await expect(withPrismaRetry(fn, { delayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("expose 5 tentatives par défaut (délai nul sous Vitest)", () => {
    expect(PRISMA_RETRY_DEFAULTS.attempts).toBe(5);
    expect(PRISMA_RETRY_DEFAULTS.delayMs).toBe(0);
  });

  it("attend 1 s fixe entre 5 tentatives P1017 (cold start Neon)", async () => {
    const err = Object.assign(new Error("Server has closed the connection."), { code: "P1017" });
    const fn = vi.fn().mockRejectedValue(err);
    const slept: number[] = [];
    await expect(
      withPrismaRetry(fn, {
        delayMs: 1000,
        sleep: async (ms) => {
          slept.push(ms);
        },
      }),
    ).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(5);
    expect(slept).toEqual([1000, 1000, 1000, 1000]);
  });

  it("relance après épuisement des tentatives", async () => {
    const err = unreachableError();
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withPrismaRetry(fn, { delayMs: 0 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(5);
  });

  it("ne retente pas une erreur métier Prisma", async () => {
    const err = Object.assign(new Error("Unique constraint"), { code: "P2002" });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withPrismaRetry(fn, { delayMs: 0 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("ne retente pas un timeout P1008", async () => {
    const err = Object.assign(new Error("Operations timed out"), { code: "P1008" });
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withPrismaRetry(fn, { delayMs: 0 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("DATABASE_UNAVAILABLE_VERIFY_PAYLOAD", () => {
  it("n’est jamais un verdict FRAUD ou INVALID", () => {
    expect(DATABASE_UNAVAILABLE_VERIFY_PAYLOAD.verdict).toBe("ERROR");
    expect(DATABASE_UNAVAILABLE_VERIFY_PAYLOAD.error).toBe("service_unavailable");
  });
});
