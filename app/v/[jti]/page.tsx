import { notFound } from "next/navigation";

interface PageProps {
  params: { jti: string };
  searchParams: { h?: string };
}

async function getVerification(jti: string, hash: string | undefined) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${baseUrl}/api/v2/verify/${jti}${hash ? `?h=${hash}` : ""}`;

  const res = await fetch(url, { cache: "no-store" });
  return res.json();
}

export default async function VerifyV2Page({ params, searchParams }: PageProps) {
  const result = await getVerification(params.jti, searchParams.h);

  if (result.verdict === "NOT_FOUND") {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        {result.verdict === "VALID" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-green-500 p-6 text-center">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center">
                <svg className="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mt-4">Contenu Authentique</h1>
              <p className="text-green-100 mt-1">Vérifié par BlockTrust</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-500">Entité certifiée</p>
                <p className="text-lg font-semibold text-gray-900">{result.entity.name}</p>
              </div>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="text-gray-900">{result.entity.type}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Niveau</p>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {result.entity.validationLevel}
                  </span>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Signé le</p>
                <p className="text-gray-900">
                  {new Date(result.signature.issuedAt).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>

            <div className="bg-green-50 px-6 py-4 border-t">
              <p className="text-sm text-green-800">
                ✓ Ce contenu a été signé par l'entité ci-dessus et n'a pas été modifié.
              </p>
            </div>
          </div>
        )}

        {result.verdict === "FRAUD_ALERT" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-red-500 p-6 text-center">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center">
                <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mt-4">⚠️ ALERTE FRAUDE</h1>
              <p className="text-red-100 mt-1">Ce lien a été falsifié</p>
            </div>

            <div className="p-6">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h2 className="font-semibold text-red-800">Que s'est-il passé ?</h2>
                <p className="text-red-700 mt-2 text-sm">
                  Ce badge de vérification a été copié depuis un autre contexte. Le contenu où vous avez trouvé ce lien
                  n'est <strong>PAS</strong> authentique.
                </p>
              </div>

              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900">Recommandations :</h3>
                <ul className="mt-2 text-sm text-gray-600 space-y-1">
                  <li>• Ne faites pas confiance au message/email source</li>
                  <li>• Ne cliquez sur aucun autre lien du message</li>
                  <li>• Ne partagez aucune information personnelle</li>
                  <li>• Signalez ce contenu comme frauduleux</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {result.verdict === "EXPIRED" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-orange-500 p-6 text-center">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center">
                <svg className="w-10 h-10 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mt-4">Signature Expirée</h1>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                Cette signature a dépassé sa date de validité. Contactez l'émetteur pour obtenir une nouvelle signature.
              </p>
            </div>
          </div>
        )}

        {result.verdict === "REVOKED" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gray-700 p-6 text-center">
              <div className="w-16 h-16 bg-white rounded-full mx-auto flex items-center justify-center">
                <svg className="w-10 h-10 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                </svg>
              </div>
              <h1 className="text-2xl font-bold text-white mt-4">Signature Révoquée</h1>
            </div>
            <div className="p-6">
              <p className="text-gray-600">
                Cette signature a été révoquée par l'émetteur. Elle n'est plus valide.
              </p>
            </div>
          </div>
        )}

        <div className="mt-6 text-center">
          <a href="https://blocktrust.tech" className="text-sm text-gray-500 hover:text-gray-700">
            Propulsé par <span className="font-semibold">BlockTrust</span>
          </a>
        </div>
      </div>
    </div>
  );
}
