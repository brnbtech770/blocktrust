// lib/mcp/tools/check-domain-reputation.ts
// Tool check_domain_reputation — RDAP, disposable, DNS, typosquatting.
// ============================================================

import { getDomainAge } from "@/lib/signals/domain-age";
import { isDisposableEmail } from "@/lib/signals/disposable-email";
import { normalizeSenderDomain } from "@/lib/extension-verify-sender";
import { collectCertifiedDomainsGlobal } from "@/lib/mcp/helpers/contacts";
import { detectTyposquatting } from "@/lib/mcp/helpers/typosquatting";
import { checkEmailAuthRecords, formatDomainAge } from "@/lib/mcp/helpers/domain-dns";
import { mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

export async function handleCheckDomainReputation(
  _ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const domain = normalizeSenderDomain(typeof args.domain === "string" ? args.domain : "");
  if (!domain) {
    return mcpJsonResult({ error: "domain requis." });
  }

  const [domainAge, authRecords, certifiedDomains] = await Promise.all([
    getDomainAge(domain).catch(() => ({ agedays: -1, suspicious: false })),
    checkEmailAuthRecords(domain),
    collectCertifiedDomainsGlobal(),
  ]);

  const disposable = isDisposableEmail(`check@${domain}`);
  const typosquatting = detectTyposquatting(domain, certifiedDomains);

  const riskFactors: string[] = [];
  if (domainAge.suspicious || (domainAge.agedays >= 0 && domainAge.agedays < 90)) {
    riskFactors.push("Domaine très récent");
  }
  if (typosquatting.detected) {
    riskFactors.push("Typosquatting d'un domaine certifié");
  }
  if (!authRecords.spf && !authRecords.dkim && !authRecords.dmarc) {
    riskFactors.push("Pas de SPF/DKIM/DMARC détectés");
  }
  if (disposable) {
    riskFactors.push("Domaine jetable");
  }

  let riskLevel: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL" = "LOW";
  if (typosquatting.detected || disposable) riskLevel = "HIGH";
  else if (riskFactors.length >= 2) riskLevel = "HIGH";
  else if (riskFactors.length === 1) riskLevel = "MEDIUM";

  let recommendation = "Domaine sans signaux majeurs de vigilance.";
  if (riskLevel === "HIGH") {
    recommendation = typosquatting.similarTo
      ? `DANGER — Ne pas interagir. Le domaine légitime est ${typosquatting.similarTo}.`
      : "DANGER — Signaux de vigilance élevés sur ce domaine.";
  }

  return mcpJsonResult({
    domain,
    certified: certifiedDomains.includes(domain),
    domainAge: formatDomainAge(domainAge.agedays),
    domainAgeDays: domainAge.agedays,
    disposable,
    typosquatting,
    spf: authRecords.spf,
    dkim: authRecords.dkim,
    dmarc: authRecords.dmarc,
    riskLevel,
    riskFactors,
    recommendation,
  });
}
