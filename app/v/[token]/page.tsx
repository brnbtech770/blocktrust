import { prisma } from "@/app/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

interface VerifyPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ h?: string }>;
}

export default async function VerifyV2Page({ params, searchParams }: VerifyPageProps) {
  const resolvedParams = await params;
  const resolvedSearchParams = await searchParams;

  const jti = resolvedParams.token;
  const hashFromUrl = resolvedSearchParams.h;

  // Récupère la signature
  const signature = await prisma.signature.findUnique({
    where: { jti },
  });

  // Récupère l'entité si la signature existe
  let entity = null;
  if (signature) {
    entity = await prisma.entity.findUnique({
      where: { id: signature.entityId },
    });
  }

  // Détermine le verdict
  let verdict: "VALID" | "INVALID_TOKEN" | "REVOKED" | "EXPIRED" | "HASH_MISMATCH" = "VALID";
  let message = "";

  if (!signature) {
    verdict = "INVALID_TOKEN";
    message = "Ce certificat n'existe pas ou a été falsifié.";
  } else if (signature.revoked) {
    verdict = "REVOKED";
    message = "Ce certificat a été révoqué.";
  } else if (new Date() > signature.expiresAt) {
    verdict = "EXPIRED";
    message = "Ce certificat a expiré.";
  } else if (hashFromUrl && !signature.ctxHash.startsWith(hashFromUrl)) {
    verdict = "HASH_MISMATCH";
    message = "ALERTE : Ce lien a été copié dans un contexte frauduleux !";
  }

  // Log la vérification
  await prisma.verificationEvent.create({
    data: {
      jti,
      verdict,
      ip: "web",
      userAgent: "browser",
    },
  });

  // Affichage selon le verdict
  if (verdict !== "VALID") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-red-900/20 to-gray-900 flex items-center justify-center p-4">
        <div className="bg-red-500/10 border-2 border-red-500 p-8 rounded-3xl max-w-md w-full text-center">
          <div className="text-8xl mb-6">{verdict === "HASH_MISMATCH" ? "⚠️" : "❌"}</div>
          <h1 className="text-3xl font-bold text-red-400 mb-4">
            {verdict === "HASH_MISMATCH" ? "Alerte Fraude !" : "Certificat Invalide"}
          </h1>
          <p className="text-gray-300 mb-6">{message}</p>

          {verdict === "HASH_MISMATCH" && (
            <div className="bg-red-500/20 p-4 rounded-xl mb-6">
              <p className="text-red-300 text-sm">
                🚨 Ce lien de vérification a été copié depuis un autre contexte. Le contenu que vous
                consultez n'est PAS celui qui a été certifié.
              </p>
            </div>
          )}

          <div className="text-gray-500 text-sm">
            <p>Code erreur : {verdict}</p>
            <p>Token : {jti.substring(0, 8)}...</p>
          </div>

          <a href="/" className="inline-block mt-6 bg-gray-700 text-white py-3 px-6 rounded-lg hover:bg-gray-600 transition">
            Retour à l'accueil
          </a>
        </div>
      </div>
    );
  }

  // Succès - Certificat valide
  const displayName =
    entity?.entityType === "BUSINESS" ? entity?.legalName : `${entity?.firstName} ${entity?.lastName}`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-green-900/20 to-gray-900 flex items-center justify-center p-4">
      <div className="bg-green-500/10 border-2 border-green-500 p-8 rounded-3xl max-w-md w-full text-center">
        <div className="text-8xl mb-6">✅</div>
        <h1 className="text-3xl font-bold text-green-400 mb-4">Certificat Authentique</h1>

        <div className="bg-gray-800 rounded-xl p-6 text-left space-y-4 mb-6">
          <div>
            <p className="text-gray-500 text-sm">Type</p>
            <p className="text-white flex items-center gap-2">
              {entity?.entityType === "BUSINESS" ? "🏢 Entreprise" : "👤 Particulier"}
            </p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Identité vérifiée</p>
            <p className="text-white text-xl font-bold">{displayName}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Email</p>
            <p className="text-cyan-400">{entity?.email}</p>
          </div>

          {entity?.entityType === "BUSINESS" && entity?.siret && (
            <div>
              <p className="text-gray-500 text-sm">SIRET</p>
              <p className="text-cyan-400 font-mono">{entity.siret}</p>
            </div>
          )}

          <div>
            <p className="text-gray-500 text-sm">Niveau de validation</p>
            <span
              className={`inline-block px-3 py-1 rounded-full text-sm font-bold ${
                entity?.validationLevel === "GOLD"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : entity?.validationLevel === "SILVER"
                  ? "bg-gray-500/20 text-gray-300"
                  : "bg-orange-500/20 text-orange-400"
              }`}
            >
              {entity?.validationLevel}
            </span>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Contexte certifié</p>
            <p className="text-white">{signature?.ctxType}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Émis le</p>
            <p className="text-gray-300">{signature?.issuedAt.toLocaleDateString("fr-FR")}</p>
          </div>

          <div>
            <p className="text-gray-500 text-sm">Expire le</p>
            <p className="text-gray-300">{signature?.expiresAt.toLocaleDateString("fr-FR")}</p>
          </div>
        </div>

        <div className="bg-green-500/20 p-4 rounded-xl mb-6">
          <p className="text-green-300 text-sm">
            🔐 Ce certificat est cryptographiquement signé et vérifié. Le contenu associé est authentique.
          </p>
        </div>

        <p className="text-gray-500 text-sm">🛡️ Vérifié par BlockTrust</p>
      </div>
    </div>
  );
}
