import { prisma } from "@/app/lib/db";
import { notFound } from "next/navigation";
import QRCodeComponent from "@/app/components/QRCode";
import * as crypto from "crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface BadgeV2PageProps {
  params: Promise<{ id: string }>;
}

export default async function BadgeV2Page({ params }: BadgeV2PageProps) {
  const resolvedParams = await params;
  const id = resolvedParams.id;

  // Récupère l'entité
  const entity = await prisma.entity.findUnique({
    where: { id },
    include: { certificates: true },
  });

  if (!entity) {
    notFound();
  }

  // Vérifie si une signature V2 existe déjà
  let signature = await prisma.signature.findFirst({
    where: {
      entityId: entity.id,
      revoked: false,
      expiresAt: { gt: new Date() },
    },
    orderBy: { issuedAt: "desc" },
  });

  // Si pas de signature, on en crée une
  if (!signature) {
    const certificate = entity.certificates[0];

    if (!certificate) {
      return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
          <div className="text-center text-white">
            <p>Aucun certificat trouvé pour cette entité.</p>
            <a href="/dashboard" className="text-cyan-400 mt-4 inline-block">
              Retour au dashboard
            </a>
          </div>
        </div>
      );
    }

    // Génère le hash du contenu
    const contextData = {
      entityId: entity.id,
      type: entity.entityType,
      name: entity.entityType === "BUSINESS" ? entity.legalName : `${entity.firstName} ${entity.lastName}`,
      email: entity.email,
      timestamp: new Date().toISOString(),
    };
    const ctxHash = crypto.createHash("sha256").update(JSON.stringify(contextData)).digest("hex");

    // Génère un JTI unique
    const jti = crypto.randomUUID();

    // Date d'expiration (1 an)
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 1);

    // Crée la signature
    signature = await prisma.signature.create({
      data: {
        jti,
        certificateId: certificate.id,
        entityId: entity.id,
        ctxType: "identity_badge",
        ctxHash,
        expiresAt,
        revoked: false,
      },
    });
  }

  // URL de vérification V2 avec hash
  const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL || "https://blocktrust.tech"}/v/${signature.jti}?h=${signature.ctxHash.substring(0, 16)}`;

  const displayName = entity.entityType === "BUSINESS" ? entity.legalName : `${entity.firstName} ${entity.lastName}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-white/5 backdrop-blur-lg p-8 rounded-3xl border border-gray-700 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-2">🛡️</div>
          <h1 className="text-2xl font-bold text-white">Badge BlockTrust V2</h1>
          <p className="text-cyan-400 text-sm">Certificat anti-falsification</p>
        </div>

        {/* QR Code */}
        <div className="flex justify-center mb-6">
          <div className="bg-white p-4 rounded-2xl">
            <QRCodeComponent url={verifyUrl} size={200} />
          </div>
        </div>

        {/* Infos */}
        <div className="space-y-4 mb-6">
          <div className="text-center">
            <p className="text-gray-500 text-sm">
              {entity.entityType === "BUSINESS" ? "🏢 Entreprise certifiée" : "👤 Particulier certifié"}
            </p>
            <p className="text-white text-xl font-bold">{displayName}</p>
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

        {/* Sécurité V2 */}
        <div className="bg-cyan-500/10 border border-cyan-500/30 p-4 rounded-xl mb-6">
          <p className="text-cyan-400 text-sm text-center">
            🔐 <strong>Badge V2 anti-falsification</strong>
          </p>
          <p className="text-gray-400 text-xs text-center mt-1">
            Ce QR code est lié cryptographiquement à ce contexte. Toute copie dans un autre contexte sera détectée.
          </p>
        </div>

        {/* Instructions */}
        <div className="text-center text-gray-500 text-sm">
          <p>Scannez le QR code pour vérifier</p>
          <p>l'authenticité de ce certificat</p>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-gray-700 text-center">
          <p className="text-gray-600 text-xs">Token: {signature.jti.substring(0, 8)}...</p>
          <p className="text-gray-600 text-xs mt-1">Expire: {signature.expiresAt.toLocaleDateString("fr-FR")}</p>
          <p className="text-cyan-400 text-xs mt-2">blocktrust.tech</p>
        </div>
      </div>
    </div>
  );
}
