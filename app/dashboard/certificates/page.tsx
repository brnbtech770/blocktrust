// app/dashboard/certificates/page.tsx
// Liste des certificats/badges de l'utilisateur
// ============================================================

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";

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
    } catch (err: any) {
      setError(err.message);
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
        return { emoji: "🟡", label: "En attente", color: "bg-yellow-500/20 text-yellow-400" };
      case "ACTIVE":
      case "ANCHORED":
        return { emoji: "🟢", label: "Actif", color: "bg-green-500/20 text-green-400" };
      case "SUSPENDED":
        return { emoji: "🟠", label: "Suspendu", color: "bg-orange-500/20 text-orange-400" };
      case "REVOKED":
      case "EXPIRED":
        return { emoji: "🔴", label: "Révoqué", color: "bg-red-500/20 text-red-400" };
      default:
        return { emoji: "⚪", label: status, color: "bg-gray-500/20 text-gray-400" };
    }
  };

  const handleVerify = (certificate: Certificate) => {
    const verifyUrl = certificate.publicId 
      ? `${window.location.origin}/verify/${certificate.publicId}`
      : `${window.location.origin}/verify/${certificate.id}`;
    window.open(verifyUrl, "_blank");
  };

  const handleCopyEmbed = (certificate: Certificate) => {
    const badgeId = certificate.publicId || certificate.id;
    const embedCode = `<a href="${window.location.origin}/verify/${badgeId}" target="_blank" rel="noopener noreferrer" title="Vérifier sur BlockTrust">
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
      <div className="flex items-center justify-center py-20">
        <div className="text-white text-xl">Chargement...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500 text-red-400 p-4 rounded-lg mb-6">
        ❌ {error}
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Mes Certificats</h1>
          <p className="text-gray-400 text-base">Gérez vos badges de certification</p>
        </div>
        <Link
          href="/dashboard/create"
          className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
        >
          + Créer un certificat
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
                className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{entityName}</h3>
                    <div className="flex items-center gap-4 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${statusBadge.color}`}>
                        {statusBadge.emoji} {statusBadge.label}
                      </span>
                      <span className="text-gray-400 text-sm">
                        {certificate.entity.entityType === "INDIVIDUAL" ? "👤 Particulier" : "🏢 Entreprise"}
                      </span>
                    </div>
                    {certificate.trustScore && (
                      <p className="text-cyan-400 text-base font-semibold">
                        TrustScore: {certificate.trustScore.score}/100 ({certificate.trustScore.level})
                      </p>
                    )}
                    <p className="text-gray-400 text-sm mt-2">
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
                        onClick={() => handleVerify(certificate)}
                        className="bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 px-4 py-2 rounded-lg transition text-sm font-medium"
                      >
                        🔍 Vérifier
                      </button>
                      <button
                        onClick={() => handleCopyEmbed(certificate)}
                        className="bg-gray-700/50 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg transition text-sm font-medium"
                      >
                        📋 Copier embed
                      </button>
                      <button
                        onClick={() => handleDownloadQR(certificate)}
                        className="bg-gray-700/50 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg transition text-sm font-medium"
                      >
                        📱 QR Code
                      </button>
                    </>
                  ) : certificate.status === "PENDING" ? (
                    <p className="text-yellow-400 text-sm font-medium">
                      ⏳ En attente de validation par BlockTrust
                    </p>
                  ) : (
                    <Link
                      href={`/dashboard/badge/${certificate.id}`}
                      className="bg-gray-700/50 text-gray-300 hover:bg-gray-700 px-4 py-2 rounded-lg transition text-sm font-medium"
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
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-2xl font-bold text-white mb-2">Aucun certificat</h3>
          <p className="text-gray-400 text-base mb-6">Créez votre premier certificat pour commencer</p>
          <Link
            href="/dashboard/create"
            className="inline-block bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-600 transition"
          >
            Créer mon premier certificat
          </Link>
        </div>
      )}
    </>
  );
}
