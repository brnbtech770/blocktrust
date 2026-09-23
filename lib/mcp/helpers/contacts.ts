// lib/mcp/helpers/contacts.ts
// Helpers contacts MCP (Entity + Trust Circle).
// ============================================================

import type { Certificate, Entity } from "@prisma/client";
import { prisma } from "@/app/lib/db";
import { sanitizeDisplayText } from "@/lib/sanitize-display-text";
import { normalizeSenderDomain } from "@/lib/extension-verify-sender";
import { isCertificateCurrentlyValid } from "@/lib/certificate-validity";

type EntityWithMeta = Entity & {
  certificates: Certificate[];
  trustScore: { score: number } | null;
};

export function entityDisplayName(e: Entity): string {
  let raw: string;
  if (e.tradeName?.trim()) raw = e.tradeName.trim();
  else if (e.legalName?.trim()) raw = e.legalName.trim();
  else {
    const fn = e.firstName?.trim() ?? "";
    const ln = e.lastName?.trim() ?? "";
    raw = `${fn} ${ln}`.trim() || e.email;
  }
  return sanitizeDisplayText(raw) ?? raw.replace(/[<>&]/g, "");
}

export function entityDomain(e: Entity): string | null {
  if (e.certifiedDomains[0]) return normalizeSenderDomain(e.certifiedDomains[0]);
  const emailDomain = e.email.split("@")[1];
  if (emailDomain) return normalizeSenderDomain(emailDomain);
  if (e.website) return normalizeSenderDomain(e.website);
  return null;
}

export function entityIsCertified(e: { certificates: Array<{ status: string; revokedAt?: Date | null; expiresAt?: Date | null }> }): boolean {
  return e.certificates.some((c) => isCertificateCurrentlyValid(c));
}

export async function loadUserTrustCircleMap(userId: string): Promise<
  Map<
    string,
    { relationship: string; inTrustCircle: boolean }
  >
> {
  const relations = await prisma.userTrustRelation.findMany({
    where: { fromUserId: userId },
    select: {
      toEmail: true,
      trustType: true,
      isMutual: true,
      status: true,
    },
  });

  const map = new Map<string, { relationship: string; inTrustCircle: boolean }>();
  for (const r of relations) {
    const email = r.toEmail?.trim().toLowerCase();
    if (!email) continue;
    const relationship = r.isMutual
      ? "MUTUAL"
      : r.status === "CONFIRMED"
        ? r.trustType
        : "PENDING";
    map.set(email, {
      relationship,
      inTrustCircle: r.status === "CONFIRMED" || r.isMutual,
    });
  }
  return map;
}

export async function loadUserEntities(userId: string): Promise<EntityWithMeta[]> {
  return prisma.entity.findMany({
    where: { userId },
    include: {
      certificates: { orderBy: { issuedAt: "desc" } },
      trustScore: { select: { score: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export function mapEntityToContact(
  e: EntityWithMeta,
  trustMap: Map<string, { relationship: string; inTrustCircle: boolean }>,
) {
  const email = e.email.toLowerCase();
  const trust = trustMap.get(email);
  return {
    contactId: e.id,
    name: entityDisplayName(e),
    email,
    domain: entityDomain(e),
    website: sanitizeDisplayText(e.website),
    label: sanitizeDisplayText(e.tradeName ?? e.description?.slice(0, 80) ?? null),
    certified: entityIsCertified(e),
    trustScore: e.trustScore?.score ?? null,
    inTrustCircle: trust?.inTrustCircle ?? false,
    relationship: trust?.relationship ?? null,
    bisCapable: entityIsCertified(e),
  };
}

/**
 * Domaines d'email d'entités dont le certificat est actuellement valide.
 * website et certifiedDomains sont déclaratifs : ils n'entrent pas dans cette liste
 * et ne prouvent pas le contrôle du domaine.
 */
export async function collectCertifiedDomainsGlobal(): Promise<string[]> {
  const rows = await prisma.entity.findMany({
    where: {
      certificates: {
        some: { status: { in: ["ACTIVE", "ANCHORED"] }, revokedAt: null },
      },
    },
    select: {
      email: true,
      certificates: { select: { status: true, revokedAt: true, expiresAt: true } },
    },
    take: 5000,
  });
  const domains = new Set<string>();
  for (const row of rows) {
    if (!entityIsCertified(row)) continue;
    const fromEmail = row.email.split("@")[1];
    if (!fromEmail) continue;
    const host = normalizeSenderDomain(fromEmail);
    if (host) domains.add(host);
  }
  return [...domains];
}
