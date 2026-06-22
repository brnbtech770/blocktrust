// lib/mcp/tools/add-contact.ts
// Tool add_contact — logique extension add-contact enrichie.
// ============================================================

import { prisma } from "@/app/lib/db";
import { checkEntityQuota } from "@/lib/checkQuota";
import { deriveCertificateLevelFromPlan } from "@/lib/certificate-plan-level";
import { checkPlanRateLimit } from "@/lib/rate-limit-plan";
import { assertSafeDisplayText } from "@/lib/sanitize-display-text";
import { getEmailDomain } from "@/lib/signals/disposable-email";
import {
  entityIsCertified,
  loadUserTrustCircleMap,
  mapEntityToContact,
  loadUserEntities,
} from "@/lib/mcp/helpers/contacts";
import { runExtensionVerifySender } from "@/lib/extension-verify-sender-service";
import { mcpErrorResult, mcpJsonResult } from "@/lib/mcp/sanitize-output";
import type { McpToolContext } from "@/lib/mcp/types";

function splitName(name: string): { firstName: string; lastName: string } {
  const t = name.trim();
  const sp = t.indexOf(" ");
  if (sp === -1) return { firstName: t || "Contact", lastName: "-" };
  return { firstName: t.slice(0, sp).trim(), lastName: t.slice(sp + 1).trim() || "-" };
}

export async function handleAddContact(
  ctx: McpToolContext,
  args: Record<string, unknown>,
) {
  const email = typeof args.email === "string" ? args.email.trim().toLowerCase() : "";
  const name = typeof args.name === "string" ? args.name.trim() : "";
  const label = typeof args.label === "string" ? args.label.trim() : undefined;
  const phone = typeof args.phone === "string" ? args.phone.trim() : undefined;
  const domainArg = typeof args.domain === "string" ? args.domain.trim() : "";
  const websiteArg = typeof args.website === "string" ? args.website.trim() : "";
  const notes = typeof args.notes === "string" ? args.notes.trim() : undefined;

  if (!email || !name) {
    return mcpErrorResult("email et name requis.");
  }

  const nameCheck = assertSafeDisplayText(name, "Nom");
  if (!nameCheck.ok) return mcpErrorResult(nameCheck.reason);

  const planRate = await checkPlanRateLimit("contacts", ctx.plan, ctx.userId);
  if (!planRate.ok) {
    return mcpErrorResult("Trop d'ajouts de contacts.", { retryAfter: planRate.retryAfter });
  }

  const quota = await checkEntityQuota(ctx.userId);
  if (!quota.allowed) {
    return mcpErrorResult(quota.reason ?? "Limite de contacts atteinte.", {
      current: quota.current,
      max: quota.max,
    });
  }

  const certLevel = deriveCertificateLevelFromPlan(ctx.plan);
  const emailLower = email;

  const existing = await prisma.entity.findFirst({
    where: { userId: ctx.userId, email: emailLower, entityType: "INDIVIDUAL" },
    include: {
      certificates: { orderBy: { issuedAt: "desc" } },
      trustScore: { select: { score: true } },
    },
  });

  if (existing) {
    const trustMap = await loadUserTrustCircleMap(ctx.userId);
    const contact = mapEntityToContact(existing, trustMap);
    return mcpJsonResult({
      success: true,
      existing: true,
      ...contact,
      message: `${contact.name} est déjà dans vos contacts.`,
    });
  }

  const { firstName, lastName } = splitName(nameCheck.value);
  let website: string | null = null;
  const d = domainArg.toLowerCase() || getEmailDomain(emailLower) || "";
  if (websiteArg) {
    website = websiteArg.includes("://") ? websiteArg : `https://${websiteArg}`;
  } else if (d) {
    website = d.includes("://") ? d : `https://${d}`;
  }

  const entity = await prisma.entity.create({
    data: {
      userId: ctx.userId,
      entityType: "INDIVIDUAL",
      firstName,
      lastName,
      email: emailLower,
      website,
      phone: phone || null,
      tradeName: label || null,
      description: notes || null,
      kycStatus: "PENDING",
      validationLevel: certLevel,
    },
    include: {
      certificates: true,
      trustScore: { select: { score: true } },
    },
  });

  const verify = await runExtensionVerifySender({
    userId: ctx.userId,
    emailRaw: emailLower,
    domainRaw: d,
  });

  const certified = verify.status === "CERTIFIED" || entityIsCertified(entity);
  const trustMap = await loadUserTrustCircleMap(ctx.userId);
  const inCircle = trustMap.get(emailLower)?.inTrustCircle ?? false;

  return mcpJsonResult({
    success: true,
    contactId: entity.id,
    name: nameCheck.value,
    email: emailLower,
    domain: d || null,
    website,
    certified,
    trustScore: verify.trustScore ?? entity.trustScore?.score ?? null,
    message: certified
      ? `Contact ajouté. ${nameCheck.value} est certifié BLOCKTRUST.`
      : `Contact ajouté. ${nameCheck.value} n'est pas encore certifié BLOCKTRUST.`,
    suggestion: certified && !inCircle
      ? "Vous pouvez l'ajouter à votre Trust Circle pour être alerté en cas de compromission."
      : undefined,
    inviteUrl: certified ? undefined : "https://blocktrust.tech/auth/register",
  });
}
