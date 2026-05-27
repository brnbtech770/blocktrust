// lib/extension-verify-sender.ts
// Logique métier TrustScan — correspondance expéditeur ↔ contacts certifiés.
// ============================================================

import type { Certificate, Entity } from "@prisma/client";

type CertStatus = "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED" | "ANCHORED" | "SUSPENDED";

export type ExtensionVerifyStatus = "CERTIFIED" | "IN_CONTACTS" | "UNKNOWN" | "FRAUD";

export type ExtensionVerifySignals = {
  kycVerified: boolean;
  inNetwork: boolean;
  polygonAnchored: boolean;
};

export type ExtensionVerifyPayload = {
  verified: boolean;
  status: ExtensionVerifyStatus;
  entityName: string | null;
  trustScore: number | null;
  badgeUrl: string | null;
  certifiedDomains: string[];
  certifiedEmails: string[];
  signals: ExtensionVerifySignals;
  message: string;
};

type EntityWithCerts = Entity & {
  certificates: Certificate[];
  trustScore: { score: number } | null;
};

export type ExtensionVerifyContext = {
  userCertifiedEmails: string[];
  userCertifiedDomains: string[];
  trustRelationEmails: string[];
};

export function normalizeSenderEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeSenderDomain(domain: string): string {
  const t = domain.trim().toLowerCase();
  if (!t) return "";
  try {
    const u = t.includes("://") ? new URL(t) : new URL(`https://${t}`);
    return u.hostname.replace(/^www\./, "");
  } catch {
    return t.replace(/^www\./, "").split("/")[0] ?? t;
  }
}

function entityHostFromWebsite(website: string | null | undefined): string | null {
  if (!website?.trim()) return null;
  try {
    const u = website.startsWith("http") ? new URL(website) : new URL(`https://${website}`);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

function entityDisplayName(e: EntityWithCerts): string {
  if (e.tradeName?.trim()) return e.tradeName.trim();
  if (e.legalName?.trim()) return e.legalName.trim();
  const fn = e.firstName?.trim() ?? "";
  const ln = e.lastName?.trim() ?? "";
  const full = `${fn} ${ln}`.trim();
  if (full) return full;
  return e.email;
}

function entityMatchesSender(e: EntityWithCerts, emailNorm: string, domainNorm: string): boolean {
  if (emailNorm && e.email.toLowerCase() === emailNorm) return true;
  if (emailNorm && e.certifiedEmails.some((x) => x.toLowerCase() === emailNorm)) return true;
  if (domainNorm) {
    if (e.certifiedDomains.some((d) => normalizeSenderDomain(d) === domainNorm)) return true;
    const host = entityHostFromWebsite(e.website);
    if (host === domainNorm) return true;
  }
  return false;
}

function pickBestCert(certs: Certificate[]): Certificate | null {
  if (certs.length === 0) return null;
  const order: CertStatus[] = ["ACTIVE", "ANCHORED", "PENDING", "SUSPENDED", "REVOKED", "EXPIRED"];
  const sorted = [...certs].sort((a, b) => order.indexOf(a.status as CertStatus) - order.indexOf(b.status as CertStatus));
  return sorted[0] ?? null;
}

function certIsFullyActive(c: Certificate, now: Date): boolean {
  if (c.status === "REVOKED" || c.status === "SUSPENDED") return false;
  if (c.status === "EXPIRED") return false;
  if (c.expiresAt && c.expiresAt < now) return false;
  return c.status === "ACTIVE" || c.status === "ANCHORED";
}

function senderMatchesUserCertified(
  emailNorm: string,
  domainNorm: string,
  ctx: ExtensionVerifyContext,
): boolean {
  if (emailNorm && ctx.userCertifiedEmails.some((x) => x.toLowerCase() === emailNorm)) return true;
  if (domainNorm && ctx.userCertifiedDomains.some((d) => normalizeSenderDomain(d) === domainNorm)) {
    return true;
  }
  return false;
}

function senderMatchesTrustRelationEmail(emailNorm: string, ctx: ExtensionVerifyContext): boolean {
  if (!emailNorm) return false;
  return ctx.trustRelationEmails.some((x) => x.toLowerCase() === emailNorm);
}

function buildSignals(
  pick: EntityWithCerts | null,
  bestCert: Certificate | null,
  emailNorm: string,
  domainNorm: string,
  ctx: ExtensionVerifyContext,
  status: ExtensionVerifyStatus,
): ExtensionVerifySignals {
  const inNetwork =
    status === "IN_CONTACTS" ||
    status === "CERTIFIED" ||
    senderMatchesTrustRelationEmail(emailNorm, ctx) ||
    senderMatchesUserCertified(emailNorm, domainNorm, ctx);

  if (!pick) {
    return {
      kycVerified: false,
      inNetwork,
      polygonAnchored: false,
    };
  }

  return {
    kycVerified: pick.kycStatus === "VERIFIED",
    inNetwork,
    polygonAnchored: Boolean(
      bestCert &&
        (bestCert.blockchainStatus === "ANCHORED" ||
          bestCert.status === "ANCHORED" ||
          bestCert.polygonTxHash),
    ),
  };
}

function inContactsFallbackPayload(
  emailNorm: string,
  domainNorm: string,
  message: string,
  ctx: ExtensionVerifyContext,
): ExtensionVerifyPayload {
  return {
    verified: false,
    status: "IN_CONTACTS",
    entityName: emailNorm || domainNorm || null,
    trustScore: null,
    badgeUrl: null,
    certifiedDomains: [],
    certifiedEmails: emailNorm ? [emailNorm] : [],
    signals: buildSignals(null, null, emailNorm, domainNorm, ctx, "IN_CONTACTS"),
    message,
  };
}

function certIsFraudish(c: Certificate, now: Date): boolean {
  if (c.status === "REVOKED" || c.status === "SUSPENDED" || c.status === "EXPIRED") return true;
  if (c.expiresAt && c.expiresAt < now) return true;
  return false;
}

export function buildExtensionVerifyResult(
  entities: EntityWithCerts[],
  emailRaw: string,
  domainRaw: string,
  baseUrl: string,
  context?: ExtensionVerifyContext,
): ExtensionVerifyPayload {
  const emailNorm = normalizeSenderEmail(emailRaw);
  const domainNorm = normalizeSenderDomain(domainRaw);
  const now = new Date();
  const ctx: ExtensionVerifyContext = context ?? {
    userCertifiedEmails: [],
    userCertifiedDomains: [],
    trustRelationEmails: [],
  };

  if (!emailNorm && !domainNorm) {
    return {
      verified: false,
      status: "UNKNOWN",
      entityName: null,
      trustScore: null,
      badgeUrl: null,
      certifiedDomains: [],
      certifiedEmails: [],
      signals: buildSignals(null, null, emailNorm, domainNorm, ctx, "UNKNOWN"),
      message: "Paramètres email ou domaine requis.",
    };
  }

  const matches = entities.filter((e) => entityMatchesSender(e, emailNorm, domainNorm));
  if (matches.length === 0) {
    if (senderMatchesTrustRelationEmail(emailNorm, ctx)) {
      return inContactsFallbackPayload(
        emailNorm,
        domainNorm,
        "Contact présent dans votre Trust Circle.",
        ctx,
      );
    }
    if (senderMatchesUserCertified(emailNorm, domainNorm, ctx)) {
      return inContactsFallbackPayload(
        emailNorm,
        domainNorm,
        "Email ou domaine présent dans vos coordonnées certifiées.",
        ctx,
      );
    }
    return {
      verified: false,
      status: "UNKNOWN",
      entityName: null,
      trustScore: null,
      badgeUrl: null,
      certifiedDomains: [],
      certifiedEmails: [],
      signals: buildSignals(null, null, emailNorm, domainNorm, ctx, "UNKNOWN"),
      message: "Aucun contact certifié ne correspond à cet expéditeur.",
    };
  }

  const pick =
    matches.find((e) => {
      const c = pickBestCert(e.certificates);
      return c && certIsFullyActive(c, now);
    }) ??
    matches.find((e) => e.certificates.some((c) => certIsFraudish(c, now))) ??
    matches[0];

  const bestCert = pickBestCert(pick.certificates);
  const hasFraud = pick.certificates.some((c) => certIsFraudish(c, now));
  const hasActive = bestCert != null && certIsFullyActive(bestCert, now);

  const certifiedDomains = [...pick.certifiedDomains];
  const certifiedEmails = [...pick.certifiedEmails];
  const trustScore = pick.trustScore?.score ?? null;
  const entityName = entityDisplayName(pick);
  const slug = bestCert?.publicId ?? bestCert?.id ?? null;
  const badgeUrl = slug ? `${baseUrl.replace(/\/$/, "")}/badge/${slug}` : null;

  const signals = buildSignals(pick, bestCert, emailNorm, domainNorm, ctx, "CERTIFIED");

  if (hasActive) {
    return {
      verified: true,
      status: "CERTIFIED",
      entityName,
      trustScore,
      badgeUrl,
      certifiedDomains,
      certifiedEmails,
      signals,
      message: "Ce contact possède un badge BLOCKTRUST actif.",
    };
  }

  if (hasFraud || (bestCert && certIsFraudish(bestCert, now))) {
    return {
      verified: false,
      status: "FRAUD",
      entityName,
      trustScore,
      badgeUrl,
      certifiedDomains,
      certifiedEmails,
      signals: buildSignals(pick, bestCert, emailNorm, domainNorm, ctx, "FRAUD"),
      message: "Badge invalide, expiré ou révoqué pour ce contact.",
    };
  }

  return {
    verified: false,
    status: "IN_CONTACTS",
    entityName,
    trustScore,
    badgeUrl: null,
    certifiedDomains,
    certifiedEmails,
    signals: buildSignals(pick, bestCert, emailNorm, domainNorm, ctx, "IN_CONTACTS"),
    message: "Contact présent dans votre liste, sans badge actif.",
  };
}
