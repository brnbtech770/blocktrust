// app/components/dashboard/DashboardCertificatesList.tsx
// Liste des certificats avec fonctionnalité de révocation
// ============================================================

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import CertificateCard from './CertificateCard'

type Certificate = {
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

type DashboardCertificatesListProps = {
  certificates: Certificate[]
}

export default function DashboardCertificatesList({ certificates }: DashboardCertificatesListProps) {
  const router = useRouter()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  const handleRevoke = async (certificateId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir révoquer ce certificat ? Cette action est irréversible.')) {
      return
    }

    setRevokingId(certificateId)

    try {
      const response = await fetch(`/api/certificates/${certificateId}/revoke`, {
        method: 'POST',
        credentials: 'include',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erreur lors de la révocation')
      }

      // Rafraîchir la page
      router.refresh()
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erreur inconnue'
      alert(`Erreur : ${message}`)
    } finally {
      setRevokingId(null)
    }
  }

  // Limiter à 5 certificats pour l'affichage sur la page principale
  const displayedCertificates = certificates.slice(0, 5)

  return (
    <div className="space-y-4">
      {displayedCertificates.map((certificate) => (
        <CertificateCard
          key={certificate.id}
          certificate={certificate}
          onRevoke={handleRevoke}
        />
      ))}
      {certificates.length > 5 && (
        <div className="text-center pt-4">
          <p className="text-gray-400 text-sm">
            Et {certificates.length - 5} autre{certificates.length - 5 > 1 ? 's' : ''} certificat{certificates.length - 5 > 1 ? 's' : ''}...
          </p>
        </div>
      )}
    </div>
  )
}
