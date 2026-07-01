/**
 * Préchargement serveur pour /verify?certId= — Prisma direct, sans audit API.
 */
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import { getTrustEngineResultForApi } from "@/lib/trust-engine-cache";
import type { VerifyApiSuccess } from "@/app/components/verify/verify-types";

function entityDisplayName(entity: {
  entityType: string;
  legalName: string | null;
  tradeName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
}) {
  if (entity.entityType === "INDIVIDUAL") {
    const name = [entity.firstName, entity.lastName].filter(Boolean).join(" ").trim();
    return name || entity.email;
  }
  return entity.legalName || entity.tradeName || entity.email;
}

function mergeCertifiedLists(entityItems: string[], userItems: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of [...entityItems, ...userItems]) {
    const t = item.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

/** Données initiales pour certId (SSR) — null si introuvable. */
export async function prefetchVerifyCertPayload(
  rawCertId: string,
): Promise<VerifyApiSuccess | null> {
  const lookupKey = rawCertId.trim();
  if (!lookupKey) return null;

  const certificate = await prisma.certificate.findFirst({
    where: { OR: [{ id: lookupKey }, { publicId: lookupKey }] },
    include: { entity: true },
  });

  if (!certificate?.entity) {
    return { verdict: "FRAUD", reason: "certificate_not_found" };
  }

  const entity = certificate.entity;
  const owner = await prisma.user.findUnique({
    where: { id: entity.userId },
    select: {
      certifiedEmails: true,
      certifiedPhones: true,
      certifiedDomains: true,
      kycStatus: true,
    },
  });

  let verdict: VerifyApiSuccess["verdict"] = "VALID";
  const status = certificate.status;

  if (status === "REVOKED") {
    verdict = "REVOKED";
  } else if (status === "EXPIRED") {
    verdict = "EXPIRED";
  } else if (certificate.expiresAt && certificate.expiresAt.getTime() < Date.now()) {
    verdict = "EXPIRED";
  } else if (status === "ACTIVE" || status === "ANCHORED") {
    verdict = "VALID";
  } else if (certificate.blockchainStatus === "NOT_ANCHORED") {
    verdict = "VALID";
  } else {
    verdict = "INVALID";
  }

  const session = await auth().catch(() => null);
  const authenticated = Boolean(session?.user?.id);
  const identityVerified = verdict === "VALID" && owner?.kycStatus === "VERIFIED";
  const certificatePublicId = certificate.publicId ?? certificate.id;

  const certifiedDomains = mergeCertifiedLists(
    entity.certifiedDomains ?? [],
    owner?.certifiedDomains ?? [],
  );
  const certifiedEmails = mergeCertifiedLists(
    entity.certifiedEmails ?? [],
    owner?.certifiedEmails ?? [],
  );
  const certifiedPhones = mergeCertifiedLists(
    entity.certifiedPhones ?? [],
    owner?.certifiedPhones ?? [],
  );

  const walletAddressTrim = entity.walletAddress?.trim() ?? "";
  const walletNetworkTrim = entity.walletNetwork?.trim() ?? "";

  let trustEngine = null;
  if (verdict === "VALID" && authenticated) {
    trustEngine = await getTrustEngineResultForApi(
      certificatePublicId,
      session?.user?.id,
    ).catch(() => null);
  }

  return {
    verdict,
    entityName: entityDisplayName(entity),
    certifiedAt: certificate.issuedAt.toISOString(),
    certificateId: certificatePublicId,
    identityVerified,
    trustEngine,
    ...(authenticated &&
    verdict === "VALID" &&
    walletAddressTrim &&
    walletNetworkTrim
      ? {
          walletAddress: walletAddressTrim,
          walletNetwork: walletNetworkTrim,
        }
      : {}),
    ...(authenticated &&
    verdict === "VALID" &&
    (certifiedDomains.length > 0 ||
      certifiedEmails.length > 0 ||
      certifiedPhones.length > 0)
      ? { certifiedDomains, certifiedEmails, certifiedPhones }
      : {}),
  };
}
