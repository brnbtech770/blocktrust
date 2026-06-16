// app/admin/ai-alerts/page.tsx
// Alertes & Surveillance — fusion alertes IA + opérationnelles
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import AdminMergedAlertsClient, {
  type MergedAlertTab,
} from '@/app/admin/ai-alerts/AdminMergedAlertsClient'
import {
  entityDisplayNameFromEntity,
  formatCertificateLabel,
  formatUserLabel,
} from '@/lib/format-certificate-label'

type SearchParams = { tab?: string }

function parseTab(raw: string | undefined): MergedAlertTab {
  if (raw === 'FRAUD' || raw === 'SUSPICIOUS' || raw === 'SYSTEM' || raw === 'KYC') return raw
  return 'ALL'
}

function certificateIdFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null
  const cid = (metadata as Record<string, unknown>).certificateId
  return typeof cid === 'string' && cid.length > 0 ? cid : null
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

  const entityIds = [
    ...new Set(adminRows.map((a) => a.entityId).filter((id): id is string => Boolean(id))),
  ]
  const certIdsFromMeta = [
    ...new Set(
      adminRows
        .map((a) => certificateIdFromMetadata(a.metadata))
        .filter((id): id is string => Boolean(id)),
    ),
  ]
  const userIds = [
    ...new Set(adminRows.map((a) => a.userId).filter((id): id is string => Boolean(id))),
  ]

  const [entities, certs, users] = await Promise.all([
    entityIds.length
      ? prisma.entity.findMany({
          where: { id: { in: entityIds } },
          select: {
            id: true,
            entityType: true,
            firstName: true,
            lastName: true,
            legalName: true,
            tradeName: true,
            email: true,
          },
        })
      : Promise.resolve([]),
    certIdsFromMeta.length
      ? prisma.certificate.findMany({
          where: { id: { in: certIdsFromMeta } },
          select: {
            id: true,
            publicId: true,
            entity: {
              select: {
                entityType: true,
                firstName: true,
                lastName: true,
                legalName: true,
                tradeName: true,
                email: true,
              },
            },
          },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ])

  const entityMap = new Map(entities.map((e) => [e.id, e]))
  const certMap = new Map(certs.map((c) => [c.id, c]))
  const userMap = new Map(users.map((u) => [u.id, u]))

  const adminAlerts = adminRows.map((a) => {
    const entity = a.entityId ? entityMap.get(a.entityId) : undefined
    const certId = certificateIdFromMetadata(a.metadata)
    const cert = certId ? certMap.get(certId) : undefined
    const user = a.userId ? userMap.get(a.userId) : undefined

    const entityName = entity ? entityDisplayNameFromEntity(entity) : null
    const certificateLabel = cert
      ? formatCertificateLabel({
          id: cert.id,
          publicId: cert.publicId,
          entity: cert.entity,
        }).label
      : null
    const userLabel = user ? formatUserLabel(user) : null
    const contactLabel = certificateLabel ?? entityName ?? userLabel

    return {
      id: a.id,
      source: 'ADMIN' as const,
      type: a.type,
      title: a.title,
      description: a.description,
      read: a.read,
      createdAt: a.createdAt.toISOString(),
      entityId: a.entityId,
      userId: a.userId,
      entityName,
      certificateLabel,
      contactLabel,
    }
  })

  const aiAlerts = aiRows.map((a) => {
    const certLabel = a.certificate
      ? formatCertificateLabel({
          id: a.certificate.id,
          publicId: a.certificate.publicId,
          entity: a.entity,
        })
      : null
    return {
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
      entityName: entityDisplayNameFromEntity(a.entity) ?? '—',
      certificatePublicId: a.certificate?.publicId ?? null,
      certificateId: a.certificate?.id ?? null,
      certificateLabel: certLabel?.label ?? null,
      certificateFullCode: certLabel?.fullCode ?? null,
    }
  })

  return (
    <AdminMergedAlertsClient
      adminAlerts={adminAlerts}
      aiAlerts={aiAlerts}
      initialTab={initialTab}
    />
  )
}
