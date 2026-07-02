// lib/security-audit.ts
// AuditLog sécurité — jamais de PII/secrets en clair
// ============================================================

import { createHash } from "node:crypto";
import { prisma } from "@/app/lib/db";

export type SecurityAuditParams = {
  action: string;
  userId?: string | null;
  resource?: string;
  resourceId?: string;
  ip?: string | null;
  metadata?: Record<string, unknown>;
};

export function hashAuditIp(ip: string | null | undefined): string | null {
  if (!ip?.trim()) return null;
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
  return createHash("sha256").update(`${ip.trim()}:${secret}`).digest("hex");
}

export function hashAuditEmail(email: string): string {
  const secret = process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "";
  return createHash("sha256").update(`${email.trim().toLowerCase()}:${secret}`).digest("hex");
}

export async function writeSecurityAuditLog(params: SecurityAuditParams): Promise<void> {
  const { action, userId, resource = "auth", resourceId, ip, metadata } = params;
  await prisma.auditLog
    .create({
      data: {
        action,
        resource,
        resourceId: resourceId ?? userId ?? "unknown",
        userId: userId ?? undefined,
        ipHash: hashAuditIp(ip),
        newValue: metadata ? (metadata as object) : undefined,
      },
    })
    .catch((err) => console.error("[security-audit]", action, err));
}

export function writeSecurityAuditLogFireAndForget(params: SecurityAuditParams): void {
  void writeSecurityAuditLog(params);
}
