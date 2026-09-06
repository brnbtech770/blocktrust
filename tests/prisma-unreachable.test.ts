import { describe, expect, it, vi } from "vitest";
import {
  DATABASE_UNAVAILABLE_VERIFY_PAYLOAD,
  isPrismaConnectionRetryableError,
  isPrismaReadOperation,
  isPrismaUnreachableError,
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
    expect(isPrismaUnreachableError(new Error("schema mismatch"))).toBe(false);
  });

  it("traite P1008 comme indisponible UI, sans retry", () => {
    const timeout = { code: "P1008", message: "Operations timed out" };
    expect(isPrismaUnreachableError(timeout)).toBe(true);
    expect(isPrismaConnectionRetryableError(timeout)).toBe(false);
  });
});

describe("isPrismaConnectionRetryableError", () => {
  it("ne retente que l’init / P1001 / Can't reach", () => {
    expect(isPrismaConnectionRetryableError(unreachableError())).toBe(true);
    expect(isPrismaConnectionRetryableError({ code: "P1001" })).toBe(true);
    expect(isPrismaConnectionRetryableError({ code: "P1017" })).toBe(false);
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
  it("retente puis réussit après un Neon cold start", async () => {
    const fn = vi
      .fn()
      .mockRejectedValueOnce(unreachableError())
      .mockResolvedValueOnce("ok");

    await expect(withPrismaRetry(fn, { delayMs: 0 })).resolves.toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("relance après épuisement des tentatives", async () => {
    const err = unreachableError();
    const fn = vi.fn().mockRejectedValue(err);
    await expect(withPrismaRetry(fn, { attempts: 3, delayMs: 0 })).rejects.toBe(err);
    expect(fn).toHaveBeenCalledTimes(3);
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
