// app/dashboard/certificate/[id]/page.tsx
// Page de détail d'un certificat avec QR code et code HTML
// ============================================================

import { prisma } from "@/app/lib/db";
import { auth } from "@/app/lib/auth-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import QRCodeImage from "@/app/components/QRCode";
import CertificateDetailClient from "@/app/components/dashboard/CertificateDetailClient";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const certificateId = resolvedParams.id;

    if (!session?.user?.email) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Session non trouvée. Veuillez vous reconnecter.</p>
          </div>
        </div>
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Utilisateur non trouvé.</p>
          </div>
        </div>
      );
    }

    // Récupérer le certificat avec l'entité
    const certificate = await prisma.certificate.findUnique({
      where: { id: certificateId },
      include: {
        entity: true,
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!certificate) {
      notFound();
    }

    // Vérifier que le certificat appartient à l'utilisateur
    if (certificate.entity.userId !== user.id) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Ce certificat ne vous appartient pas.</p>
          </div>
        </div>
      );
    }

    const entity = certificate.entity;
    const entityName = entity.entityType === 'INDIVIDUAL'
      ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
      : entity.legalName || entity.tradeName || entity.email;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech';
    const verifyUrl = `${baseUrl}/verify/${certificate.publicId || certificate.id}`;
    const badgeUrl = `${baseUrl}/api/badge/${certificate.publicId || certificate.id}`;

    const statusColors = {
      ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/50',
      PENDING: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      REVOKED: 'bg-red-500/20 text-red-400 border-red-500/50',
      SUSPENDED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      ANCHORED: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/50',
      EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
    };

    const levelColors = {
      BRONZE: 'text-amber-600',
      SILVER: 'text-gray-400',
      GOLD: 'text-yellow-500',
      PLATINUM: 'text-purple-500',
    };

    const statusColor = statusColors[certificate.status as keyof typeof statusColors] || statusColors.PENDING;
    const levelColor = levelColors[certificate.level as keyof typeof levelColors] || levelColors.BRONZE;

    const htmlCode = `<a href="${verifyUrl}" target="_blank">
  <img src="${badgeUrl}" alt="Certifié BlockTrust" width="120"/>
</a>`;

    return (
      <div>
        {/* Breadcrumb */}
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="text-cyan-400 hover:text-cyan-300 text-sm font-medium"
          >
            ← Retour au dashboard
          </Link>
        </div>

        {/* En-tête */}
        <div className="mb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
                {entityName}
              </h1>
              <p className="text-gray-400 text-base">{entity.email}</p>
            </div>
            <div className="flex gap-3">
              <span className={`px-4 py-2 rounded-full text-sm font-medium border ${statusColor}`}>
                {certificate.status}
              </span>
              <span className={`px-4 py-2 rounded-full text-sm font-semibold bg-gray-800 ${levelColor}`}>
                {certificate.level}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Informations */}
          <div className="space-y-6">
            {/* Informations de l'entité */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Informations de l'entité</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400 text-sm">Type :</span>
                  <p className="text-white font-semibold">
                    {entity.entityType === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'}
                  </p>
                </div>
                {entity.entityType === 'BUSINESS' && (
                  <>
                    {entity.legalName && (
                      <div>
                        <span className="text-gray-400 text-sm">Nom légal :</span>
                        <p className="text-white font-semibold">{entity.legalName}</p>
                      </div>
                    )}
                    {entity.tradeName && (
                      <div>
                        <span className="text-gray-400 text-sm">Nom commercial :</span>
                        <p className="text-white font-semibold">{entity.tradeName}</p>
                      </div>
                    )}
                    {entity.siret && (
                      <div>
                        <span className="text-gray-400 text-sm">SIRET :</span>
                        <p className="text-white font-semibold">{entity.siret}</p>
                      </div>
                    )}
                  </>
                )}
                {entity.entityType === 'INDIVIDUAL' && (
                  <>
                    {entity.firstName && (
                      <div>
                        <span className="text-gray-400 text-sm">Prénom :</span>
                        <p className="text-white font-semibold">{entity.firstName}</p>
                      </div>
                    )}
                    {entity.lastName && (
                      <div>
                        <span className="text-gray-400 text-sm">Nom :</span>
                        <p className="text-white font-semibold">{entity.lastName}</p>
                      </div>
                    )}
                  </>
                )}
                {entity.website && (
                  <div>
                    <span className="text-gray-400 text-sm">Site web :</span>
                    <a
                      href={entity.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 font-semibold"
                    >
                      {entity.website}
                    </a>
                  </div>
                )}
                {entity.description && (
                  <div>
                    <span className="text-gray-400 text-sm">Description :</span>
                    <p className="text-white">{entity.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Informations du certificat */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Informations du certificat</h2>
              <div className="space-y-3">
                <div>
                  <span className="text-gray-400 text-sm">ID public :</span>
                  <p className="text-white font-mono text-sm">{certificate.publicId || certificate.id}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-sm">Créé le :</span>
                  <p className="text-white font-semibold">
                    {new Date(certificate.issuedAt).toLocaleDateString('fr-FR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
                {certificate.revokedAt && (
                  <div>
                    <span className="text-gray-400 text-sm">Révoqué le :</span>
                    <p className="text-white font-semibold">
                      {new Date(certificate.revokedAt).toLocaleDateString('fr-FR', {
                        day: 'numeric',
                        month: 'long',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
                <div>
                  <span className="text-gray-400 text-sm">Vérifications :</span>
                  <p className="text-white font-semibold">{certificate.verificationCount}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Colonne droite : QR code et intégration */}
          <div className="space-y-6">
            {/* QR code */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">QR Code de vérification</h2>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeImage url={verifyUrl} size={200} />
                </div>
              </div>
              <CertificateDetailClient verifyUrl={verifyUrl} />
            </div>

            {/* Code HTML */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">Intégrer le badge sur votre site</h2>
              <p className="text-gray-400 text-sm mb-4">
                Copiez-collez ce code HTML sur votre site web pour afficher le badge de certification :
              </p>
              <div className="bg-gray-900 rounded-lg p-4 mb-4 overflow-x-auto">
                <pre className="text-xs text-gray-300">
                  <code>{htmlCode}</code>
                </pre>
              </div>
              <CertificateDetailClient htmlCode={htmlCode} />
            </div>

            {/* Historique des vérifications */}
            <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
              <h2 className="text-xl font-bold text-white mb-4">
                Historique des vérifications ({certificate.verifications.length})
              </h2>
              {certificate.verifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {certificate.verifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-700"
                    >
                      <div>
                        <p className="text-white text-sm font-semibold">
                          {verification.result === 'VALID' ? '✅ Vérification valide' : 
                           verification.result === 'REVOKED' ? '❌ Certificat révoqué' : 
                           verification.result === 'EXPIRED' ? '⏰ Certificat expiré' : 
                           '⚠️ Vérification suspecte'}
                        </p>
                        <p className="text-gray-400 text-xs mt-1">
                          {new Date(verification.verifiedAt).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                          {verification.country && ` • ${verification.country}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-400 text-sm text-center py-8">
                  Aucune vérification pour le moment
                </p>
              )}
            </div>

            {/* Actions */}
            {certificate.status !== 'REVOKED' && (
              <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
                <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
                <CertificateDetailClient certificateId={certificate.id} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  } catch (error: any) {
    console.error('❌ Erreur dans CertificateDetailPage:', error);
    return (
      <div className="p-8">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 font-semibold mb-2">Erreur lors du chargement du certificat</p>
          <p className="text-red-300 text-sm">{error?.message || 'Une erreur inattendue s\'est produite'}</p>
        </div>
      </div>
    );
  }
}
