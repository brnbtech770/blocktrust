// lib/extension-verify-sender.ts
// Logique métier TrustScan — correspondance expéditeur ↔ contacts certifiés.
// ============================================================

import type { Certificate, Entity } from "@prisma/client";
import { sanitizeDisplayText } from "@/lib/sanitize-display-text";

type CertStatus = "PENDING" | "ACTIVE" | "REVOKED" | "EXPIRED" | "ANCHORED" | "SUSPENDED";

export type ExtensionVerifyStatus = "CERTIFIED" | "IN_CONTACTS" | "UNKNOWN" | "FRAUD";

export type ExtensionVerifySignals = {
  kycVerified: boolean;
  /** Présent dans le Trust Circle de l'utilisateur. */
  inNetwork: boolean;
  /** Présent dans les contacts / coordonnées certifiées de l'utilisateur. */
  inContact: boolean;
  polygonAnchored: boolean;
};

export type ExtensionBisVerification = {
  valid: boolean;
  bisLevel: number;
  interactionType: string;
  contextLabel: string | null;
  signedAt: string;
  expiresAt: string;
  reason?: string;
};

export type ExtensionVerifyPayload = {
  verified: boolean;
  status: ExtensionVerifyStatus;
  /** Alias explicite pour l’extension (identique à status). */
  verdict: ExtensionVerifyStatus;
  entityName: string | null;
  trustScore: number | null;
  badgeUrl: string | null;
  certifiedDomains: string[];
  certifiedEmails: string[];
  signals: ExtensionVerifySignals;
  anchoredOnChain: boolean;
  message: string;
  /** Lien BIS détecté dans le corps de l'email (Phase 2a). */
  bisSignatureDetected: boolean;
  /** Résultat vérification BIS si bisId fourni. */
  bisVerification: ExtensionBisVerification | null;
  /** L'expéditeur a déjà signé des interactions BIS reçues par l'utilisateur. */
  senderUsuallySignsBis: boolean;
  /** Alerte : contact certifié habitué à signer, email sans BIS. */
  bisMissingAlert: boolean;
  bisMissingAlertMessage: string | null;
};

type EntityWithCerts = Entity & {
  certificates: Certificate[];
  trustScore: { score: number } | null;
};

export type ExtensionVerifyContext = {
  userCertifiedEmails: string[];
  userCertifiedDomains: string[];
  trustRelationEmails: string[];
  /** Emails issus des entités-contacts de l'utilisateur (liste Mes Contacts). */
  contactEntityEmails: string[];
  contactEntityDomains: string[];
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
  let raw: string;
  if (e.tradeName?.trim()) raw = e.tradeName.trim();
  else if (e.legalName?.trim()) raw = e.legalName.trim();
  else {
    const fn = e.firstName?.trim() ?? "";
    const ln = e.lastName?.trim() ?? "";
    const full = `${fn} ${ln}`.trim();
    raw = full || e.email;
  }
  return sanitizeDisplayText(raw) ?? raw.replace(/[<>&]/g, "");
}

export function entityMatchesSender(
  e: EntityWithCerts,
  emailNorm: string,
  domainNorm: string,
): boolean {
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

function senderInUserContacts(
  emailNorm: string,
  domainNorm: string,
  ctx: ExtensionVerifyContext,
): boolean {
  if (senderMatchesUserCertified(emailNorm, domainNorm, ctx)) return true;
  if (emailNorm && ctx.contactEntityEmails.some((x) => x.toLowerCase() === emailNorm)) {
    return true;
  }
  if (
    domainNorm &&
    ctx.contactEntityDomains.some((d) => normalizeSenderDomain(d) === domainNorm)
  ) {
    return true;
  }
  return false;
}

function buildSignals(
  pick: EntityWithCerts | null,
  bestCert: Certificate | null,
  emailNorm: string,
  domainNorm: string,
  ctx: ExtensionVerifyContext,
): ExtensionVerifySignals {
  const inNetwork = senderMatchesTrustRelationEmail(emailNorm, ctx);
  const inContact = senderInUserContacts(emailNorm, domainNorm, ctx);

  if (!pick) {
    return {
      kycVerified: false,
      inNetwork,
      inContact,
      polygonAnchored: false,
    };
  }

  return {
    kycVerified: pick.kycStatus === "VERIFIED",
    inNetwork,
    inContact,
    polygonAnchored: Boolean(
      bestCert &&
        (bestCert.blockchainStatus === "ANCHORED" ||
          bestCert.status === "ANCHORED" ||
          bestCert.polygonTxHash),
    ),
  };
}

function certifiedMessage(signals: ExtensionVerifySignals): string {
  if (signals.inNetwork && signals.inContact) {
    return "Certifié BLOCKTRUST™ — dans votre réseau · contact vérifié";
  }
  if (signals.inNetwork) {
    return "Certifié BLOCKTRUST™ — dans votre réseau";
  }
  if (signals.inContact) {
    return "Certifié BLOCKTRUST™ — contact vérifié";
  }
  return "Certifié BLOCKTRUST™";
}

/** Extrait emails / domaines des entités-contacts de l'utilisateur. */
export function collectContactEntityKeys(
  entities: EntityWithCerts[],
): { emails: string[]; domains: string[] } {
  const emails = new Set<string>();
  const domains = new Set<string>();
  for (const e of entities) {
    if (e.email?.trim()) emails.add(e.email.trim().toLowerCase());
    for (const x of e.certifiedEmails) {
      if (x?.trim()) emails.add(x.trim().toLowerCase());
    }
    for (const d of e.certifiedDomains) {
      const norm = normalizeSenderDomain(d);
      if (norm) domains.add(norm);
    }
    const host = entityHostFromWebsite(e.website);
    if (host) domains.add(host);
  }
  return { emails: [...emails], domains: [...domains] };
}

function finalizePayload(
  partial: Omit<
    ExtensionVerifyPayload,
    | "verdict"
    | "anchoredOnChain"
    | "bisSignatureDetected"
    | "bisVerification"
    | "senderUsuallySignsBis"
    | "bisMissingAlert"
    | "bisMissingAlertMessage"
  >,
): ExtensionVerifyPayload {
  return {
    ...partial,
    verdict: partial.status,
    anchoredOnChain: partial.signals.polygonAnchored,
    bisSignatureDetected: false,
    bisVerification: null,
    senderUsuallySignsBis: false,
    bisMissingAlert: false,
    bisMissingAlertMessage: null,
  };
}

function inContactsFallbackPayload(
  emailNorm: string,
  domainNorm: string,
  message: string,
  ctx: ExtensionVerifyContext,
  signals?: ExtensionVerifySignals,
): ExtensionVerifyPayload {
  return finalizePayload({
    verified: false,
    status: "IN_CONTACTS",
    entityName: emailNorm || domainNorm || null,
    trustScore: null,
    badgeUrl: null,
    certifiedDomains: [],
    certifiedEmails: emailNorm ? [emailNorm] : [],
    signals: signals ?? buildSignals(null, null, emailNorm, domainNorm, ctx),
    message,
  });
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
    contactEntityEmails: [],
    contactEntityDomains: [],
  };

  if (!emailNorm && !domainNorm) {
    return finalizePayload({
      verified: false,
      status: "UNKNOWN",
      entityName: null,
      trustScore: null,
      badgeUrl: null,
      certifiedDomains: [],
      certifiedEmails: [],
      signals: buildSignals(null, null, emailNorm, domainNorm, ctx),
      message: "Paramètres email ou domaine requis.",
    });
  }

  const matches = entities.filter((e) => entityMatchesSender(e, emailNorm, domainNorm));
  if (matches.length === 0) {
    const signals = buildSignals(null, null, emailNorm, domainNorm, ctx);
    if (signals.inNetwork || signals.inContact) {
      const message = signals.inNetwork
        ? "Présent dans votre Trust Circle — non certifié BLOCKTRUST™."
        : "Contact connu — non certifié BLOCKTRUST™.";
      return inContactsFallbackPayload(emailNorm, domainNorm, message, ctx, signals);
    }
    return finalizePayload({
      verified: false,
      status: "UNKNOWN",
      entityName: null,
      trustScore: null,
      badgeUrl: null,
      certifiedDomains: [],
      certifiedEmails: [],
      signals,
      message: "Expéditeur non certifié BLOCKTRUST™.",
    });
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

  const signals = buildSignals(pick, bestCert, emailNorm, domainNorm, ctx);

  if (hasActive) {
    return finalizePayload({
      verified: true,
      status: "CERTIFIED",
      entityName,
      trustScore,
      badgeUrl,
      certifiedDomains,
      certifiedEmails,
      signals,
      message: certifiedMessage(signals),
    });
  }

  if (hasFraud || (bestCert && certIsFraudish(bestCert, now))) {
    return finalizePayload({
      verified: false,
      status: "FRAUD",
      entityName,
      trustScore,
      badgeUrl,
      certifiedDomains,
      certifiedEmails,
      signals,
      message: "Badge invalide, expiré ou révoqué pour ce contact.",
    });
  }

  return finalizePayload({
    verified: false,
    status: "IN_CONTACTS",
    entityName,
    trustScore,
    badgeUrl: null,
    certifiedDomains,
    certifiedEmails,
    signals,
    message: "Contact connu — sans badge BLOCKTRUST actif.",
  });
}
