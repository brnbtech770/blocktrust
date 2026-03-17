// app/admin/certificates/page.tsx
// Liste de toutes les demandes de certificats
// ============================================================

import { prisma } from '@/app/lib/db'
import Link from 'next/link'
import QuickActions from '@/app/components/admin/QuickActions'

type SearchParams = {
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const statusFilter = resolvedSearchParams.status as string | undefined
  const typeFilter = resolvedSearchParams.type as string | undefined
  const dateFrom = resolvedSearchParams.dateFrom ? new Date(resolvedSearchParams.dateFrom) : null
  const dateTo = resolvedSearchParams.dateTo ? new Date(resolvedSearchParams.dateTo) : null

  const where: any = {}
  
  if (statusFilter) {
    where.status = statusFilter
  }
  
  if (typeFilter) {
    where.entity = {
      entityType: typeFilter === 'B2C' ? 'INDIVIDUAL' : 'BUSINESS',
    }
  }
  
  if (dateFrom || dateTo) {
    where.issuedAt = {}
    if (dateFrom) {
      where.issuedAt.gte = dateFrom
    }
    if (dateTo) {
      where.issuedAt.lte = dateTo
    }
  }

  const certificates = await prisma.certificate.findMany({
    where,
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
          siret: true,
        },
      },
    },
    orderBy: { issuedAt: 'desc' },
    take: 100, // Limiter à 100 pour les performances
  })

  // Récupérer les TrustScores pour chaque certificat
  const certificatesWithTrustScore = await Promise.all(
    certificates.map(async (cert) => {
      const trustScore = await prisma.trustScore.findUnique({
        where: { entityId: cert.entity.id },
        select: { score: true, level: true },
      })
      return { ...cert, trustScore }
    })
  )

  const statusCounts = {
    PENDING: await prisma.certificate.count({ where: { status: 'PENDING' } }),
    ACTIVE: await prisma.certificate.count({ where: { status: 'ACTIVE' } }),
    SUSPENDED: await prisma.certificate.count({ where: { status: 'SUSPENDED' } }),
    REVOKED: await prisma.certificate.count({ where: { status: 'REVOKED' } }),
  }

  const getEntityName = (entity: any) => {
    if (entity.entityType === 'INDIVIDUAL') {
      return `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
    }
    return entity.legalName || entity.tradeName || entity.email
  }

  return (
    <div className="font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Demandes de certificats</h1>
        <p className="text-gray-400 text-sm">Gérez toutes les demandes de certificats</p>
      </div>

      {/* Filtres */}
      <div className="mb-6 space-y-4">
        {/* Filtres par statut */}
        <div className="flex gap-2 flex-wrap">
          <Link
            href="/admin/certificates"
            className={`px-4 py-2 rounded-lg transition ${
              !statusFilter
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Tous ({certificates.length})
          </Link>
        <Link
          href="/admin/certificates?status=PENDING"
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === 'PENDING'
              ? 'bg-yellow-500/20 text-yellow-400'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          En attente ({statusCounts.PENDING})
        </Link>
        <Link
          href="/admin/certificates?status=ACTIVE"
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === 'ACTIVE'
              ? 'bg-green-500/20 text-green-400'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Actifs ({statusCounts.ACTIVE})
        </Link>
        <Link
          href="/admin/certificates?status=SUSPENDED"
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === 'SUSPENDED'
              ? 'bg-orange-500/20 text-orange-400'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Suspendus ({statusCounts.SUSPENDED})
        </Link>
        <Link
          href="/admin/certificates?status=REVOKED"
          className={`px-4 py-2 rounded-lg transition ${
            statusFilter === 'REVOKED'
              ? 'bg-red-500/20 text-red-400'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
          }`}
        >
          Révoqués ({statusCounts.REVOKED})
        </Link>
        </div>

        {/* Filtres par type */}
        <div className="flex gap-2">
          <Link
            href="/admin/certificates?type=B2C"
            className={`px-4 py-2 rounded-lg transition ${
              typeFilter === 'B2C'
                ? 'bg-purple-500/20 text-purple-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            B2C (Particuliers)
          </Link>
          <Link
            href="/admin/certificates?type=B2B"
            className={`px-4 py-2 rounded-lg transition ${
              typeFilter === 'B2B'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            B2B (Entreprises)
          </Link>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">ID</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Entité</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Type</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Email</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Statut</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">TrustScore</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Date création</th>
              <th className="text-left text-gray-400 text-xs font-semibold uppercase tracking-wide px-6 py-4">Actions</th>
            </tr>
          </thead>
          <tbody>
            {certificatesWithTrustScore.map((cert) => (
              <tr key={cert.id} className="border-t border-gray-800 hover:bg-gray-800/30">
                <td className="px-6 py-4">
                  <code className="text-cyan-400 text-xs bg-cyan-500/10 px-2 py-1 rounded">
                    {cert.publicId || cert.id.slice(0, 8)}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <p className="text-white font-medium">{getEntityName(cert.entity)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    cert.entity.entityType === 'INDIVIDUAL'
                      ? 'bg-purple-500/20 text-purple-400'
                      : 'bg-blue-500/20 text-blue-400'
                  }`}>
                    {cert.entity.entityType === 'INDIVIDUAL' ? 'B2C' : 'B2B'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-gray-400 text-sm">{cert.entity.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold border ${
                      cert.status === 'PENDING'
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
                        : cert.status === 'ACTIVE'
                        ? 'bg-green-500/20 text-green-400 border-green-500/30'
                        : cert.status === 'SUSPENDED'
                        ? 'bg-orange-500/20 text-orange-400 border-orange-500/30'
                        : cert.status === 'REVOKED'
                        ? 'bg-red-500/20 text-red-400 border-red-500/30'
                        : 'bg-gray-500/20 text-gray-400 border-gray-500/30'
                    }`}
                  >
                    {cert.status === 'PENDING' && '🟡 '}
                    {cert.status === 'ACTIVE' && '🟢 '}
                    {cert.status === 'SUSPENDED' && '🟠 '}
                    {cert.status === 'REVOKED' && '🔴 '}
                    {cert.status}
                  </span>
                </td>
                <td className="px-6 py-4">
                  {cert.trustScore ? (
                    <div className="flex items-center gap-1">
                      <span className="font-bold text-cyan-400">{cert.trustScore.score}</span>
                      <span className="text-xs text-gray-500">/100</span>
                      <span className="text-xs text-gray-400">({cert.trustScore.level})</span>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm">—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-gray-400 text-sm">
                  {new Date(cert.issuedAt).toLocaleDateString('fr-FR', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 items-center flex-wrap">
                    <QuickActions certificateId={cert.id} currentStatus={cert.status} />
                    <Link
                      href={`/admin/certificates/${cert.id}`}
                      className="text-cyan-400 hover:text-cyan-300 text-xs"
                    >
                      Détails →
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
