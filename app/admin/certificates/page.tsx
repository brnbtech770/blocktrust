// app/admin/certificates/page.tsx
// Liste de toutes les demandes de certificats
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import Link from 'next/link'
import QuickActions from '@/app/components/admin/QuickActions'
import StatusBadge from '@/app/components/admin/StatusBadge'
import TypeBadge from '@/app/components/admin/TypeBadge'
import TrustScoreCell from '@/app/components/admin/TrustScoreCell'
import IdCell from '@/app/components/admin/IdCell'
import { DetailsLink } from '@/app/components/admin/ActionButton'

type SearchParams = {
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
      {children}
    </th>
  )
}

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminPage()

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
          <Link href="/admin/certificates?status=PENDING" className={filterCls(statusFilter === 'PENDING')} style={statusFilter === 'PENDING' ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' } : { color: 'var(--bt-muted)' }}>
            En attente ({statusCounts.PENDING})
          </Link>
          <Link href="/admin/certificates?status=ACTIVE" className={filterCls(statusFilter === 'ACTIVE')} style={statusFilter === 'ACTIVE' ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            Actifs ({statusCounts.ACTIVE})
          </Link>
          <Link href="/admin/certificates?status=SUSPENDED" className={filterCls(statusFilter === 'SUSPENDED')} style={statusFilter === 'SUSPENDED' ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' } : { color: 'var(--bt-muted)' }}>
            Suspendus ({statusCounts.SUSPENDED})
          </Link>
          <Link href="/admin/certificates?status=REVOKED" className={filterCls(statusFilter === 'REVOKED')} style={statusFilter === 'REVOKED' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : { color: 'var(--bt-muted)' }}>
            Révoqués ({statusCounts.REVOKED})
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/certificates?type=B2C" className={filterCls(typeFilter === 'B2C')} style={typeFilter === 'B2C' ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' } : { color: 'var(--bt-muted)' }}>
            B2C (Particuliers)
          </Link>
          <Link href="/admin/certificates?type=B2B" className={filterCls(typeFilter === 'B2B')} style={typeFilter === 'B2B' ? { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' } : { color: 'var(--bt-muted)' }}>
            B2B (Entreprises)
          </Link>
        </div>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(13,31,60,0.5)', borderColor: 'var(--bt-border)' }}>
        <table className="w-full">
          <thead>
            <tr>
              <TH>ID</TH>
              <TH>Entité</TH>
              <TH>Type</TH>
              <TH>Email</TH>
              <TH>Statut</TH>
              <TH>TrustScore</TH>
              <TH>Date création</TH>
              <TH>Actions</TH>
            </tr>
          </thead>
          <tbody>
            {certificatesWithTrustScore.map((cert) => (
              <tr
                key={cert.id}
                className="border-b border-white/5 transition-all hover:bg-white/[0.02]"
              >
                <td className="px-6 py-4">
                  <IdCell id={cert.id} display={cert.publicId ?? cert.id.slice(0, 8)} />
                </td>
                <td className="px-6 py-4">
                  <p className="text-white font-medium">{getEntityName(cert.entity)}</p>
                </td>
                <td className="px-6 py-4">
                  <TypeBadge variant={cert.entity.entityType === 'INDIVIDUAL' ? 'B2C' : 'B2B'} />
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>{cert.entity.email}</p>
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={cert.status} type="certificate" />
                </td>
                <td className="px-6 py-4">
                  <TrustScoreCell
                    score={cert.trustScore?.score ?? null}
                    level={cert.trustScore?.level ?? null}
                  />
                </td>
                <td className="px-6 py-4 text-sm" style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}>
                  {new Date(cert.issuedAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <QuickActions certificateId={cert.id} currentStatus={cert.status} />
                    <DetailsLink href={`/admin/certificates/${cert.id}`} />
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
