// app/components/dashboard/CertificateCard.tsx
// Carte affichant un certificat dans la liste
// ============================================================

import Link from 'next/link'
import {
  getValidationLevelAccentClass,
  getValidationLevelLabel,
} from '@/lib/validationLevelDisplay'

type CertificateCardProps = {
  certificate: {
    id: string
    publicId: string | null
    status: string
    level: string
    issuedAt: Date
    verificationCount: number
    entity: {
      id: string
      entityType: string
      legalName: string | null
      tradeName: string | null
      firstName: string | null
      lastName: string | null
      email: string
    }
  }
  onRevoke?: (id: string) => void
}

export default function CertificateCard({ certificate, onRevoke }: CertificateCardProps) {
  const entityName = certificate.entity.entityType === 'INDIVIDUAL'
    ? `${certificate.entity.firstName || ''} ${certificate.entity.lastName || ''}`.trim() || certificate.entity.email
    : certificate.entity.legalName || certificate.entity.tradeName || certificate.entity.email

  const statusColors = {
    ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/50',
    PENDING: 'bg-orange-500/20 text-orange-400 border-orange-500/50',
    REVOKED: 'bg-red-500/20 text-red-400 border-red-500/50',
    SUSPENDED: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50',
    ANCHORED: 'border border-bt-cyan/40 bg-bt-cyan/20 text-bt-cyan',
    EXPIRED: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
  }

  const statusColor = statusColors[certificate.status as keyof typeof statusColors] || statusColors.PENDING
  const levelColor = getValidationLevelAccentClass(certificate.level)

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-white mb-1">{entityName}</h3>
          <p className="text-sm text-gray-400">{certificate.entity.email}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
          {certificate.status}
        </span>
      </div>

      <div className="flex items-center gap-6 mb-4 text-sm">
        <div>
          <span className="text-gray-400">Niveau :</span>
          <span className={`ml-2 font-semibold ${levelColor}`}>
            {getValidationLevelLabel(certificate.level)}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Créé le :</span>
          <span className="ml-2 text-white">
            {new Date(certificate.issuedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Vérifications :</span>
          <span className="ml-2 text-white font-semibold">{certificate.verificationCount}</span>
        </div>
      </div>

      <div className="flex gap-3">
        <Link
          href={`/dashboard/certificate/${certificate.id}`}
          className="flex-1 rounded-lg bg-bt-cyan py-2.5 px-4 text-center font-sans font-semibold text-navy transition-all hover:bg-bt-cyan/90"
        >
          Voir
        </Link>
        {certificate.status !== 'REVOKED' && onRevoke && (
          <button
            onClick={() => onRevoke(certificate.id)}
            className="px-4 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/50 rounded-lg transition-colors font-semibold"
          >
            Révoquer
          </button>
        )}
      </div>
    </div>
  )
}
