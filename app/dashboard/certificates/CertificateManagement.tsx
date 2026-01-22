"use client";

import { useState } from "react";

interface Certificate {
  id: string;
  status: string;
  level: string;
  issuedAt: string;
  entity: {
    id: string;
    entityType: string;
    legalName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    siret: string | null;
    kycStatus: string;
  };
  user: {
    name: string | null;
    email: string;
  };
}

export default function CertificateManagement({
  certificates: initialCertificates,
}: {
  certificates: Certificate[];
}) {
  const [certificates, setCertificates] = useState(initialCertificates);
  const [loading, setLoading] = useState<string | null>(null);
  const [filter, setFilter] = useState<
    "ALL" | "PENDING" | "ACTIVE" | "REVOKED"
  >("ALL");

  const updateStatus = async (certId: string, newStatus: string) => {
    setLoading(certId);
    try {
      const res = await fetch("/api/admin/certificates", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certificateId: certId, status: newStatus }),
      });

      if (res.ok) {
        setCertificates(
          certificates.map((c) =>
            c.id === certId ? { ...c, status: newStatus } : c
          )
        );
      } else {
        const data = await res.json();
        alert(data.error || "Erreur lors de la mise à jour");
      }
    } catch (error) {
      console.error("Erreur:", error);
      alert("Erreur lors de la mise à jour");
    }
    setLoading(null);
  };

  const getEntityName = (entity: Certificate["entity"]) => {
    if (entity.entityType === "BUSINESS" && entity.legalName) {
      return entity.legalName;
    }
    if (entity.firstName && entity.lastName) {
      return `${entity.firstName} ${entity.lastName}`;
    }
    return entity.email;
  };

  const filteredCertificates =
    filter === "ALL"
      ? certificates
      : certificates.filter((c) => c.status === filter);

  const pendingCount = certificates.filter((c) => c.status === "PENDING").length;
  const activeCount = certificates.filter((c) => c.status === "ACTIVE").length;
  const revokedCount = certificates.filter((c) => c.status === "REVOKED").length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        <button
          onClick={() => setFilter("ALL")}
          className={`p-4 rounded-lg border transition-colors ${
            filter === "ALL"
              ? "bg-gray-700 border-cyan-500"
              : "bg-gray-800 border-gray-700 hover:border-gray-600"
          }`}
        >
          <p className="text-gray-400 text-sm">Total</p>
          <p className="text-2xl font-bold text-white">{certificates.length}</p>
        </button>
        <button
          onClick={() => setFilter("PENDING")}
          className={`p-4 rounded-lg border transition-colors ${
            filter === "PENDING"
              ? "bg-yellow-900/30 border-yellow-500"
              : "bg-gray-800 border-gray-700 hover:border-gray-600"
          }`}
        >
          <p className="text-gray-400 text-sm">En attente</p>
          <p className="text-2xl font-bold text-yellow-400">{pendingCount}</p>
        </button>
        <button
          onClick={() => setFilter("ACTIVE")}
          className={`p-4 rounded-lg border transition-colors ${
            filter === "ACTIVE"
              ? "bg-green-900/30 border-green-500"
              : "bg-gray-800 border-gray-700 hover:border-gray-600"
          }`}
        >
          <p className="text-gray-400 text-sm">Actifs</p>
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
        </button>
        <button
          onClick={() => setFilter("REVOKED")}
          className={`p-4 rounded-lg border transition-colors ${
            filter === "REVOKED"
              ? "bg-red-900/30 border-red-500"
              : "bg-gray-800 border-gray-700 hover:border-gray-600"
          }`}
        >
          <p className="text-gray-400 text-sm">Révoqués</p>
          <p className="text-2xl font-bold text-red-400">{revokedCount}</p>
        </button>
      </div>

      {filteredCertificates.length === 0 ? (
        <div className="bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-400">Aucun certificat dans cette catégorie</p>
        </div>
      ) : (
        <div className="bg-gray-800 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-sm text-gray-300">
                  Entité
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">
                  Propriétaire
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">
                  Niveau
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">
                  Date
                </th>
                <th className="px-4 py-3 text-left text-sm text-gray-300">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredCertificates.map((cert) => (
                <tr key={cert.id} className="border-t border-gray-700">
                  <td className="px-4 py-3">
                    <div>
                      <p className="text-white font-medium">
                        {getEntityName(cert.entity)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {cert.entity.email}
                      </p>
                      {cert.entity.siret && (
                        <p className="text-gray-500 text-xs font-mono">
                          SIRET: {cert.entity.siret}
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        cert.entity.entityType === "BUSINESS"
                          ? "bg-blue-900/50 text-blue-400"
                          : "bg-purple-900/50 text-purple-400"
                      }`}
                    >
                      {cert.entity.entityType === "BUSINESS"
                        ? "Entreprise"
                        : "Particulier"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-gray-300 text-sm">
                      {cert.user.name || cert.user.email}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`px-2 py-1 text-xs rounded ${
                        cert.level === "GOLD"
                          ? "bg-yellow-900/50 text-yellow-400"
                          : cert.level === "SILVER"
                          ? "bg-gray-600 text-gray-300"
                          : "bg-orange-900/50 text-orange-400"
                      }`}
                    >
                      {cert.level}
                    </span>
                  </td>
                  <td className="px-4 py-3">
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
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-sm">
                    {new Date(cert.issuedAt).toLocaleDateString("fr-FR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {cert.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => updateStatus(cert.id, "ACTIVE")}
                            disabled={loading === cert.id}
                            className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                          >
                            {loading === cert.id ? "..." : "Valider"}
                          </button>
                          <button
                            onClick={() => updateStatus(cert.id, "REVOKED")}
                            disabled={loading === cert.id}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                          >
                            Refuser
                          </button>
                        </>
                      )}
                      {cert.status === "ACTIVE" && (
                        <button
                          onClick={() => updateStatus(cert.id, "REVOKED")}
                          disabled={loading === cert.id}
                          className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 disabled:opacity-50"
                        >
                          Révoquer
                        </button>
                      )}
                      {cert.status === "REVOKED" && (
                        <button
                          onClick={() => updateStatus(cert.id, "ACTIVE")}
                          disabled={loading === cert.id}
                          className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-700 disabled:opacity-50"
                        >
                          Réactiver
                        </button>
                      )}
                      <a
                        href={`/verify/${cert.id}`}
                        target="_blank"
                        className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-500"
                      >
                        Voir
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
