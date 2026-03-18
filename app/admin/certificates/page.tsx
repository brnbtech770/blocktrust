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

  const filterCls = (active: boolean) =>
    `px-4 py-2 rounded-lg transition ${active ? '' : 'hover:bg-[rgba(255,255,255,0.04)]'}`

  return (
    <div className="font-sans">
      <p className="mb-6 text-sm" style={{ color: 'var(--bt-muted)' }}>Gérez toutes les demandes de certificats</p>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/certificates" className={filterCls(!statusFilter)} style={!statusFilter ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            Tous ({certificates.length})
          </Link>
          <Link href="/admin/certificates?status=PENDING" className={filterCls(statusFilter === 'PENDING')} style={statusFilter === 'PENDING' ? { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' } : { color: 'var(--bt-muted)' }}>
            En attente ({statusCounts.PENDING})
          </Link>
          <Link href="/admin/certificates?status=ACTIVE" className={filterCls(statusFilter === 'ACTIVE')} style={statusFilter === 'ACTIVE' ? { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' } : { color: 'var(--bt-muted)' }}>
            Actifs ({statusCounts.ACTIVE})
          </Link>
          <Link href="/admin/certificates?status=SUSPENDED" className={filterCls(statusFilter === 'SUSPENDED')} style={statusFilter === 'SUSPENDED' ? { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)' } : { color: 'var(--bt-muted)' }}>
            Suspendus ({statusCounts.SUSPENDED})
          </Link>
          <Link href="/admin/certificates?status=REVOKED" className={filterCls(statusFilter === 'REVOKED')} style={statusFilter === 'REVOKED' ? { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' } : { color: 'var(--bt-muted)' }}>
            Révoqués ({statusCounts.REVOKED})
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/certificates?type=B2C" className={filterCls(typeFilter === 'B2C')} style={typeFilter === 'B2C' ? { background: 'rgba(189,167,107,0.12)', color: 'var(--bt-gold)' } : { color: 'var(--bt-muted)' }}>
            B2C (Particuliers)
          </Link>
          <Link href="/admin/certificates?type=B2B" className={filterCls(typeFilter === 'B2B')} style={typeFilter === 'B2B' ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            B2B (Entreprises)
          </Link>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}>
        <table className="w-full">
          <thead>
            <tr style={{ background: 'rgba(0,0,0,0.3)', borderBottom: '1px solid var(--bt-border)' }}>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>ID</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Entité</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Type</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Email</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Statut</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>TrustScore</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Date création</th>
              <th className="text-left text-[10px] font-medium uppercase tracking-wider px-6 py-4" style={{ fontFamily: 'var(--font-mono-bt), monospace', color: 'var(--bt-muted)' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {certificatesWithTrustScore.map((cert) => (
              <tr key={cert.id} className="transition-colors hover:bg-[rgba(0,212,255,0.04)]" style={{ borderTop: '1px solid var(--bt-border)' }}>
                <td className="px-6 py-4">
                  <code className="text-xs px-2 py-1 rounded" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}>
                    {cert.publicId || cert.id.slice(0, 8)}
                  </code>
                </td>
                <td className="px-6 py-4">
                  <p className="text-white font-medium">{getEntityName(cert.entity)}</p>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2 py-1 rounded text-xs font-medium" style={cert.entity.entityType === 'INDIVIDUAL' ? { background: 'var(--bt-gold-dim)', color: 'var(--bt-gold)' } : { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}>
                    {cert.entity.entityType === 'INDIVIDUAL' ? 'B2C' : 'B2B'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>{cert.entity.email}</p>
                </td>
                <td className="px-6 py-4">
                  <span
                    className="px-3 py-1 rounded-full text-xs font-bold border"
                    style={
                      cert.status === 'PENDING'
                        ? { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)', borderColor: 'rgba(189,167,107,0.3)' }
                        : cert.status === 'ACTIVE'
                        ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)', borderColor: 'rgba(0,212,255,0.3)' }
                        : cert.status === 'SUSPENDED'
                        ? { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)', borderColor: 'rgba(232,148,58,0.3)' }
                        : cert.status === 'REVOKED'
                        ? { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)', borderColor: 'rgba(224,82,82,0.3)' }
                        : { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)', borderColor: 'var(--bt-border)' }
                    }
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
                      <span className="font-bold" style={{ color: 'var(--bt-cyan)' }}>{cert.trustScore.score}</span>
                      <span className="text-xs" style={{ color: 'var(--bt-muted)' }}>/100 ({cert.trustScore.level})</span>
                    </div>
                  ) : (
                    <span className="text-sm" style={{ color: 'var(--bt-muted)' }}>—</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}>
                  {new Date(cert.issuedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2 items-center flex-wrap">
                    <QuickActions certificateId={cert.id} currentStatus={cert.status} />
                    <Link href={`/admin/certificates/${cert.id}`} className="text-xs hover:underline" style={{ color: 'var(--bt-cyan)' }}>
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
