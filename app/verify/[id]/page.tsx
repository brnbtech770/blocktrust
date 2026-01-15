import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";

export default async function VerifyBadge({ 
  params 
}: { 
  params: Promise<{ id: string }> 
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

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-green-500/20 border-2 border-green-500 p-8 rounded-3xl max-w-md w-full text-center">
        <div className="text-8xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-green-400 mb-4">Certificat Valide</h1>
        <div className="bg-gray-800 rounded-xl p-6 text-left space-y-4">
          <div>
            <p className="text-gray-500 text-sm">Entité</p>
            <p className="text-white text-xl font-bold">{entity.legalName}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">SIRET</p>
            <p className="text-cyan-400 font-mono">{entity.siret}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Email</p>
            <p className="text-white">{entity.email}</p>
          </div>
          <div>
            <p className="text-gray-500 text-sm">Statut</p>
            <span className="bg-yellow-500/20 text-yellow-400 px-3 py-1 rounded-full text-sm">
              {entity.kycStatus}
            </span>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-6">
          🛡️ Vérifié par BlockTrust
        </p>
      </div>
    </div>
  );
}