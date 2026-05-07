/** Max items per certified contact field (domains, emails, phones). */
export const CERTIFIED_CONTACT_MAX_ITEMS = 10;

const domainRegex =
  /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.(?:[a-zA-Z]{2,})(?:\.[a-zA-Z]{2,})?$/;

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const phoneRegex = /^\+?[0-9\s\-().]{7,20}$/;

export function normalizeCertifiedDomainInput(raw: string): string {
  let s = raw.trim().replace(/^\*\./, "").toLowerCase();
  try {
    if (s.startsWith("http://") || s.startsWith("https://")) {
      s = new URL(s).hostname.toLowerCase();
    }
  } catch {
    /* keep stripped string */
  }
  return s.replace(/^\.+/, "").replace(/\.+$/, "");
}

export function isValidCertifiedDomain(normalized: string): boolean {
  return domainRegex.test(normalized);
}

export function normalizeCertifiedEmailInput(raw: string): string {
  return raw.trim().toLowerCase();
}

export function isValidCertifiedEmail(normalized: string): boolean {
  return emailRegex.test(normalized);
}

export function normalizeCertifiedPhoneInput(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

export function isValidCertifiedPhone(normalized: string): boolean {
  return phoneRegex.test(normalized.replace(/\s/g, ""));
}

export interface CertifiedArraysValidationError {
  field: "certifiedDomains" | "certifiedEmails" | "certifiedPhones";
  reason: string;
}

export interface CertifiedArraysResult {
  domains: string[];
  emails: string[];
  phones: string[];
}

function parseArrayField(
  raw: unknown,
): { ok: true; items: string[] } | { ok: false; reason: string } {
  if (raw === undefined) return { ok: true, items: [] };
  if (!Array.isArray(raw)) return { ok: false, reason: "doit être un tableau" };
  if (raw.length > CERTIFIED_CONTACT_MAX_ITEMS)
    return { ok: false, reason: `maximum ${CERTIFIED_CONTACT_MAX_ITEMS} entrées` };
  return { ok: true, items: raw.map(String) };
}

function dedupePreserveOrder(xs: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    if (!seen.has(x)) {
      seen.add(x);
      out.push(x);
    }
  }
  return out;
}

function assertCertifiedArrayPresent(
  raw: unknown,
  field: "certifiedDomains" | "certifiedEmails" | "certifiedPhones",
): { ok: true; items: string[] } | { ok: false; error: CertifiedArraysValidationError } {
  if (raw === undefined || raw === null) {
    return { ok: false, error: { field, reason: "tableau requis" } };
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: { field, reason: "doit être un tableau" } };
  }
  if (raw.length > CERTIFIED_CONTACT_MAX_ITEMS) {
    return {
      ok: false,
      error: { field, reason: `maximum ${CERTIFIED_CONTACT_MAX_ITEMS} entrées` },
    };
  }
  return { ok: true, items: raw.map(String) };
}

/** Hôte officiel pour la vérif badge (mirror / typosquatting), d’après les headers Host. */
export function isTrustedVerifyPlatformHost(host: string): boolean {
  const h = host.split(":")[0]?.toLowerCase() ?? "";
  if (!h) return false;
  if (h === "localhost" || h.endsWith(".localhost")) return true;
  if (h === "blocktrust.tech" || h.endsWith(".blocktrust.tech")) return true;
  if (h.endsWith(".vercel.app")) return true;
  return false;
}

export function hostnameMatchesCertifiedDomains(
  hostname: string,
  certifiedDomains: string[],
): boolean {
  const hn = hostname.split(":")[0]?.replace(/^\*\./, "").toLowerCase() ?? "";
  if (!hn) return false;
  for (const dom of certifiedDomains) {
    const d = dom.toLowerCase();
    if (hn === d || hn.endsWith("." + d)) return true;
  }
  return false;
}

/**
 * Avertir si la page de vérification est servie depuis un hôte étranger aux domaines certifiés
 * (ex. faux site miroir). Sur blocktrust.tech / *.vercel.app / localhost, pas d’alerte.
 */
export function cleanedRequestHost(
  forwardedHost: string | null | undefined,
  host: string | null | undefined,
): string {
  const raw =
    forwardedHost?.split(",")[0]?.trim() || host?.trim() || "";
  const primaryHost = raw.replace(/^https?:\/\//i, "").split("/")[0] ?? "";
  return primaryHost.replace(/:\d+$/, "").toLowerCase();
}

export function shouldWarnUncertifiedVerifyHost(params: {
  certifiedDomains: string[];
  forwardedHost: string | null | undefined;
  host: string | null | undefined;
}): boolean {
  if (!params.certifiedDomains.length) return false;
  const cleaned = cleanedRequestHost(params.forwardedHost, params.host);
  if (!cleaned || isTrustedVerifyPlatformHost(cleaned)) return false;
  return !hostnameMatchesCertifiedDomains(cleaned, params.certifiedDomains);
}

/**
 * Abonnés + contact en réseau : site miroir (Host non plateforme) OU arrivée depuis un tiers
 * (Referer) dont le domaine n’est pas dans les domaines certifiés du contact.
 */
export function trustedCircleShouldWarnUncertifiedDomainContext(params: {
  certifiedDomains: string[];
  forwardedHost: string | null | undefined;
  host: string | null | undefined;
  referer: string | null | undefined;
}): boolean {
  const domains = params.certifiedDomains;
  if (!domains.length) return false;

  if (shouldWarnUncertifiedVerifyHost(params)) return true;

  const cleaned = cleanedRequestHost(params.forwardedHost, params.host);
  if (!cleaned || !isTrustedVerifyPlatformHost(cleaned)) return false;

  const ref = params.referer?.trim();
  if (!ref) return false;
  try {
    const rh = new URL(ref).hostname.toLowerCase();
    if (!rh || isTrustedVerifyPlatformHost(rh)) return false;
    return !hostnameMatchesCertifiedDomains(rh, domains);
  } catch {
    return false;
  }
}

function validateDomainsArray(
  raw: unknown,
): { ok: true; value: string[] } | { ok: false; error: CertifiedArraysValidationError } {
  const d = assertCertifiedArrayPresent(raw, "certifiedDomains");
  if (!d.ok) return d;

  const domains: string[] = [];
  for (const item of d.items) {
    const n = normalizeCertifiedDomainInput(item);
    if (!n) continue;
    if (!isValidCertifiedDomain(n))
      return {
        ok: false,
        error: { field: "certifiedDomains", reason: `domaine invalide: ${item}` },
      };
    domains.push(n);
  }
  const uniqDomains = dedupePreserveOrder(domains);
  if (uniqDomains.length > CERTIFIED_CONTACT_MAX_ITEMS)
    return {
      ok: false,
      error: {
        field: "certifiedDomains",
        reason: `maximum ${CERTIFIED_CONTACT_MAX_ITEMS} domaines après normalisation`,
      },
    };
  return { ok: true, value: uniqDomains };
}

function validateEmailsArray(
  raw: unknown,
): { ok: true; value: string[] } | { ok: false; error: CertifiedArraysValidationError } {
  const e = assertCertifiedArrayPresent(raw, "certifiedEmails");
  if (!e.ok) return e;

  const emails: string[] = [];
  for (const item of e.items) {
    const n = normalizeCertifiedEmailInput(item);
    if (!n) continue;
    if (!isValidCertifiedEmail(n))
      return {
        ok: false,
        error: { field: "certifiedEmails", reason: `email invalide: ${item}` },
      };
    emails.push(n);
  }
  return { ok: true, value: dedupePreserveOrder(emails) };
}

function validatePhonesArray(
  raw: unknown,
): { ok: true; value: string[] } | { ok: false; error: CertifiedArraysValidationError } {
  const p = assertCertifiedArrayPresent(raw, "certifiedPhones");
  if (!p.ok) return p;

  const phones: string[] = [];
  for (const item of p.items) {
    const n = normalizeCertifiedPhoneInput(item);
    if (!n) continue;
    if (!isValidCertifiedPhone(n))
      return {
        ok: false,
        error: { field: "certifiedPhones", reason: `téléphone invalide: ${item}` },
      };
    phones.push(n);
  }
  return { ok: true, value: dedupePreserveOrder(phones) };
}

/** PATCH : ne valide que les clés présentes dans l’objet (remplacement complet du tableau). */
export function validateCertifiedContactArraysPartial(payload: Record<string, unknown>):
  | { ok: true; value: Partial<CertifiedArraysResult> }
  | { ok: false; error: CertifiedArraysValidationError } {
  const out: Partial<CertifiedArraysResult> = {};
  if (Object.prototype.hasOwnProperty.call(payload, "certifiedDomains")) {
    const r = validateDomainsArray(payload.certifiedDomains);
    if (!r.ok) return r;
    out.domains = r.value;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "certifiedEmails")) {
    const r = validateEmailsArray(payload.certifiedEmails);
    if (!r.ok) return r;
    out.emails = r.value;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "certifiedPhones")) {
    const r = validatePhonesArray(payload.certifiedPhones);
    if (!r.ok) return r;
    out.phones = r.value;
  }
  return { ok: true, value: out };
}

export function validateCertifiedContactArrays(payload: {
  certifiedDomains?: unknown;
  certifiedEmails?: unknown;
  certifiedPhones?: unknown;
}): { ok: true; value: CertifiedArraysResult } | { ok: false; error: CertifiedArraysValidationError } {
  const d = parseArrayField(payload.certifiedDomains ?? []);
  if (!d.ok)
    return { ok: false, error: { field: "certifiedDomains", reason: d.reason } };
  const e = parseArrayField(payload.certifiedEmails ?? []);
  if (!e.ok)
    return { ok: false, error: { field: "certifiedEmails", reason: e.reason } };
  const p = parseArrayField(payload.certifiedPhones ?? []);
  if (!p.ok)
    return { ok: false, error: { field: "certifiedPhones", reason: p.reason } };

  const domains: string[] = [];
  for (const raw of d.items) {
    const n = normalizeCertifiedDomainInput(raw);
    if (!n) continue;
    if (!isValidCertifiedDomain(n))
      return {
        ok: false,
        error: { field: "certifiedDomains", reason: `domaine invalide: ${raw}` },
      };
    domains.push(n);
  }
  const uniqDomains = dedupePreserveOrder(domains);
  if (uniqDomains.length > CERTIFIED_CONTACT_MAX_ITEMS)
    return {
      ok: false,
      error: {
        field: "certifiedDomains",
        reason: `maximum ${CERTIFIED_CONTACT_MAX_ITEMS} domaines après normalisation`,
      },
    };

  const emails: string[] = [];
  for (const raw of e.items) {
    const n = normalizeCertifiedEmailInput(raw);
    if (!n) continue;
    if (!isValidCertifiedEmail(n))
      return {
        ok: false,
        error: { field: "certifiedEmails", reason: `email invalide: ${raw}` },
      };
    emails.push(n);
  }
  const uniqEmails = dedupePreserveOrder(emails);

  const phones: string[] = [];
  for (const raw of p.items) {
    const n = normalizeCertifiedPhoneInput(raw);
    if (!n) continue;
    if (!isValidCertifiedPhone(n))
      return {
        ok: false,
        error: { field: "certifiedPhones", reason: `téléphone invalide: ${raw}` },
      };
    phones.push(n);
  }
  const uniqPhones = dedupePreserveOrder(phones);

  return {
    ok: true,
    value: { domains: uniqDomains, emails: uniqEmails, phones: uniqPhones },
  };
}
