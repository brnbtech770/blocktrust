// app/admin/certificates/[id]/page.tsx
// Détail d'un certificat avec actions admin
// ============================================================

import { prisma } from '@/app/lib/db'
import { notFound } from 'next/navigation'
import CertificateActions from '@/app/components/admin/CertificateActions'

export default async function AdminCertificateDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const certificate = await prisma.certificate.findUnique({
    where: { id },
    include: {
      entity: {
        select: {
          id: true,
          entityType: true,
          legalName: true,
          tradeName: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          siret: true,
          website: true,
          description: true,
          kycStatus: true,
          validationLevel: true,
        },
      },
      verifications: {
        take: 10,
        orderBy: { verifiedAt: 'desc' },
      },
    },
  })

  if (!certificate) {
    notFound()
  }

  const getEntityName = () => {
    if (certificate.entity.entityType === 'INDIVIDUAL') {
      return `${certificate.entity.firstName || ''} ${certificate.entity.lastName || ''}`.trim() || certificate.entity.email
    }
    return certificate.entity.legalName || certificate.entity.tradeName || certificate.entity.email
  }

  return (
    <div>
      <div className="mb-8">
        <a
          href="/admin/certificates"
          className="text-cyan-400 hover:text-cyan-300 mb-4 inline-block"
        >
          ← Retour à la liste
        </a>
        <h1 className="text-3xl font-bold text-white">Détail du certificat</h1>
        <p className="text-gray-400">ID: {certificate.publicId || certificate.id}</p>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Informations entité */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Informations entité</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Nom</p>
              <p className="text-white">{getEntityName()}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Type</p>
              <p className="text-white">
                {certificate.entity.entityType === 'INDIVIDUAL' ? 'Particulier' : 'Entreprise'}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Email</p>
              <p className="text-white">{certificate.entity.email}</p>
            </div>
            {certificate.entity.siret && (
              <div>
                <p className="text-gray-400 text-sm">SIRET</p>
                <p className="text-white">{certificate.entity.siret}</p>
              </div>
            )}
            {certificate.entity.website && (
              <div>
                <p className="text-gray-400 text-sm">Site web</p>
                <p className="text-white">{certificate.entity.website}</p>
              </div>
            )}
          </div>
        </div>

        {/* Informations certificat */}
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4">Informations certificat</h2>
          <div className="space-y-3">
            <div>
              <p className="text-gray-400 text-sm">Statut</p>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${
                  certificate.status === 'PENDING'
                    ? 'bg-yellow-500/20 text-yellow-400'
                    : certificate.status === 'ACTIVE'
                    ? 'bg-green-500/20 text-green-400'
                    : certificate.status === 'SUSPENDED'
                    ? 'bg-orange-500/20 text-orange-400'
                    : 'bg-red-500/20 text-red-400'
                }`}
              >
                {certificate.status}
              </span>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Niveau</p>
              <p className="text-white">{certificate.level}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Date d'émission</p>
              <p className="text-white">
                {new Date(certificate.issuedAt).toLocaleDateString('fr-FR')}
              </p>
            </div>
            {certificate.revokedAt && (
              <div>
                <p className="text-gray-400 text-sm">Date de révocation</p>
                <p className="text-white">
                  {new Date(certificate.revokedAt).toLocaleDateString('fr-FR')}
                </p>
              </div>
            )}
            {certificate.revocationReason && (
              <div>
                <p className="text-gray-400 text-sm">Raison de révocation</p>
                <p className="text-white">{certificate.revocationReason}</p>
              </div>
            )}
            <div>
              <p className="text-gray-400 text-sm">Vérifications</p>
              <p className="text-white">{certificate.verificationCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions admin */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4">Actions</h2>
        <CertificateActions certificateId={certificate.id} currentStatus={certificate.status} />
      </div>
    </div>
  )
}
