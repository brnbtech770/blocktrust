// app/admin/certificates/page.tsx
// Liste de toutes les demandes de certificats
// ============================================================

import { prisma } from '@/app/lib/db'
import type { Prisma, CertificateStatus } from '@prisma/client'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import Link from 'next/link'
import QuickActions from '@/app/components/admin/QuickActions'
import StatusBadge from '@/app/components/admin/StatusBadge'
import TypeBadge from '@/app/components/admin/TypeBadge'
import TrustScoreCell from '@/app/components/admin/TrustScoreCell'
import IdCell from '@/app/components/admin/IdCell'
import BlockchainCell from '@/app/components/admin/BlockchainCell'
import { DetailsLink } from '@/app/components/admin/ActionButton'
import ExportCertificatesCsvButton from '@/app/admin/certificates/ExportCertificatesCsvButton'
import CertificatesPagination, {
  PAGE_SIZE,
} from '@/app/admin/certificates/CertificatesPagination'

type SearchParams = {
  status?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  page?: string
}

function TH({ children }: { children: React.ReactNode }) {
  return (
    <th className="border-b border-white/5 px-6 pb-3 pt-4 text-left font-sans text-[10px] font-medium uppercase tracking-widest text-white/40">
      {children}
    </th>
  )
}

function buildWhere(resolvedSearchParams: SearchParams): Prisma.CertificateWhereInput {
  const statusFilter = resolvedSearchParams.status as string | undefined
  const typeFilter = resolvedSearchParams.type as string | undefined
  const dateFrom = resolvedSearchParams.dateFrom ? new Date(resolvedSearchParams.dateFrom) : null
  const dateTo = resolvedSearchParams.dateTo ? new Date(resolvedSearchParams.dateTo) : null

  const where: Prisma.CertificateWhereInput = {}

  if (statusFilter) {
    where.status = statusFilter as CertificateStatus
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

  return where
}

export default async function AdminCertificatesPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminPage()

  const resolvedSearchParams = await searchParams
  const where = buildWhere(resolvedSearchParams)
  const page = Math.max(1, Number.parseInt(resolvedSearchParams.page ?? '1', 10) || 1)

  const [totalCount, certificates, exportCertificates] = await Promise.all([
    prisma.certificate.count({ where }),
    prisma.certificate.findMany({
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
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      take: PAGE_SIZE,
      skip: (page - 1) * PAGE_SIZE,
    }),
    prisma.certificate.findMany({
      where,
      select: {
        id: true,
        publicId: true,
        status: true,
        blockchainStatus: true,
        issuedAt: true,
        polygonTxHash: true,
        entity: {
          select: {
            email: true,
            user: { select: { email: true } },
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
      take: 5000,
    }),
  ])

  const certificatesWithTrustScore = await Promise.all(
    certificates.map(async (cert) => {
      const trustScore = await prisma.trustScore.findUnique({
        where: { entityId: cert.entity.id },
        select: { score: true, level: true },
      })
      return { ...cert, trustScore }
    }),
  )

  const statusCounts = {
    PENDING: await prisma.certificate.count({ where: { status: 'PENDING' } }),
    ACTIVE: await prisma.certificate.count({ where: { status: 'ACTIVE' } }),
    SUSPENDED: await prisma.certificate.count({ where: { status: 'SUSPENDED' } }),
    REVOKED: await prisma.certificate.count({ where: { status: 'REVOKED' } }),
  }

  type EntitySummary = (typeof certificates)[number]['entity']

  const getEntityName = (entity: EntitySummary) => {
    if (entity.entityType === 'INDIVIDUAL') {
      return `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
    }
    return entity.legalName || entity.tradeName || entity.email
  }

  const filterCls = (active: boolean) =>
    `px-4 py-2 rounded-lg transition ${active ? '' : 'hover:bg-[rgba(255,255,255,0.04)]'}`

  const csvRows = exportCertificates.map((c) => ({
    id: c.id,
    publicId: c.publicId,
    entityEmail: c.entity.email,
    userEmail: c.entity.user?.email ?? null,
    status: c.status,
    blockchainStatus: c.blockchainStatus,
    issuedAt: new Date(c.issuedAt).toISOString(),
    txHash: c.polygonTxHash,
  }))

  return (
    <div className="font-sans">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
          Gérez toutes les demandes de certificats
        </p>
        <ExportCertificatesCsvButton rows={csvRows} />
      </div>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <Link href="/admin/certificates" className={filterCls(!resolvedSearchParams.status)} style={!resolvedSearchParams.status ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            Tous ({totalCount})
          </Link>
          <Link href="/admin/certificates?status=PENDING" className={filterCls(resolvedSearchParams.status === 'PENDING')} style={resolvedSearchParams.status === 'PENDING' ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' } : { color: 'var(--bt-muted)' }}>
            En attente ({statusCounts.PENDING})
          </Link>
          <Link href="/admin/certificates?status=ACTIVE" className={filterCls(resolvedSearchParams.status === 'ACTIVE')} style={resolvedSearchParams.status === 'ACTIVE' ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            Actifs ({statusCounts.ACTIVE})
          </Link>
          <Link href="/admin/certificates?status=SUSPENDED" className={filterCls(resolvedSearchParams.status === 'SUSPENDED')} style={resolvedSearchParams.status === 'SUSPENDED' ? { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' } : { color: 'var(--bt-muted)' }}>
            Suspendus ({statusCounts.SUSPENDED})
          </Link>
          <Link href="/admin/certificates?status=REVOKED" className={filterCls(resolvedSearchParams.status === 'REVOKED')} style={resolvedSearchParams.status === 'REVOKED' ? { background: 'rgba(239,68,68,0.15)', color: '#f87171' } : { color: 'var(--bt-muted)' }}>
            Révoqués ({statusCounts.REVOKED})
          </Link>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/certificates?type=B2C" className={filterCls(resolvedSearchParams.type === 'B2C')} style={resolvedSearchParams.type === 'B2C' ? { background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.6)' } : { color: 'var(--bt-muted)' }}>
            B2C (Particuliers)
          </Link>
          <Link href="/admin/certificates?type=B2B" className={filterCls(resolvedSearchParams.type === 'B2B')} style={resolvedSearchParams.type === 'B2B' ? { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' } : { color: 'var(--bt-muted)' }}>
            B2B (Entreprises)
          </Link>
        </div>
      </div>

      <div className="w-full overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[900px]">
          <thead>
            <tr>
              <TH>ID</TH>
              <TH>Entité</TH>
              <TH>Type</TH>
              <TH>Compte</TH>
              <TH>Statut</TH>
              <TH>TrustScore</TH>
              <TH>Blockchain</TH>
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
                  <p
                    className="block max-w-[180px] truncate text-sm text-white"
                    title={cert.entity.email}
                  >
                    {cert.entity.email}
                  </p>
                  {cert.entity.user?.email ? (
                    <p
                      className="mt-0.5 block max-w-[180px] truncate text-xs text-white/40"
                      title={cert.entity.user.email}
                    >
                      {cert.entity.user.email}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-xs text-white/25">—</p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={cert.status} type="certificate" />
                </td>
                <td className="px-6 py-4">
                  <TrustScoreCell score={cert.trustScore?.score ?? null} />
                </td>
                <td className="px-6 py-4">
                  <div className="max-w-[100px]">
                    <BlockchainCell
                      status={cert.blockchainStatus as 'PENDING' | 'ANCHORED' | 'FAILED' | null}
                      explorerUrl={cert.polygonExplorerUrl}
                      blockNumber={cert.polygonBlock}
                      certificateId={cert.id}
                      certStatus={cert.status}
                    />
                  </div>
                </td>
                <td
                  className="px-6 py-4 text-sm"
                  style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}
                >
                  {new Date(cert.issuedAt).toLocaleDateString('fr-FR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: '2-digit',
                  })}
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <QuickActions
                      certificateId={cert.id}
                      currentStatus={cert.status}
                      blockchainStatus={cert.blockchainStatus}
                    />
                    <DetailsLink href={`/admin/certificates/${cert.id}`} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CertificatesPagination
        page={page}
        total={totalCount}
        searchParams={{
          status: resolvedSearchParams.status,
          type: resolvedSearchParams.type,
          dateFrom: resolvedSearchParams.dateFrom,
          dateTo: resolvedSearchParams.dateTo,
        }}
      />
    </div>
  )
}
