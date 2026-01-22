"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import Link from "next/link";

interface Signature {
  jti: string;
  ctxHash: string;
  expiresAt: string;
}

interface Certificate {
  id: string;
  status: string;
  level: string;
  issuedAt: string;
  tokenId: string | null;
  signature: Signature | null;
}

interface Entity {
  id: string;
  entityType: string;
  legalName: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string;
  website: string | null;
  kycStatus: string;
  validationLevel: string;
  createdAt: string;
  certificates: Certificate[];
}

interface User {
  id: string;
  name: string | null;
  email: string;
  plan: string;
  status: string;
  company: string | null;
  createdAt: string;
}

interface Stats {
  totalCertificates: number;
  activeCertificates: number;
  totalVerifications: number;
  totalEntities: number;
}

interface ClientDashboardProps {
  user: User;
  entities: Entity[];
  stats: Stats;
}

export default function ClientDashboard({
  user,
  entities,
  stats,
}: ClientDashboardProps) {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleLogout = () => {
    signOut({ callbackUrl: "/" });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return (
          <span className="px-2 py-1 text-xs rounded bg-green-900/50 text-green-400">
            Actif
          </span>
        );
      case "PENDING":
        return (
          <span className="px-2 py-1 text-xs rounded bg-yellow-900/50 text-yellow-400">
            En attente
          </span>
        );
      case "REVOKED":
        return (
          <span className="px-2 py-1 text-xs rounded bg-red-900/50 text-red-400">
            Révoqué
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
            {status}
          </span>
        );
    }
  };

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "GOLD":
        return (
          <span className="px-2 py-1 text-xs rounded bg-yellow-900/50 text-yellow-400">
            Gold
          </span>
        );
      case "SILVER":
        return (
          <span className="px-2 py-1 text-xs rounded bg-gray-600 text-gray-300">
            Silver
          </span>
        );
      case "BRONZE":
        return (
          <span className="px-2 py-1 text-xs rounded bg-orange-900/50 text-orange-400">
            Bronze
          </span>
        );
      default:
        return (
          <span className="px-2 py-1 text-xs rounded bg-gray-700 text-gray-300">
            {level}
          </span>
        );
    }
  };

  const getPlanBadge = (plan: string) => {
    const colors: Record<string, string> = {
      TRIAL: "bg-gray-700 text-gray-300",
      STARTER: "bg-blue-900/50 text-blue-400",
      PRO: "bg-purple-900/50 text-purple-400",
      BUSINESS: "bg-cyan-900/50 text-cyan-400",
      ENTERPRISE: "bg-yellow-900/50 text-yellow-400",
    };
    return (
      <span
        className={`px-2 py-1 text-xs rounded ${colors[plan] || colors.TRIAL}`}
      >
        {plan}
      </span>
    );
  };

  const getEntityName = (entity: Entity) => {
    if (entity.entityType === "BUSINESS" && entity.legalName) {
      return entity.legalName;
    }
    if (entity.firstName && entity.lastName) {
      return `${entity.firstName} ${entity.lastName}`;
    }
    return entity.email;
  };

  const getVerifyLink = (cert: Certificate) => {
    if (cert.signature) {
      return `/v/${cert.signature.jti}?h=${cert.signature.ctxHash.substring(0, 16)}`;
    }
    return `/verify/${cert.id}`;
  };

  const getBadgeLink = (cert: Certificate, entityId: string) => {
    if (cert.signature) {
      return `/badge-v2/${entityId}`;
    }
    return `/verify/${cert.id}`;
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 bg-cyan-500 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-sm">BT</span>
                </div>
                <span className="text-white font-semibold hidden sm:block">
                  BlockTrust
                </span>
              </Link>
              <span className="text-gray-500">|</span>
              <h1 className="text-white font-medium">Mon Espace</h1>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-white text-sm font-medium">
                  {user.name || user.email}
                </p>
                <div className="flex items-center gap-2 justify-end">
                  {getPlanBadge(user.plan)}
                  {user.company && (
                    <span className="text-gray-400 text-xs">{user.company}</span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setShowLogoutConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm rounded-lg transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {user.status === "PENDING" && (
          <div className="mb-6 p-4 bg-yellow-900/30 border border-yellow-700 rounded-lg">
            <div className="flex items-center gap-3">
              <svg
                className="w-5 h-5 text-yellow-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div>
                <p className="text-yellow-400 font-medium">
                  Compte en attente de validation
                </p>
                <p className="text-yellow-400/70 text-sm">
                  Votre compte est en cours de vérification. Vous pourrez créer
                  des certificats une fois validé.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Certificats</p>
                <p className="text-3xl font-bold text-white mt-1">
                  {stats.totalCertificates}
                </p>
              </div>
              <div className="w-12 h-12 bg-cyan-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-cyan-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Actifs</p>
                <p className="text-3xl font-bold text-green-400 mt-1">
                  {stats.activeCertificates}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-green-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Vérifications</p>
                <p className="text-3xl font-bold text-purple-400 mt-1">
                  {stats.totalVerifications}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-purple-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Plan</p>
                <p className="text-xl font-bold text-white mt-1">{user.plan}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-900/30 rounded-lg flex items-center justify-center">
                <svg
                  className="w-6 h-6 text-yellow-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {user.status !== "SUSPENDED" && (
          <div className="mb-8">
            <Link
              href="/mon-espace/creer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition-colors"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              Créer un certificat
            </Link>
          </div>
        )}

        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-white">Mes Certificats</h2>

          {entities.length === 0 ? (
            <div className="bg-gray-800 rounded-xl p-8 border border-gray-700 text-center">
              <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg
                  className="w-8 h-8 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <h3 className="text-white font-medium mb-2">
                Aucun certificat pour le moment
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Créez votre premier certificat BlockTrust pour sécuriser votre
                identité numérique.
              </p>
              {user.status !== "SUSPENDED" && (
                <Link
                  href="/mon-espace/creer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-sm rounded-lg transition-colors"
                >
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 4v16m8-8H4"
                    />
                  </svg>
                  Créer mon premier certificat
                </Link>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
                >
                  <div className="px-6 py-4 border-b border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                        {entity.entityType === "BUSINESS" ? (
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-5 h-5 text-gray-400"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                            />
                          </svg>
                        )}
                      </div>
                      <div>
                        <h3 className="text-white font-medium">
                          {getEntityName(entity)}
                        </h3>
                        <p className="text-gray-400 text-sm">{entity.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {getLevelBadge(entity.validationLevel)}
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          entity.kycStatus === "VERIFIED"
                            ? "bg-green-900/50 text-green-400"
                            : entity.kycStatus === "PENDING"
                            ? "bg-yellow-900/50 text-yellow-400"
                            : "bg-gray-700 text-gray-400"
                        }`}
                      >
                        {entity.kycStatus === "VERIFIED"
                          ? "Vérifié"
                          : entity.kycStatus === "PENDING"
                          ? "En attente"
                          : entity.kycStatus}
                      </span>
                    </div>
                  </div>

                  {entity.certificates.length === 0 ? (
                    <div className="px-6 py-4 text-gray-400 text-sm">
                      Aucun certificat pour cette entité
                    </div>
                  ) : (
                    <div className="divide-y divide-gray-700">
                      {entity.certificates.map((cert) => (
                        <div
                          key={cert.id}
                          className="px-6 py-4 flex items-center justify-between hover:bg-gray-700/50 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="w-8 h-8 bg-cyan-900/30 rounded flex items-center justify-center">
                              <svg
                                className="w-4 h-4 text-cyan-400"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                                />
                              </svg>
                            </div>
                            <div>
                              <p className="text-white text-sm font-medium">
                                Certificat #{cert.id.slice(-8).toUpperCase()}
                              </p>
                              <p className="text-gray-400 text-xs">
                                Émis le{" "}
                                {new Date(cert.issuedAt).toLocaleDateString(
                                  "fr-FR",
                                  {
                                    day: "numeric",
                                    month: "long",
                                    year: "numeric",
                                  }
                                )}
                                {cert.signature && (
                                  <span className="ml-2 text-cyan-400">
                                    • V2 Anti-falsification
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {getLevelBadge(cert.level)}
                            {getStatusBadge(cert.status)}
                            {cert.status === "ACTIVE" && cert.signature && (
                              <Link
                                href={getBadgeLink(cert, entity.id)}
                                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded transition-colors"
                                title="Voir le badge avec QR code"
                              >
                                Badge
                              </Link>
                            )}
                            <Link
                              href={getVerifyLink(cert)}
                              target="_blank"
                              className="p-2 text-gray-400 hover:text-cyan-400 transition-colors"
                              title="Vérifier le certificat"
                            >
                              <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                />
                              </svg>
                            </Link>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {showLogoutConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 max-w-sm w-full mx-4 border border-gray-700">
            <h3 className="text-white font-semibold mb-2">Déconnexion</h3>
            <p className="text-gray-400 text-sm mb-4">
              Êtes-vous sûr de vouloir vous déconnecter ?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
