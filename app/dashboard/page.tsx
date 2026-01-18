import { prisma } from "@/app/lib/db";

export default async function Dashboard() {
  // Récupère les vraies données de la base
  const entities = await prisma.entity.findMany({
    include: {
      certificates: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Calcule les stats
  const totalCertificates = entities.length;
  const totalBusinesses = entities.filter((e) => e.entityType === "BUSINESS").length;
  const totalIndividuals = entities.filter((e) => e.entityType === "INDIVIDUAL").length;

  // Fonction pour obtenir le nom d'affichage
  const getDisplayName = (entity: any) => {
    if (entity.entityType === "BUSINESS") {
      return entity.legalName || "Entreprise sans nom";
    }
    return `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || "Particulier";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-6">
        <div className="text-2xl font-bold text-white mb-8">
          🛡️ BlockTrust
        </div>

        <nav className="space-y-2">
          <a href="/dashboard" className="flex items-center gap-3 px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-lg">
            <span>📜</span> Certificats
          </a>
          <a href="/dashboard/create" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-lg">
            <span>➕</span> Créer
          </a>
          <a href="/dashboard/settings" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-lg">
            <span>⚙️</span> Paramètres
          </a>
          <a href="/dashboard/billing" className="flex items-center gap-3 px-4 py-3 text-gray-400 hover:bg-gray-800 rounded-lg">
            <span>💳</span> Facturation
          </a>
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
              O
            </div>
            <div>
              <p className="text-white text-sm font-medium">Olivier</p>
              <p className="text-gray-400 text-xs">Plan Pro</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Mes Certificats</h1>
            <p className="text-gray-400">Gérez vos badges de certification</p>
          </div>
          <a
            href="/dashboard/create"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            + Créer un certificat
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-6 mb-8">
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-sm mb-1">Total certificats</p>
            <p className="text-4xl font-bold text-white">{totalCertificates}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-sm mb-1">🏢 Entreprises</p>
            <p className="text-4xl font-bold text-cyan-400">{totalBusinesses}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-sm mb-1">👤 Particuliers</p>
            <p className="text-4xl font-bold text-purple-400">{totalIndividuals}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-6 rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-sm mb-1">Plan actuel</p>
            <p className="text-4xl font-bold text-yellow-400">Pro</p>
          </div>
        </div>

        {/* Certificates Table */}
        {entities.length > 0 ? (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-800/50">
                <tr>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Type</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Nom</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Identifiant</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Niveau</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Statut</th>
                  <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Actions</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => (
                  <tr key={entity.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                    <td className="px-6 py-4">
                      <span className="text-2xl">
                        {entity.entityType === "BUSINESS" ? "🏢" : "👤"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-white font-medium">{getDisplayName(entity)}</p>
                      <p className="text-gray-500 text-sm">{entity.email}</p>
                    </td>
                    <td className="px-6 py-4">
                      {entity.entityType === "BUSINESS" && entity.siret ? (
                        <code className="text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded">{entity.siret}</code>
                      ) : (
                        <span className="text-gray-500 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          entity.validationLevel === "GOLD"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : entity.validationLevel === "SILVER"
                            ? "bg-gray-500/20 text-gray-300"
                            : "bg-orange-500/20 text-orange-400"
                        }`}
                      >
                        {entity.validationLevel}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${
                          entity.kycStatus === "APPROVED"
                            ? "bg-green-500/20 text-green-400"
                            : entity.kycStatus === "PENDING"
                            ? "bg-yellow-500/20 text-yellow-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {entity.kycStatus === "APPROVED"
                          ? "✓ Validé"
                          : entity.kycStatus === "PENDING"
                          ? "⏳ En attente"
                          : "✗ Rejeté"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <a href={`/verify/${entity.id}`} className="text-cyan-400 hover:text-cyan-300 text-sm">
                          Vérifier
                        </a>
                        <a href={`/badge/${entity.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
                          Badge
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
            <div className="text-6xl mb-4">📭</div>
            <h3 className="text-xl font-bold text-white mb-2">Aucun certificat</h3>
            <p className="text-gray-400 mb-6">Créez votre premier badge de certification</p>
            <a
              href="/dashboard/create"
              className="inline-block bg-cyan-500 text-white font-bold py-3 px-6 rounded-lg"
            >
              Créer mon premier certificat
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
