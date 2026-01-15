import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";
import QRCode from "@/app/components/QRCode";

export default async function BadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  let entity = await prisma.entity.findUnique({
    where: { id },
    include: { certificates: true },
  });

  if (!entity) {
    entity = await prisma.entity.findUnique({
      where: { siret: id },
      include: { certificates: true },
    });
  }

  if (!entity) {
    notFound();
  }

  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/verify/${entity.id}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-gray-700 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🛡️</div>
          <h1 className="text-2xl font-bold text-white">Badge BlockTrust</h1>
          <p className="text-gray-400 text-sm">Certificat de confiance vérifié</p>
        </div>

        <div className="flex justify-center mb-6">
          <div className="bg-white p-4 rounded-2xl">
            <QRCode url={verifyUrl} size={200} />
          </div>
        </div>

        <div className="space-y-4 mb-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm">Entité certifiée</p>
            <p className="text-white text-xl font-bold">{entity.legalName}</p>
          </div>

          <div className="flex justify-center gap-4">
            <div className="text-center">
              <p className="text-gray-500 text-xs">Niveau</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
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
            <div className="text-center">
              <p className="text-gray-500 text-xs">Statut</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  entity.kycStatus === "APPROVED"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {entity.kycStatus === "APPROVED" ? "Validé" : "En attente"}
              </span>
            </div>
          </div>
        </div>

        <div className="text-center text-gray-500 text-sm">
          <p>Scannez le QR code pour vérifier</p>
          <p>l'authenticité de ce certificat</p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-600 text-xs">SIRET: {entity.siret}</p>
          <p className="text-cyan-400 text-xs mt-1">blocktrust.io</p>
        </div>
      </div>
    </div>
  );
}
