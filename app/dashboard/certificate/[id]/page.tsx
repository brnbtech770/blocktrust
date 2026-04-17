// app/dashboard/certificate/[id]/page.tsx
// Page de détail d'un certificat — badge Lovable + QR dynamique
// ============================================================

import { prisma } from "@/app/lib/db";
import { auth } from "@/app/lib/auth-server";
import { notFound } from "next/navigation";
import Link from "next/link";
import QRCodeImage from "@/app/components/QRCode";
import CertificateDetailClient from "@/app/components/dashboard/CertificateDetailClient";
import CertificateBadgeSection from "@/app/components/dashboard/CertificateBadgeSection";

export default async function CertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  try {
    const session = await auth();
    const resolvedParams = await params;
    const certificateId = resolvedParams.id;

    if (!session?.user?.id) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Session non trouvée. Veuillez vous reconnecter.</p>
          </div>
        </div>
      );
    }

    const certificate = await prisma.certificate.findFirst({
      where: {
        id: certificateId,
        entity: { userId: session.user.id },
      },
      include: {
        entity: true,
        signatures: {
          where: { revoked: false },
          orderBy: { issuedAt: 'desc' },
          take: 1,
        },
        verifications: {
          orderBy: { verifiedAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!certificate) {
      notFound();
    }

    const entity = certificate.entity;
    const entityName = entity.entityType === 'INDIVIDUAL'
      ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
      : entity.legalName || entity.tradeName || entity.email;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || 'https://blocktrust.tech';
    const signature = certificate.signatures?.[0];
    const now = new Date();
    const useDynamicQr =
      signature?.dynamicToken &&
      signature?.tokenExpiry &&
      signature.tokenExpiry > now;
    const verifyUrl =
      signature?.jti && signature?.contextHash
        ? useDynamicQr
          ? `${baseUrl}/verify/qr/${signature.dynamicToken}?h=${signature.contextHash}`
          : `${baseUrl}/verify/${signature.jti}?h=${signature.contextHash}`
        : `${baseUrl}/verify/${certificate.publicId || certificate.id}`;
    const badgeId = certificate.publicId || certificate.id;
    const badgeUrl = `${baseUrl}/api/badge/${badgeId}`;

    const statusColors = {
      ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/50',
      PENDING: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
      REVOKED: 'bg-red-500/20 text-red-400 border-red-500/50',
      SUSPENDED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
      ANCHORED: 'border border-bt-cyan/40 bg-bt-cyan/20 text-bt-cyan',
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
  <img src="${badgeUrl}" alt="Certifié BlockTrust" width="320" height="100"/>
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

        {/* Section Badge — design Lovable (2 colonnes : config | aperçu) */}
        <section
          className="rounded-2xl border border-[rgba(0,212,255,0.15)] p-6 lg:p-8 mb-8"
          style={{ background: '#0a1628' }}
        >
          <CertificateBadgeSection
            certificateId={certificate.id}
            publicId={certificate.publicId}
            baseUrl={baseUrl}
            signature={
              signature
                ? {
                    jti: signature.jti,
                    contextHash: signature.contextHash,
                    scanCount: signature.scanCount,
                    maxScans: signature.maxScans,
                  }
                : null
            }
          />
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Colonne gauche : Informations */}
          <div className="space-y-6">
            {/* Informations de l'entité */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
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
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
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

          {/* Colonne droite : QR code, intégration, historique, actions */}
          <div className="space-y-6">
            {/* QR code */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
              <h2 className="text-xl font-bold text-white mb-4">QR Code de vérification</h2>
              <div className="flex justify-center mb-4">
                <div className="bg-white p-4 rounded-xl">
                  <QRCodeImage url={verifyUrl} size={200} />
                </div>
              </div>
              <CertificateDetailClient verifyUrl={verifyUrl} />
            </div>

            {/* Code HTML */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
              <h2 className="text-xl font-bold text-white mb-4">Intégrer le badge sur votre site</h2>
              <p className="text-gray-400 text-sm mb-4">
                Copiez-collez ce code HTML sur votre site web pour afficher le badge de certification :
              </p>
              <div
                className="rounded-lg p-4 mb-4 overflow-x-auto border"
                style={{
                  background: 'rgba(0,0,0,0.3)',
                  borderColor: 'rgba(0,212,255,0.15)',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'rgba(232,234,240,0.6)',
                }}
              >
                <div className="mb-2" style={{ color: '#00d4ff' }}>
                  Code d&apos;intégration
                </div>
                <code className="block break-all text-gray-300 text-xs">{htmlCode}</code>
                <CertificateDetailClient htmlCode={htmlCode} />
              </div>
            </div>

            {/* Historique des vérifications */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
              <h2 className="text-xl font-bold text-white mb-4">
                Historique des vérifications ({certificate.verifications.length})
              </h2>
              {certificate.verifications.length > 0 ? (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {certificate.verifications.map((verification) => (
                    <div
                      key={verification.id}
                      className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-3"
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
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
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
