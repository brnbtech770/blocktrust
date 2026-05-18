// app/admin/ai-alerts/page.tsx
// Alertes & Surveillance — fusion alertes IA + opérationnelles
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import AdminMergedAlertsClient, {
  type MergedAlertTab,
} from '@/app/admin/ai-alerts/AdminMergedAlertsClient'

type SearchParams = { tab?: string }

function parseTab(raw: string | undefined): MergedAlertTab {
  if (raw === 'FRAUD' || raw === 'SUSPICIOUS' || raw === 'SYSTEM' || raw === 'KYC') return raw
  return 'ALL'
}

function getEntityName(entity: {
  entityType: string
  firstName: string | null
  lastName: string | null
  legalName: string | null
  tradeName: string | null
  email: string
} | null): string {
  if (!entity) return '—'
  if (entity.entityType === 'INDIVIDUAL') {
    return `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
  }
  return entity.legalName || entity.tradeName || entity.email
}

export default async function AdminAiAlertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  await requireAdminPage()

  const { tab: tabRaw } = await searchParams
  const initialTab = parseTab(tabRaw)

  const [adminRows, aiRows] = await Promise.all([
    prisma.adminAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 200,
    }),
    prisma.aIAlert.findMany({
      include: {
        entity: {
          select: {
            id: true,
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            email: true,
            entityType: true,
          },
        },
        certificate: {
          select: { id: true, publicId: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    }),
  ])

  const adminAlerts = adminRows.map((a) => ({
    id: a.id,
    source: 'ADMIN' as const,
    type: a.type,
    title: a.title,
    description: a.description,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
    entityId: a.entityId,
    userId: a.userId,
  }))

  const aiAlerts = aiRows.map((a) => ({
    id: a.id,
    source: 'AI' as const,
    alertType: a.alertType,
    severity: a.severity,
    status: a.status,
    title: a.title,
    description: a.description,
    details: a.details,
    resolution: a.resolution,
    resolvedAt: a.resolvedAt?.toISOString() ?? null,
    createdAt: a.createdAt.toISOString(),
    entityName: getEntityName(a.entity),
    certificatePublicId: a.certificate?.publicId ?? null,
    certificateId: a.certificate?.id ?? null,
  }))

  return (
    <AdminMergedAlertsClient
      adminAlerts={adminAlerts}
      aiAlerts={aiAlerts}
      initialTab={initialTab}
    />
  )
}
