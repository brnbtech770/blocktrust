import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";
import QRCodeImage from "@/app/components/QRCode";
import VerifyBadgeButton from "@/app/components/VerifyBadgeButton";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

export default async function BadgePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // Chercher d'abord par certificat (publicId)
  let certificate = await prisma.certificate.findUnique({
    where: { publicId: id },
    include: { entity: true },
  });

  if (!certificate) {
    certificate = await prisma.certificate.findUnique({
      where: { id },
      include: { entity: true },
    });
  }

  if (!certificate) {
    // Fallback: chercher par entité
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

    // Utiliser le premier certificat de l'entité
    const firstCert = entity.certificates[0];
    if (!firstCert) {
      notFound();
    }
    // Récupérer le certificat avec l'entité
    certificate = await prisma.certificate.findUnique({
      where: { id: firstCert.id },
      include: { entity: true },
    });
    if (!certificate) {
      notFound();
    }
  }

  const entity = certificate.entity;

  // Récupérer le TrustScore de l'entité
  const trustScore = await prisma.trustScore.findUnique({
    where: { entityId: entity.id },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const certIdForVerify = certificate.publicId || certificate.id;
  const verifyUrl = `${baseUrl}/verify?certId=${encodeURIComponent(certIdForVerify)}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950 flex items-center justify-center p-4">
      <div className="bg-blue-900/30 backdrop-blur-lg p-8 rounded-3xl border border-blue-800/50 max-w-md w-full">
        <div className="text-center mb-6">
          <div className="mb-4 flex flex-col items-center gap-3">
            <BlockTrustBadge
              size={56}
              instanceId={`badge-static-${certificate.id.slice(0, 8)}`}
              className="mx-auto shrink-0 drop-shadow-[0_0_14px_rgba(0,212,255,0.45)]"
            />
            <h1 className="font-syne text-2xl font-bold leading-none tracking-wider neon-cyan">
              BLOCKTRUST<span className="text-[10px] align-super">™</span>
            </h1>
          </div>
          <p className="text-gray-300 text-sm mt-2">Certificat de confiance vérifié</p>
        </div>

        <div className="mx-auto mb-6 w-full max-w-[290px]">
          <div className="flex justify-center">
            <div className="rounded-2xl border-2 border-cyan-400/30 bg-white p-6 shadow-2xl transition-colors hover:border-cyan-400/50">
              <QRCodeImage url={verifyUrl} size={250} />
            </div>
          </div>
          <VerifyBadgeButton certId={certIdForVerify} />
          <p className="mx-auto mt-4 max-w-xs text-center text-xs italic leading-relaxed text-white/20">
            Ce badge n&apos;est valide que s&apos;il est accompagné de son QR code ou de son lien de vérification
            officiel.
          </p>
        </div>

        <div className="space-y-4 mb-6">
          <div className="text-center">
            <p className="text-gray-300 text-sm mb-2">
              {entity.entityType === 'INDIVIDUAL' 
                ? '✅ Identité vérifiée par BLOCKTRUST'
                : `✅ Entreprise certifiée BLOCKTRUST${entity.siret ? ` • SIRET ${entity.siret}` : ''}`}
            </p>
            <p className="text-white text-xl font-bold">
              {entity.entityType === 'INDIVIDUAL'
                ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
                : entity.legalName || entity.tradeName || entity.email}
            </p>
          </div>

          <div className="flex justify-center gap-4 flex-wrap">
            <div className="text-center">
              <p className="text-gray-300 text-xs">Niveau</p>
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
              <p className="text-gray-300 text-xs">Statut</p>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold ${
                  entity.kycStatus === "VERIFIED"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-yellow-500/20 text-yellow-400"
                }`}
              >
                {entity.kycStatus === "VERIFIED" ? "Validé" : "En attente"}
              </span>
            </div>
            {trustScore && (
              <div className="text-center">
                <p className="text-gray-300 text-xs">TrustScore</p>
                <div className="flex items-center gap-1 justify-center">
                  <span className="font-bold text-lg text-cyan-400">
                    {trustScore.score}
                  </span>
                  <span className="text-xs text-gray-300">/100</span>
                </div>
                <span className="text-xs text-gray-300">{trustScore.level}</span>
              </div>
            )}
          </div>
        </div>

        <div className="text-center text-gray-300 text-sm">
          <p>Scannez le QR code pour vérifier</p>
          <p>l'authenticité de ce certificat</p>
        </div>

        <div className="mt-6 pt-6 border-t border-blue-800/50 text-center">
          {entity.entityType === 'BUSINESS' && entity.siret && (
            <p className="text-gray-300 text-xs">SIRET: {entity.siret}</p>
          )}
          <p className="text-cyan-400 text-xs mt-1">blocktrust.io</p>
        </div>
      </div>
    </div>
  );
}
