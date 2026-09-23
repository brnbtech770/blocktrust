/**
 * © 2026 BRNB TECH — BLOCKTRUST™ (marque déposée INPI n°5253718).
 * Tous droits réservés. Code propriétaire — reproduction interdite.
 */
// lib/trust-engine.ts
// Trust Engine V2 — scoring contextuel + signaux détaillés
// ============================================================

import { prisma } from "@/app/lib/db";
import { getDomainAge } from "@/lib/signals/domain-age";
import {
  getEmailDomain,
  isDisposableEmail,
} from "@/lib/signals/disposable-email";
import { checkIpReputation } from "@/lib/signals/ip-reputation";
import {
  buildOfficialTrustEngineResult,
  buildRevokedOfficialTrustEngineResult,
  isOfficialEntity,
} from "@/lib/official-trust";
import { isCertificateCurrentlyValid } from "@/lib/certificate-validity";

export interface TrustEngineOptions {
  /** IP du contexte de vérification (optionnel — AbuseIPDB) */
  contextIp?: string;
}

export interface TrustSignal {
  type: string;
  label: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  detail?: string;
}

export type TrustRecommendation = "TRUST" | "VERIFY" | "CAUTION" | "DANGER";

export interface TrustEngineResult {
  globalScore: number;
  identityScore: number;
  networkScore: number;
  behaviorScore: number;
  technicalScore: number;
  signals: TrustSignal[];
  recommendation: TrustRecommendation;
  contextLabel: string;
  /** Compte Root of Trust BLOCKTRUST (score fixe 100). */
  isOfficialAccount?: boolean;
  /**
   * Bonus réseau dépendant du viewer (+20 direct, +10 indirect).
   * N'entre pas dans globalScore. 0 si pas de viewer ou pas de lien.
   */
  contextualBonus: number;
}

function defaultResult(
  score: number,
  rec: TrustRecommendation,
  label: string,
): TrustEngineResult {
  return {
    globalScore: score,
    identityScore: 0,
    networkScore: 0,
    behaviorScore: 0,
    technicalScore: 0,
    signals: [],
    recommendation: rec,
    contextLabel: label,
    contextualBonus: 0,
  };
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

/** Une relation mutuelle ne compte dans le score qu'après ce délai. */
export const NETWORK_MUTUAL_MIN_AGE_MS = 7 * 24 * 60 * 60 * 1000;
/** Fenêtre de plafonnement des nouvelles relations mutuelles. */
export const NETWORK_MUTUAL_BUCKET_MS = 7 * 24 * 60 * 60 * 1000;
/** Maximum de relations mutuelles comptées par fenêtre de 7 jours. */
export const NETWORK_MUTUAL_MAX_PER_BUCKET = 3;

/**
 * Compte les relations MUTUAL éligibles au networkScore.
 * Unilatéral CONFIRMED ignoré. Moins de 7 jours ignoré.
 * Au plus 3 relations par fenêtre de 7 jours (anti-Sybil).
 */
export function countScoreEligibleMutuals(
  createdAts: Array<Date | string | number>,
  now: Date = new Date(),
): number {
  const cutoff = now.getTime() - NETWORK_MUTUAL_MIN_AGE_MS;
  const buckets = new Map<number, number>();
  for (const raw of createdAts) {
    const t = new Date(raw).getTime();
    if (!Number.isFinite(t) || t >= cutoff) continue;
    const bucket = Math.floor(t / NETWORK_MUTUAL_BUCKET_MS);
    buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
  }
  let total = 0;
  for (const n of buckets.values()) {
    total += Math.min(NETWORK_MUTUAL_MAX_PER_BUCKET, n);
  }
  return total;
}

/**
 * Calcule le Trust Engine V2 pour un certificat (publicId ou id interne).
 * @param certificateLookupId — publicId ou id du certificat
 * @param viewerUserId — utilisateur connecté (contexte réseau), optionnel
 */
export async function computeTrustEngineScore(
  certificateLookupId: string,
  viewerUserId?: string,
  options?: TrustEngineOptions,
): Promise<TrustEngineResult> {
  const lookup = certificateLookupId.trim();
  if (!lookup) {
    return defaultResult(0, "DANGER", "Certificat introuvable");
  }

  const cert = await prisma.certificate
    .findFirst({
      where: {
        OR: [{ publicId: lookup }, { id: lookup }],
      },
      include: {
        entity: {
          include: {
            user: {
              include: {
                subscription: true,
              },
            },
          },
        },
      },
    })
    .catch(() => null);

  if (!cert?.entity?.user) {
    return defaultResult(0, "DANGER", "Certificat introuvable");
  }

  const user = cert.entity.user;

  if (!isCertificateCurrentlyValid(cert)) {
    const revoked = cert.status === "REVOKED" || Boolean(cert.revokedAt);
    const expired =
      cert.status === "EXPIRED" ||
      Boolean(cert.expiresAt && cert.expiresAt.getTime() < Date.now());
    if (isOfficialEntity(cert.entity.email) && revoked) {
      return buildRevokedOfficialTrustEngineResult();
    }
    return defaultResult(
      0,
      "DANGER",
      revoked ? "Certificat révoqué" : expired ? "Certificat expiré" : "Certificat inactif",
    );
  }

  if (isOfficialEntity(cert.entity.email)) {
    return buildOfficialTrustEngineResult();
  }

  const signals: TrustSignal[] = [];

  // ─── IDENTITY SCORE ───────────────────────
  let identityScore = 0;

  if (user.kycStatus === "VERIFIED") {
    identityScore += 40;
    signals.push({
      type: "KYC_VERIFIED",
      label: "Identité vérifiée",
      impact: "positive",
      weight: 40,
    });
  } else {
    signals.push({
      type: "KYC_MISSING",
      label: "Identité non vérifiée",
      impact: "negative",
      weight: -10,
    });
  }

  if (cert.status === "ACTIVE" || cert.status === "ANCHORED") {
    identityScore += 20;
    signals.push({
      type: "CERT_ACTIVE",
      label: "Certificat actif",
      impact: "positive",
      weight: 20,
    });
  }

  const anchoredOnChain =
    cert.blockchainStatus === "ANCHORED" ||
    cert.status === "ANCHORED" ||
    Boolean(cert.polygonTxHash);
  if (anchoredOnChain) {
    identityScore += 10;
    signals.push({
      type: "BLOCKCHAIN_ANCHORED",
      label: "Ancrage blockchain",
      impact: "positive",
      weight: 10,
    });
  }

  const certifiedEmails = [
    ...(cert.entity.certifiedEmails ?? []),
    ...(user.certifiedEmails ?? []),
  ];
  if (certifiedEmails.length > 0) {
    identityScore += 15;
    signals.push({
      type: "CERTIFIED_EMAILS",
      label: `${certifiedEmails.length} email(s) certifié(s)`,
      impact: "positive",
      weight: 15,
    });
  }

  const certifiedDomains = [
    ...(cert.entity.certifiedDomains ?? []),
    ...(user.certifiedDomains ?? []),
  ];
  if (certifiedDomains.length > 0) {
    identityScore += 15;
    signals.push({
      type: "CERTIFIED_DOMAINS",
      label: `${certifiedDomains.length} domaine(s) certifié(s)`,
      impact: "positive",
      weight: 15,
    });
  }

  identityScore = Math.min(100, identityScore);

  // ─── NETWORK SCORE ────────────────────────
  // Uniquement MUTUAL, âgées d'au moins 7 jours, max 3 par fenêtre de 7 jours.
  let networkScore = 0;
  const mutualRows = await prisma.userTrustRelation
    .findMany({
      where: {
        fromUserId: user.id,
        isMutual: true,
        createdAt: { lt: new Date(Date.now() - NETWORK_MUTUAL_MIN_AGE_MS) },
      },
      select: { createdAt: true },
    })
    .catch(() => []);
  const mutualCount = countScoreEligibleMutuals(
    Array.isArray(mutualRows) ? mutualRows.map((row) => row.createdAt) : [],
  );

  if (mutualCount >= 50) networkScore = 80;
  else if (mutualCount >= 20) networkScore = 60;
  else if (mutualCount >= 6) networkScore = 40;
  else if (mutualCount >= 1) networkScore = 20;

  if (mutualCount > 0) {
    signals.push({
      type: "NETWORK_SIZE",
      label: `${mutualCount} connexion(s) de confiance`,
      impact: mutualCount >= 5 ? "positive" : "neutral",
      weight: networkScore,
    });
  } else {
    signals.push({
      type: "NETWORK_EMPTY",
      label: "Aucune connexion de confiance",
      impact: "neutral",
      weight: 0,
      detail: "Réseau limité",
    });
  }

  let contextualBonus = 0;

  if (viewerUserId && viewerUserId !== user.id) {
    const inNetwork = await prisma.userTrustRelation
      .findFirst({
        where: {
          fromUserId: viewerUserId,
          toUserId: user.id,
          isMutual: true,
        },
      })
      .catch(() => null);

    if (inNetwork) {
      contextualBonus = 20;
      signals.push({
        type: "IN_YOUR_NETWORK",
        label: "Dans votre réseau de confiance",
        impact: "positive",
        weight: 20,
      });
    } else if (networkScore < 80) {
      const indirectConnection = await prisma.userTrustRelation
        .findFirst({
          where: {
            fromUserId: viewerUserId,
            isMutual: true,
            toUser: {
              userTrustFrom: {
                some: {
                  toUserId: user.id,
                  isMutual: true,
                },
              },
            },
          },
        })
        .catch(() => null);

      if (indirectConnection) {
        contextualBonus = 10;
        signals.push({
          type: "INDIRECT_NETWORK",
          label: "Connexion indirecte dans votre réseau",
          impact: "positive",
          weight: 10,
          detail: "Ami d'un de vos contacts",
        });
      }
    }
  }

  // ─── BEHAVIOR SCORE ───────────────────────
  let behaviorScore = 0;
  const accountAge = user.createdAt
    ? Math.floor(
        (Date.now() - new Date(user.createdAt).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : 0;

  if (accountAge >= 180) behaviorScore = 80;
  else if (accountAge >= 30) behaviorScore = 60;
  else if (accountAge >= 7) behaviorScore = 30;
  else {
    behaviorScore = 10;
    signals.push({
      type: "ACCOUNT_NEW",
      label: "Compte créé récemment",
      impact: "negative",
      weight: -10,
      detail: `Créé il y a ${accountAge} jour(s)`,
    });
  }

  if (accountAge >= 30) {
    signals.push({
      type: "ACCOUNT_AGE",
      label: `Compte actif depuis ${
        accountAge >= 365
          ? `${Math.floor(accountAge / 365)} an(s)`
          : `${Math.floor(accountAge / 30)} mois`
      }`,
      impact: "positive",
      weight: behaviorScore,
    });
  }

  const recentFraud = await prisma.verification
    .count({
      where: {
        certificateId: cert.id,
        result: "FRAUD_ALERT",
        verifiedAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        },
      },
    })
    .catch(() => 0);

  if (recentFraud > 0) {
    behaviorScore = Math.max(0, behaviorScore - 30);
    signals.push({
      type: "FRAUD_ALERTS",
      label: `${recentFraud} alerte(s) récente(s)`,
      impact: "negative",
      weight: -30,
      detail: "Signaux de vigilance — usurpation possible",
    });
  }

  const [bisSentCount, bisVerifiedCount] = await Promise.all([
    prisma.interactionSignature
      .count({ where: { senderCertId: cert.id } })
      .catch(() => 0),
    prisma.interactionSignature
      .count({ where: { senderCertId: cert.id, verified: true } })
      .catch(() => 0),
  ]);

  if (bisSentCount > 0) {
    const bisSignedBonus = Math.min(20, bisSentCount * 2);
    const bisVerifiedBonus = bisVerifiedCount;
    const bisTotal = bisSignedBonus + bisVerifiedBonus;
    behaviorScore = Math.min(100, behaviorScore + bisTotal);
    signals.push({
      type: "BIS_INTERACTIONS",
      label: `${bisSentCount} interaction(s) signée(s) BIS`,
      impact: "positive",
      weight: bisTotal,
      detail:
        bisVerifiedCount > 0
          ? `${bisVerifiedCount} vérifiée(s) par le destinataire (+${bisVerifiedBonus})`
          : undefined,
    });
  }

  // ─── TECHNICAL SCORE ──────────────────────
  let technicalScore = 50;

  if (user.subscription?.status === "active") {
    technicalScore += 30;
    signals.push({
      type: "ACTIVE_SUBSCRIPTION",
      label: "Abonnement actif",
      impact: "positive",
      weight: 30,
    });
  }

  if (user.trustScore > 0) {
    technicalScore = Math.min(100, technicalScore + user.trustScore / 5);
  }

  const primaryEmail =
    certifiedEmails[0] ?? cert.entity.email ?? user.email ?? "";
  const emailDomain = getEmailDomain(primaryEmail);

  if (emailDomain) {
    const domainAge = await getDomainAge(emailDomain).catch(() => ({
      agedays: -1,
      suspicious: false,
    }));

    if (domainAge.suspicious) {
      technicalScore = Math.max(0, technicalScore - 20);
      signals.push({
        type: "DOMAIN_NEW",
        label: `Domaine créé récemment (${domainAge.agedays} jours)`,
        impact: "negative",
        weight: -20,
      });
    } else if (domainAge.agedays > 365) {
      technicalScore = Math.min(100, technicalScore + 10);
      signals.push({
        type: "DOMAIN_ESTABLISHED",
        label: `Domaine établi (${Math.floor(domainAge.agedays / 365)} an(s))`,
        impact: "positive",
        weight: 10,
      });
    }
  }

  if (certifiedEmails.some(isDisposableEmail)) {
    technicalScore = Math.max(0, technicalScore - 30);
    signals.push({
      type: "DISPOSABLE_EMAIL",
      label: "Email jetable détecté",
      impact: "negative",
      weight: -30,
    });
  }

  const contextIp = options?.contextIp?.trim();
  if (contextIp && contextIp !== "unknown") {
    const ipRep = await checkIpReputation(contextIp).catch(() => ({
      score: 0,
      abusive: false,
      isp: "",
    }));

    if (ipRep.abusive) {
      technicalScore = Math.max(0, technicalScore - 15);
      signals.push({
        type: "IP_REPUTATION_BAD",
        label: "IP associée à des signaux de vigilance",
        impact: "negative",
        weight: -15,
        detail: ipRep.isp ? `FAI : ${ipRep.isp}` : undefined,
      });
    } else if (ipRep.score === 0 && ipRep.isp) {
      signals.push({
        type: "IP_REPUTATION_OK",
        label: "IP sans signalement récent",
        impact: "neutral",
        weight: 0,
        detail: ipRep.isp,
      });
    }
  }

  technicalScore = Math.min(100, technicalScore);

  // ─── GLOBAL SCORE ─────────────────────────
  const globalScore = clampScore(
    identityScore * 0.4 +
      networkScore * 0.3 +
      behaviorScore * 0.2 +
      technicalScore * 0.1,
  );

  // ─── RECOMMENDATION ───────────────────────
  let recommendation: TrustRecommendation;
  let contextLabel: string;

  if (recentFraud > 0) {
    recommendation = "DANGER";
    contextLabel = "Signaux de vigilance élevés";
  } else if (globalScore >= 75) {
    recommendation = "TRUST";
    contextLabel = "Identité fiable";
  } else if (globalScore >= 50) {
    recommendation = "VERIFY";
    contextLabel = "Vérification recommandée";
  } else if (globalScore >= 25) {
    recommendation = "CAUTION";
    contextLabel = "Signaux de vigilance détectés";
  } else {
    recommendation = "DANGER";
    contextLabel = "Vigilance élevée requise";
  }

  return {
    globalScore,
    identityScore: clampScore(identityScore),
    networkScore: clampScore(networkScore),
    behaviorScore: clampScore(behaviorScore),
    technicalScore: clampScore(technicalScore),
    signals: signals.slice(0, 10),
    recommendation,
    contextLabel,
    contextualBonus,
  };
}
