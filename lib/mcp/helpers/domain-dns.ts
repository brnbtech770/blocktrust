// lib/mcp/helpers/domain-dns.ts
// Vérifications DNS (SPF / DMARC) pour réputation domaine.
// ============================================================

import { resolveTxt } from "node:dns/promises";

export type EmailAuthRecords = {
  spf: boolean;
  dkim: boolean;
  dmarc: boolean;
};

export async function checkEmailAuthRecords(domain: string): Promise<EmailAuthRecords> {
  const normalized = domain.trim().toLowerCase().replace(/^www\./, "");
  if (!normalized) {
    return { spf: false, dkim: false, dmarc: false };
  }

  let spf = false;
  let dmarc = false;

  try {
    const rootTxt = await resolveTxt(normalized);
    spf = rootTxt.some((records) =>
      records.some((r) => r.toLowerCase().startsWith("v=spf1")),
    );
  } catch {
    /* fail-soft */
  }

  try {
    const dmarcTxt = await resolveTxt(`_dmarc.${normalized}`);
    dmarc = dmarcTxt.some((records) =>
      records.some((r) => r.toLowerCase().startsWith("v=dmarc1")),
    );
  } catch {
    /* fail-soft */
  }

  // DKIM nécessite un sélecteur connu — on vérifie le sélecteur courant "default"
  let dkim = false;
  for (const selector of ["default", "google", "selector1", "k1"]) {
    try {
      const dkimTxt = await resolveTxt(`${selector}._domainkey.${normalized}`);
      if (dkimTxt.some((records) => records.some((r) => r.includes("v=DKIM1") || r.includes("p=")))) {
        dkim = true;
        break;
      }
    } catch {
      /* continue */
    }
  }

  return { spf, dkim, dmarc };
}

export function formatDomainAge(days: number): string {
  if (days < 0) return "Inconnu";
  if (days < 30) return `${days} jour${days > 1 ? "s" : ""}`;
  if (days < 365) {
    const months = Math.max(1, Math.floor(days / 30));
    return `${months} mois`;
  }
  const years = Math.floor(days / 365);
  return `${years} an${years > 1 ? "s" : ""}`;
}
