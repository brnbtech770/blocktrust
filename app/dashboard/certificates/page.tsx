// app/dashboard/certificates/page.tsx
// Liste des certificats/badges de l'utilisateur
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import {
  AlertCircle,
  Building2,
  Check,
  Copy,
  Inbox,
  Plus,
  User,
  Smartphone,
} from "lucide-react";
import { UpgradePrompt } from "@/app/components/ui/UpgradePrompt";
import { buildUpgradePromptProps } from "@/lib/upgradePromptProps";
import { truncateVerificationPublicId } from "@/lib/truncate-public-id";

type CertificateStatus = "PENDING" | "ACTIVE" | "ANCHORED" | "SUSPENDED" | "REVOKED" | "EXPIRED";

interface Certificate {
  id: string;
  publicId: string | null;
  status: CertificateStatus;
  level: string;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  revocationReason: string | null;
  verificationCount: number;
  lastVerifiedAt: string | null;
  entity: {
    id: string;
    entityType: string;
    legalName: string | null;
    tradeName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
  };
  trustScore?: {
    score: number;
    level: string;
  } | null;
}

export default function CertificatesPage() {
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [certQuota, setCertQuota] = useState<{
    allowed: boolean;
    plan: string;
    max: number;
  } | null>(null);
  const [copiedCertId, setCopiedCertId] = useState<string | null>(null);

  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }
    if (sessionStatus === "unauthenticated") {
      router.push("/");
      return;
    }
    if (sessionStatus === "authenticated") {
      fetchCertificates();
    }
  }, [sessionStatus, router]);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/certificates", {
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error("Erreur lors du chargement des certificats");
      }

      const data = await response.json();

      try {
        const qRes = await fetch("/api/quota/certificates", { credentials: "include" });
        if (qRes.ok) {
          const q = await qRes.json();
          setCertQuota({
            allowed: q.allowed,
            plan: q.plan,
            max: q.max,
          });
        } else {
          setCertQuota({ allowed: true, plan: "ESSENTIEL", max: 1 });
        }
      } catch {
        setCertQuota({ allowed: true, plan: "ESSENTIEL", max: 1 });
      }

      // Récupérer les TrustScores pour chaque certificat
      const certificatesWithTrustScore = await Promise.all(
        data.map(async (cert: Certificate) => {
          try {
            const trustScoreResponse = await fetch(
              `/api/entities/${cert.entity.id}/trust-score`,
              { credentials: "include" }
            );
            if (trustScoreResponse.ok) {
              const trustScore = await trustScoreResponse.json();
              return { ...cert, trustScore };
            }
          } catch (err) {
            console.error("Error fetching trust score:", err);
          }
          return cert;
        })
      );
      
      setCertificates(certificatesWithTrustScore);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Erreur");
    } finally {
      setLoading(false);
    }
  };

  const getEntityName = (certificate: Certificate) => {
    if (certificate.entity.entityType === "INDIVIDUAL") {
      return `${certificate.entity.firstName || ''} ${certificate.entity.lastName || ''}`.trim() || certificate.entity.email;
    }
    return certificate.entity.legalName || certificate.entity.tradeName || certificate.entity.email;
  };

  const getStatusBadge = (status: CertificateStatus) => {
    switch (status) {
      case "PENDING":
        return {
          label: "Non vérifié",
          color: "bg-yellow-500/20 text-yellow-400",
          dotClass: "bg-yellow-400",
        };
      case "ACTIVE":
      case "ANCHORED":
        return {
          label: "Actif",
          color: "bg-bt-cyan/20 text-bt-cyan",
          dotClass: "bg-bt-cyan",
        };
      case "SUSPENDED":
        return {
          label: "Suspendu",
          color: "bg-orange-500/20 text-orange-400",
          dotClass: "bg-orange-400",
        };
      case "REVOKED":
      case "EXPIRED":
        return {
          label: "Révoqué",
          color: "bg-red-500/20 text-red-400",
          dotClass: "bg-red-400",
        };
      default:
        return {
          label: status,
          color: "bg-white/10 text-white/60",
          dotClass: "bg-white/50",
        };
    }
  };

  const handleCopyVerifyLink = (certificate: Certificate) => {
    const certId = certificate.publicId || certificate.id;
    const url = `https://blocktrust.tech/verify?certId=${encodeURIComponent(certId)}`;
    void navigator.clipboard.writeText(url);
    setCopiedCertId(certificate.id);
    setTimeout(() => setCopiedCertId(null), 2000);
  };

  const handleCopyEmbed = (certificate: Certificate) => {
    const badgeId = certificate.publicId || certificate.id;
    const embedCode = `<a href="${window.location.origin}/verify?certId=${encodeURIComponent(badgeId)}" target="_blank" rel="noopener noreferrer" title="Vérifier sur BlockTrust">
  <img src="${window.location.origin}/api/badge/${badgeId}" alt="Badge BlockTrust vérifié" width="150" height="200" />
</a>`;
    navigator.clipboard.writeText(embedCode);
    alert("Code embed copié dans le presse-papiers !");
  };

  const handleDownloadQR = (certificate: Certificate) => {
    const badgeId = certificate.publicId || certificate.id;
    const url = `${window.location.origin}/api/qr/${badgeId}?format=png`;
    const link = document.createElement("a");
    link.href = url;
    link.download = `blocktrust-qr-${badgeId}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (sessionStatus === "loading" || loading) {
    return (
      <div className="flex items-center justify-center gap-2 py-20 text-sm text-white/40">
        <div
          className="h-4 w-4 animate-spin rounded-full border-2 border-[#00d4ff]/30 border-t-[#00d4ff]"
          aria-hidden
        />
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-red-500/40 bg-red-500/20 p-4 text-red-400">
        <AlertCircle className="h-5 w-5 shrink-0" aria-hidden />
        <span className="text-sm">{error}</span>
      </div>
    );
  }

  return (
    <>
      {certQuota && !certQuota.allowed ? (
        <div className="mb-6">
          <UpgradePrompt
            inline
            {...buildUpgradePromptProps(certQuota.plan, certQuota.max)}
          />
        </div>
      ) : null}

      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-syne mb-2 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            Mes Certificats
          </h1>
          <p className="font-sans mb-4 max-w-xl text-xs leading-relaxed text-white/40">
            ID de vérification : affiché en partie pour le partage. L’identifiant technique interne n&apos;est pas
            exposé ici.
          </p>
          <p className="font-sans text-base leading-relaxed text-white/80">
            Gérez vos badges de certification
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className="inline-flex min-h-[44px] w-full shrink-0 items-center justify-center gap-2 rounded-lg bg-bt-cyan px-4 py-3 text-center text-sm font-semibold text-navy transition-all hover:bg-bt-cyan/90 sm:w-auto sm:px-6 sm:text-base"
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden />
          Créer un certificat
        </Link>
      </div>

      {/* Certificates List */}
      {certificates.length > 0 ? (
        <div className="space-y-4">
          {certificates.map((certificate) => {
            const statusBadge = getStatusBadge(certificate.status);
            const entityName = getEntityName(certificate);

            return (
              <div
                key={certificate.id}
                className="w-full max-w-full rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg transition-all hover:border-gold/30 sm:p-6"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-syne text-xl font-semibold text-white sm:text-2xl mb-2">
                      {entityName}
                    </h3>
                    <div className="mb-2 flex flex-wrap items-center gap-4">
                      <span
                        className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold ${statusBadge.color}`}
                      >
                        <span
                          className={`h-2 w-2 shrink-0 rounded-full ${statusBadge.dotClass}`}
                          aria-hidden
                        />
                        {statusBadge.label}
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-sm text-white/50">
                        {certificate.entity.entityType === "INDIVIDUAL" ? (
                          <>
                            <User className="h-4 w-4 shrink-0 text-bt-cyan/90" aria-hidden />
                            Particulier
                          </>
                        ) : (
                          <>
                            <Building2 className="h-4 w-4 shrink-0 text-gold/90" aria-hidden />
                            Entreprise
                          </>
                        )}
                      </span>
                    </div>
                    {certificate.trustScore && (
                      <p className="font-mono text-sm font-semibold text-bt-cyan">
                        TrustScore: {certificate.trustScore.score}/100 ({certificate.trustScore.level})
                      </p>
                    )}
                    <div className="mt-3 space-y-2 border-t border-white/10 pt-3">
                      <div>
                        <p className="text-xs font-medium uppercase tracking-wider text-white/40">
                          ID de vérification
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-gray-300">
                          {truncateVerificationPublicId(certificate.publicId)}
                        </p>
                        <span className="text-xs text-white/30">À partager pour la vérification</span>
                      </div>
                    </div>
                    <p className="mt-2 font-sans text-sm text-white/60">
                      Créé le {new Date(certificate.issuedAt).toLocaleDateString("fr-FR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>

                {/* Actions selon statut */}
                <div className="flex gap-2 flex-wrap">
                  {certificate.status === "ACTIVE" || certificate.status === "ANCHORED" ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleCopyVerifyLink(certificate)}
                        className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-bt-cyan/20 px-4 py-2.5 text-sm font-medium text-bt-cyan transition hover:bg-bt-cyan/30"
                        aria-label="Copier le lien de vérification"
                      >
                        {copiedCertId === certificate.id ? (
                          <>
                            <Check className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="hidden sm:inline">Lien copié !</span>
                            <span className="sm:hidden">Copié</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4 shrink-0" aria-hidden />
                            <span className="hidden sm:inline">Copier le lien de vérification</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyEmbed(certificate)}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/40 sm:min-w-0"
                        aria-label="Copier le code embed"
                      >
                        <Copy className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="hidden sm:inline">Copier embed</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDownloadQR(certificate)}
                        className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center gap-2 rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/40 sm:min-w-0"
                        aria-label="Télécharger le QR code"
                      >
                        <Smartphone className="h-4 w-4 shrink-0" aria-hidden />
                        <span className="hidden sm:inline">QR Code</span>
                      </button>
                    </>
                  ) : certificate.status === "PENDING" ? (
                    <p
                      className="text-sm mt-2 max-w-2xl leading-relaxed"
                      style={{ color: "#BDA76B" }}
                    >
                      Votre certificat est en cours de validation par l&apos;équipe BLOCKTRUST.
                      Vous serez notifié par email sous 24–48h.
                    </p>
                  ) : (
                    <Link
                      href={`/dashboard/badge/${certificate.publicId ?? certificate.id}`}
                      className="inline-flex min-h-[44px] items-center rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white transition hover:border-white/40"
                    >
                      Voir détails
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-lg transition-all hover:border-gold/30">
          <Inbox className="mx-auto mb-4 h-12 w-12 text-white/20" aria-hidden />
          <h3 className="font-syne mb-2 text-xl font-semibold text-white sm:text-2xl">Aucun certificat</h3>
          <p className="mb-6 font-sans text-base text-white/80">Créez votre premier certificat pour commencer</p>
          <Link
            href="/dashboard/create"
            className="inline-flex min-h-[44px] w-full max-w-xs items-center justify-center rounded-lg bg-bt-cyan px-6 py-3 font-sans font-semibold text-navy transition-all hover:bg-bt-cyan/90 sm:w-auto"
          >
            Créer mon premier certificat
          </Link>
        </div>
      )}
    </>
  );
}
