import { prisma } from "@/app/lib/db";
import QRCodeComponent from "@/app/components/QRCode";
import Sidebar from "@/app/components/Sidebar";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

const ADMIN_EMAILS = ["brnbtech@gmail.com"];

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  // TEMPORAIREMENT DÉSACTIVÉ POUR DEBUG
  // if (!session?.user?.email) {
  //   redirect("/login?callbackUrl=/dashboard");
  // }
  // const userEmail = session.user.email.toLowerCase();
  // if (!ADMIN_EMAILS.includes(userEmail)) {
  //   redirect("/unauthorized");
  // }

  console.log("Session:", session);

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const entities = await prisma.entity.findMany({
    include: {
      certificates: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const totalCertificates = entities.length;
  const totalBusinesses = entities.filter((e) => e.entityType === "BUSINESS").length;
  const totalIndividuals = entities.filter((e) => e.entityType === "INDIVIDUAL").length;

  const getDisplayName = (entity: any) => {
    if (entity.entityType === "BUSINESS") {
      return entity.legalName || "Entreprise sans nom";
    }
    return `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || "Particulier";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Sidebar />

      <main className="p-4 pt-20 lg:ml-64 lg:pt-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-white">Mes Certificats</h1>
            <p className="text-gray-400 text-sm md:text-base">Gérez vos badges de certification</p>
          </div>
          <a
            href="/dashboard/create"
            className="w-full sm:w-auto text-center bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-6 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all"
          >
            + Créer un certificat
          </a>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6 mb-6 md:mb-8">
          <div className="bg-white/5 backdrop-blur-lg p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-xs md:text-sm mb-1">Total certificats</p>
            <p className="text-2xl md:text-4xl font-bold text-white">{totalCertificates}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-xs md:text-sm mb-1">🏢 Entreprises</p>
            <p className="text-2xl md:text-4xl font-bold text-cyan-400">{totalBusinesses}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-xs md:text-sm mb-1">👤 Particuliers</p>
            <p className="text-2xl md:text-4xl font-bold text-purple-400">{totalIndividuals}</p>
          </div>
          <div className="bg-white/5 backdrop-blur-lg p-4 md:p-6 rounded-xl md:rounded-2xl border border-gray-700">
            <p className="text-gray-400 text-xs md:text-sm mb-1">Plan actuel</p>
            <p className="text-2xl md:text-4xl font-bold text-yellow-400">Pro</p>
          </div>
        </div>

        {/* Certificates */}
        {entities.length > 0 ? (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-800/50">
                    <tr>
                      <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Type</th>
                      <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Nom</th>
                      <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Identifiant</th>
                      <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Niveau</th>
                      <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">Statut</th>
                      <th className="text-left text-gray-400 text-sm font-medium px-6 py-4">QR</th>
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
                          <div className="bg-white p-1 rounded-md inline-flex">
                            <QRCodeComponent url={`${baseUrl}/badge-v2/${entity.id}`} size={64} />
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <a href={`/verify/${entity.id}`} className="text-cyan-400 hover:text-cyan-300 text-sm">
                              Vérifier
                            </a>
                            <a href={`/badge-v2/${entity.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm">
                              Badge V2
                            </a>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-4">
              {entities.map((entity) => (
                <div
                  key={entity.id}
                  className="bg-white/5 backdrop-blur-lg rounded-xl border border-gray-700 p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">
                        {entity.entityType === "BUSINESS" ? "🏢" : "👤"}
                      </span>
                      <div>
                        <p className="text-white font-medium">{getDisplayName(entity)}</p>
                        <p className="text-gray-500 text-xs">{entity.email}</p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
                        entity.validationLevel === "GOLD"
                          ? "bg-yellow-500/20 text-yellow-400"
                          : entity.validationLevel === "SILVER"
                          ? "bg-gray-500/20 text-gray-300"
                          : "bg-orange-500/20 text-orange-400"
                      }`}
                    >
                      {entity.validationLevel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mb-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-bold ${
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
                    {entity.entityType === "BUSINESS" && entity.siret && (
                      <code className="text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded text-xs">
                        {entity.siret}
                      </code>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-700">
                    <div className="bg-white p-1 rounded-md">
                      <QRCodeComponent url={`${baseUrl}/badge-v2/${entity.id}`} size={48} />
                    </div>
                    <div className="flex gap-3">
                      <a href={`/verify/${entity.id}`} className="text-cyan-400 hover:text-cyan-300 text-sm font-medium">
                        Vérifier
                      </a>
                      <a href={`/badge-v2/${entity.id}`} className="text-yellow-400 hover:text-yellow-300 text-sm font-medium">
                        Badge V2
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-8 md:p-12 text-center">
            <div className="text-5xl md:text-6xl mb-4">📭</div>
            <h3 className="text-lg md:text-xl font-bold text-white mb-2">Aucun certificat</h3>
            <p className="text-gray-400 text-sm md:text-base mb-6">Créez votre premier badge de certification</p>
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
