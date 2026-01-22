import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";

export default async function VerifyBadge({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      entity: true,
    },
  });

  if (certificate) {
    const entity = certificate.entity;
    const isActive = certificate.status === "ACTIVE";

    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div
            className={`rounded-2xl p-8 border ${
              isActive
                ? "bg-green-900/20 border-green-500"
                : "bg-yellow-900/20 border-yellow-500"
            }`}
          >
            <div className="text-center mb-6">
              <div
                className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
                  isActive ? "bg-green-500" : "bg-yellow-500"
                }`}
              >
                {isActive ? (
                  <svg
                    className="w-10 h-10 text-white"
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
                ) : (
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                )}
              </div>
              <h1
                className={`text-2xl font-bold ${
                  isActive ? "text-green-400" : "text-yellow-400"
                }`}
              >
                {isActive ? "Certificat Vérifié" : "Certificat En Attente"}
              </h1>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Entité</p>
                <p className="text-white font-semibold">
                  {entity.entityType === "BUSINESS"
                    ? entity.legalName
                    : `${entity.firstName} ${entity.lastName}`}
                </p>
              </div>

              {entity.entityType === "BUSINESS" && entity.siret && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <p className="text-gray-400 text-sm">SIRET</p>
                  <p className="text-white font-mono">{entity.siret}</p>
                </div>
              )}

              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Email</p>
                <p className="text-white">{entity.email}</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Niveau</p>
                <p className="text-white">{certificate.level}</p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Statut</p>
                <p className={isActive ? "text-green-400" : "text-yellow-400"}>
                  {certificate.status === "ACTIVE"
                    ? "Actif"
                    : certificate.status === "PENDING"
                    ? "En attente de validation"
                    : certificate.status}
                </p>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <p className="text-gray-400 text-sm">Date d émission</p>
                <p className="text-white">
                  {new Date(certificate.issuedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-700 text-center">
              <p className="text-gray-500 text-sm">Vérifié par BlockTrust</p>
              <p className="text-gray-600 text-xs mt-1">
                ID: {certificate.id}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  let entity = await prisma.entity.findUnique({
    where: { id },
  });

  if (!entity) {
    entity = await prisma.entity.findUnique({
      where: { siret: id },
    });
  }

  if (!entity) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-gray-800 rounded-2xl p-8 border border-gray-700">
        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-4">
            Entité Enregistrée
          </h1>
          <p className="text-gray-400">
            {entity.entityType === "BUSINESS"
              ? entity.legalName
              : `${entity.firstName} ${entity.lastName}`}
          </p>
        </div>
      </div>
    </div>
  );
}