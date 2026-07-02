import { describe, it, expect, vi, beforeEach } from "vitest";

const redisMock = vi.hoisted(() => ({
  get: vi.fn(),
  set: vi.fn(),
  incr: vi.fn(),
  expire: vi.fn(),
  del: vi.fn(),
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

import { checkLoginLockout, recordLoginFailure, recordLoginSuccess } from "@/lib/login-lockout";

describe("login-lockout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    redisMock.get.mockResolvedValue(null);
    redisMock.incr.mockResolvedValue(1);
    redisMock.del.mockResolvedValue(1);
  });

  it("autorise la connexion si aucun lockout actif", async () => {
    const status = await checkLoginLockout("user@example.com");
    expect(status.locked).toBe(false);
  });

  it("bloque si la clé lockout est présente", async () => {
    redisMock.get.mockResolvedValue("1");
    const status = await checkLoginLockout("user@example.com");
    expect(status.locked).toBe(true);
  });

  it("incrémente les échecs sans lockout avant le seuil", async () => {
    redisMock.incr.mockResolvedValue(3);
    const status = await recordLoginFailure("user@example.com");
    expect(status.locked).toBe(false);
  });

  it("verrouille après 5 tentatives échouées", async () => {
    redisMock.incr.mockResolvedValueOnce(5).mockResolvedValueOnce(1);
    const status = await recordLoginFailure("user@example.com", { userId: "u1" });
    expect(status.locked).toBe(true);
    expect(redisMock.set).toHaveBeenCalled();
  });

  it("réinitialise le compteur après succès", async () => {
    await recordLoginSuccess("user@example.com", { userId: "u1" });
    expect(redisMock.del).toHaveBeenCalled();
  });
});
