// app/dashboard/entities/page.tsx
// Liste des entités de l'utilisateur
// ============================================================

import { prisma } from "@/app/lib/db";
import { auth } from "@/app/lib/auth-server";
import Link from "next/link";

export default async function EntitiesPage() {
  const session = await auth();
  
  if (!session?.user?.email) {
    return null;
  }

  // Récupérer l'utilisateur avec son plan
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: { plan: true },
  });

  if (!user) {
    return null;
  }

  // Récupère les entités de l'utilisateur
  const entities = await prisma.entity.findMany({
    where: { userId: user.id },
    include: {
      certificates: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const plan = user.plan;
  const entitiesCount = entities.length;
  const maxEntities = plan?.maxEntities || 1;
  const limitReached = entitiesCount >= maxEntities;

  return (
    <>
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-bold text-white tracking-tight mb-2">Mes Entités</h1>
          <p className="text-gray-400 text-base">
            {entitiesCount}/{maxEntities} utilisées
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className={`font-bold py-3 px-6 rounded-lg transition-all ${
            limitReached
              ? "bg-gray-700 text-gray-400 cursor-not-allowed"
              : "bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:shadow-lg hover:shadow-cyan-500/50"
          }`}
          aria-disabled={limitReached}
        >
          ➕ Nouvelle entité
        </Link>
      </div>

      {/* Entities List */}
      {entities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entities.map((entity) => {
            const entityName = entity.entityType === "INDIVIDUAL"
              ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
              : entity.legalName || entity.tradeName || entity.email;

            return (
              <div
                key={entity.id}
                className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6 hover:border-cyan-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{entityName}</h3>
                    <p className="text-gray-400 text-base">{entity.email}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    entity.entityType === "BUSINESS"
                      ? "bg-blue-500/20 text-blue-400"
                      : "bg-purple-500/20 text-purple-400"
                  }`}>
                    {entity.entityType === "BUSINESS" ? "🏢 Entreprise" : "👤 Particulier"}
                  </span>
                </div>

                {entity.siret && (
                  <div className="mb-4">
                    <p className="text-gray-400 text-base mb-1 font-medium">SIRET</p>
                    <code className="text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded text-base font-mono">
                      {entity.siret}
                    </code>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-gray-400 text-base font-medium mb-1">Statut KYC</p>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                    entity.kycStatus === "VERIFIED"
                      ? "bg-green-500/20 text-green-400"
                      : entity.kycStatus === "PENDING" || entity.kycStatus === "IN_PROGRESS"
                      ? "bg-yellow-500/20 text-yellow-400"
                      : entity.kycStatus === "REJECTED"
                      ? "bg-red-500/20 text-red-400"
                      : "bg-gray-500/20 text-gray-400"
                  }`}>
                    {entity.kycStatus === "VERIFIED" ? "✓ Validé" : 
                     entity.kycStatus === "PENDING" ? "⏳ En attente" :
                     entity.kycStatus === "IN_PROGRESS" ? "🔄 En cours" :
                     entity.kycStatus === "REJECTED" ? "✗ Rejeté" :
                     entity.kycStatus === "EXPIRED" ? "⏰ Expiré" : entity.kycStatus}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/badge/${entity.certificates[0]?.id || entity.id}`}
                    className="flex-1 text-center bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/dashboard/create?edit=${entity.id}`}
                    className="flex-1 text-center bg-gray-700/50 text-gray-300 hover:bg-gray-700 py-2 px-4 rounded-lg transition-colors text-sm font-medium"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">📭</div>
          <h3 className="text-2xl font-bold text-white mb-2">Aucune entité</h3>
          <p className="text-gray-400 text-base mb-6">Créez votre première entité pour commencer</p>
          <Link
            href="/dashboard/create"
            className="inline-block bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg hover:bg-cyan-600 transition"
          >
            Créer ma première entité
          </Link>
        </div>
      )}
    </>
  );
}
