"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

interface Props {
  user: {
    id: string;
    name: string | null;
    email: string;
    plan: string;
    status: string;
    company: string | null;
    createdAt: string;
  };
  entities: Array<{
    id: string;
    entityType: string;
    legalName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    website: string | null;
    kycStatus: string;
    validationLevel: string;
    createdAt: string;
    certificates: Array<{
      id: string;
      status: string;
      level: string;
      issuedAt: string;
      tokenId: string | null;
    }>;
  }>;
  stats: {
    totalCertificates: number;
    activeCertificates: number;
    totalVerifications: number;
    totalEntities: number;
  };
}

export default function ClientDashboard({ user, entities, stats }: Props) {
  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center text-white font-bold">
              {user.name?.charAt(0) || user.email.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-white font-semibold">
                {user.name || user.email}
              </h1>
              <span className="text-xs text-cyan-400 bg-cyan-900/50 px-2 py-0.5 rounded">
                Plan {user.plan}
              </span>
            </div>
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-red-400 hover:text-red-300 text-sm flex items-center gap-2"
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
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Déconnexion
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Total certificats</p>
            <p className="text-3xl font-bold text-white mt-1">
              {stats.totalCertificates}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Vérifications totales</p>
            <p className="text-3xl font-bold text-cyan-400 mt-1">
              {stats.totalVerifications}
            </p>
          </div>
          <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
            <p className="text-gray-400 text-sm">Certificats actifs</p>
            <p className="text-3xl font-bold text-green-400 mt-1">
              {stats.activeCertificates}
            </p>
          </div>
        </div>

        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-white">Mes Certificats</h2>
          <Link
            href="/mon-espace/creer"
            className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
          >
            + Créer un certificat
          </Link>
        </div>

        {entities.length === 0 ? (
          <div className="bg-gray-800 rounded-xl p-12 text-center border border-gray-700">
            <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-gray-500"
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
            <h3 className="text-white font-medium mb-2">Aucun certificat</h3>
            <p className="text-gray-400 mb-6">
              Commencez par créer votre premier certificat BlockTrust
            </p>
            <Link
              href="/mon-espace/creer"
              className="inline-flex px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-medium rounded-lg hover:from-cyan-600 hover:to-blue-600 transition-all"
            >
              Créer mon premier certificat
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {entities.map((entity) => (
              <div
                key={entity.id}
                className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden"
              >
                <div className="px-6 py-4 bg-gray-750 border-b border-gray-700">
                  <h3 className="text-white font-medium">
                    {entity.entityType === "BUSINESS"
                      ? entity.legalName
                      : `${entity.firstName} ${entity.lastName}`}
                  </h3>
                  <span className="text-xs text-gray-400">
                    {entity.entityType === "BUSINESS"
                      ? "Entreprise"
                      : "Particulier"}
                  </span>
                </div>
                <div className="divide-y divide-gray-700">
                  {entity.certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="px-6 py-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-3 h-3 rounded-full ${
                            cert.status === "ACTIVE"
                              ? "bg-green-500"
                              : cert.status === "PENDING"
                              ? "bg-yellow-500"
                              : "bg-red-500"
                          }`}
                        />
                        <div>
                          <p className="text-white text-sm">
                            Certificat #{cert.id.slice(-8)}
                          </p>
                          <p className="text-gray-400 text-xs">
                            {new Date(cert.issuedAt).toLocaleDateString(
                              "fr-FR"
                            )}{" "}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            cert.level === "BRONZE"
                              ? "bg-orange-900/50 text-orange-400"
                              : cert.level === "SILVER"
                              ? "bg-gray-600 text-gray-300"
                              : "bg-yellow-900/50 text-yellow-400"
                          }`}
                        >
                          {cert.level}
                        </span>
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            cert.status === "ACTIVE"
                              ? "bg-green-900/50 text-green-400"
                              : cert.status === "PENDING"
                              ? "bg-yellow-900/50 text-yellow-400"
                              : "bg-red-900/50 text-red-400"
                          }`}
                        >
                          {cert.status === "ACTIVE"
                            ? "Actif"
                            : cert.status === "PENDING"
                            ? "En attente"
                            : "Révoqué"}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
