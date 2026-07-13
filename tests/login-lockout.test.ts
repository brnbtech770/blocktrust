import { describe, it, expect, vi, beforeEach } from "vitest";

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
  ttl: vi.fn(),
}));

vi.mock("@/lib/rate-limit-redis", () => ({
  getRedis: () => redisMock,
}));

vi.mock("@/lib/security-audit", () => ({
  hashAuditEmail: (email: string) => `hash_${email}`,
  writeSecurityAuditLogFireAndForget: vi.fn(),
}));

vi.mock("@/lib/admin-alerts", () => ({
  createAdminAlert: vi.fn(),
}));

vi.mock("@/lib/email", () => ({
  sendEmailFireAndForget: vi.fn(),
}));

import {
  FAIL_THRESHOLD,
  buildFailedErrorCode,
  buildLockedErrorCode,
  checkLoginLockout,
  recordLoginFailure,
  recordLoginSuccess,
  clearLoginLockout,
  minutesFromRetrySec,
} from "@/lib/login-lockout";

describe("login-lockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue(null);
    redisMock.incr.mockResolvedValue(1);
    redisMock.del.mockResolvedValue(1);
    redisMock.ttl.mockResolvedValue(900);
  });

  it("autorise la connexion si aucun lockout actif", async () => {
    const status = await checkLoginLockout("user@example.com");
    expect(status.locked).toBe(false);
    if (!status.locked) {
      expect(status.attemptsRemaining).toBe(FAIL_THRESHOLD);
    }
  });

  it("bloque si la clé lockout est présente avec TTL dynamique", async () => {
    redisMock.get.mockResolvedValue("standard");
    redisMock.ttl.mockResolvedValue(720);
    const status = await checkLoginLockout("user@example.com");
    expect(status.locked).toBe(true);
    if (status.locked) {
      expect(status.errorCode).toBe(buildLockedErrorCode(720));
      expect(status.retryAfterMinutes).toBe(minutesFromRetrySec(720));
    }
  });

  it("incrémente les échecs avec tentatives restantes", async () => {
    redisMock.incr.mockResolvedValue(2);
    const status = await recordLoginFailure("user@example.com");
    expect(status.locked).toBe(false);
    if (!status.locked) {
      expect(status.attemptsRemaining).toBe(3);
    }
  });

  it("retourne FAILED:1 avant le dernier essai", async () => {
    redisMock.incr.mockResolvedValue(4);
    const status = await recordLoginFailure("user@example.com");
    expect(status.locked).toBe(false);
    if (!status.locked) {
      expect(status.attemptsRemaining).toBe(1);
      expect(buildFailedErrorCode(status.attemptsRemaining)).toBe("FAILED:1");
    }
  });

  it("verrouille après 5 tentatives échouées", async () => {
    redisMock.incr.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    const status = await recordLoginFailure("user@example.com", { userId: "u1" });
    expect(status.locked).toBe(true);
    if (status.locked) {
      expect(status.errorCode.startsWith("LOCKED:")).toBe(true);
    }
    expect(redisMock.set).toHaveBeenCalled();
  });

  it("réinitialise le compteur après succès", async () => {
    await recordLoginSuccess("user@example.com", { userId: "u1" });
    expect(redisMock.del).toHaveBeenCalled();
  });

  it("clearLoginLockout efface les clés Redis", async () => {
    await clearLoginLockout("user@example.com");
    expect(redisMock.del).toHaveBeenCalled();
  });
});
