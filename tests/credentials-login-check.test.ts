import { describe, expect, it, vi, beforeEach } from "vitest";

const prismaMock = vi.hoisted(() => ({
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
}));

const lockoutMock = vi.hoisted(() => ({
  checkLoginLockout: vi.fn(),
  recordLoginFailure: vi.fn(),
}));

vi.mock("@/app/lib/db", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/login-lockout", () => ({
  ...lockoutMock,
  buildFailedErrorCode: (attemptsRemaining: number) => `FAILED:${attemptsRemaining}`,
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: vi.fn(),
  },
}));

import bcrypt from "bcryptjs";
import {
  checkCredentialsLogin,
  credentialsCheckToAuthErrorCode,
} from "@/lib/credentials-login-check";

describe("credentials-login-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    lockoutMock.checkLoginLockout.mockResolvedValue({
      locked: false,
      failCount: 0,
      attemptsRemaining: 5,
    });
  });

  it("retourne locked si compte verrouillé", async () => {
    lockoutMock.checkLoginLockout.mockResolvedValue({
      locked: true,
      retryAfterMinutes: 12,
      errorCode: "LOCKED:12",
    });

    const result = await checkCredentialsLogin({
      email: "user@example.com",
      password: "wrong",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.error === "locked") {
      expect(result.minutesRemaining).toBe(12);
      expect(result.message).toContain("12 minute");
    }
  });

  it("retourne invalid avec tentatives restantes", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: "hash",
      accountStatus: "ACTIVE",
      subscription: null,
      plan: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);
    lockoutMock.recordLoginFailure.mockResolvedValue({
      locked: false,
      attemptsRemaining: 3,
    });

    const result = await checkCredentialsLogin({
      email: "user@example.com",
      password: "wrong",
    });

    expect(result.ok).toBe(false);
    if (!result.ok && result.error === "invalid") {
      expect(result.attemptsRemaining).toBe(3);
      expect(result.message).toContain("3 tentatives");
    }
  });

  it("retourne ok si mot de passe valide", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: "u1",
      email: "user@example.com",
      password: "hash",
      accountStatus: "ACTIVE",
      kycStatus: "PENDING",
      accountType: "PERSONAL",
      cookieConsent: false,
      subscription: null,
      plan: null,
    });
    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

    const result = await checkCredentialsLogin({
      email: "user@example.com",
      password: "good",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.user.id).toBe("u1");
    }
    expect(lockoutMock.recordLoginFailure).not.toHaveBeenCalled();
  });

  it("credentialsCheckToAuthErrorCode — FAILED et LOCKED", () => {
    expect(
      credentialsCheckToAuthErrorCode({
        ok: false,
        error: "invalid",
        attemptsRemaining: 2,
        message: "x",
        tone: "warning",
      }),
    ).toBe("FAILED:2");

    expect(
      credentialsCheckToAuthErrorCode({
        ok: false,
        error: "locked",
        minutesRemaining: 9,
        message: "x",
        tone: "error",
      }),
    ).toBe("LOCKED:9");
  });
});
