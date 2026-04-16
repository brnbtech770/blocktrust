// app/admin/alerts/page.tsx
// Alertes opérationnelles admin
// ============================================================

import { prisma } from '@/app/lib/db'
import AdminAlertsClient from '@/app/admin/alerts/AdminAlertsClient'

type SearchParams = { type?: string }

export default async function AdminOperationalAlertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const { type: typeParam } = await searchParams
  const typeFilter = typeParam && typeParam !== 'ALL' ? typeParam : 'ALL'

  const where =
    typeFilter === 'ALL'
      ? {}
      : {
          type: typeFilter,
        }

  const rows = await prisma.adminAlert.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
  })

  const initialAlerts = rows.map((a) => ({
    id: a.id,
    type: a.type,
    title: a.title,
    description: a.description,
    read: a.read,
    createdAt: a.createdAt.toISOString(),
    entityId: a.entityId,
    userId: a.userId,
    metadata: a.metadata,
  }))

  return <AdminAlertsClient initialAlerts={initialAlerts} initialType={typeFilter} />
}
