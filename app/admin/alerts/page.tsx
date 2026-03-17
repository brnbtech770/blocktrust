// app/admin/alerts/page.tsx
// Gestion des alertes IA anti-fraude
// ============================================================

import { prisma } from '@/app/lib/db'

type SearchParams = {
  status?: string
  severity?: string
  type?: string
}

export default async function AdminAlertsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const resolvedSearchParams = await searchParams
  const statusFilter = resolvedSearchParams.status as string | undefined
  const severityFilter = resolvedSearchParams.severity as string | undefined
  const typeFilter = resolvedSearchParams.type as string | undefined

  const where: any = {}
  
  if (statusFilter) {
    where.status = statusFilter
  }
  
  if (severityFilter) {
    where.severity = severityFilter
  }
  
  if (typeFilter) {
    where.alertType = typeFilter
  }

  const alerts = await prisma.aIAlert.findMany({
    where,
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
        select: {
          id: true,
          publicId: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
  })

  const statusCounts = {
    PENDING: await prisma.aIAlert.count({ where: { status: 'PENDING' } }),
    INVESTIGATING: await prisma.aIAlert.count({ where: { status: 'INVESTIGATING' } }),
    RESOLVED: await prisma.aIAlert.count({ where: { status: 'RESOLVED' } }),
    DISMISSED: await prisma.aIAlert.count({ where: { status: 'DISMISSED' } }),
    ESCALATED: await prisma.aIAlert.count({ where: { status: 'ESCALATED' } }),
  }

  const severityCounts = {
    LOW: await prisma.aIAlert.count({ where: { severity: 'LOW' } }),
    MEDIUM: await prisma.aIAlert.count({ where: { severity: 'MEDIUM' } }),
    HIGH: await prisma.aIAlert.count({ where: { severity: 'HIGH' } }),
    CRITICAL: await prisma.aIAlert.count({ where: { severity: 'CRITICAL' } }),
  }

  const getEntityName = (entity: any) => {
    if (!entity) return '—'
    if (entity.entityType === 'INDIVIDUAL') {
      return `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
    }
    return entity.legalName || entity.tradeName || entity.email
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL':
        return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/30'
      case 'MEDIUM':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
      case 'LOW':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500/20 text-yellow-400'
      case 'INVESTIGATING':
        return 'bg-blue-500/20 text-blue-400'
      case 'RESOLVED':
        return 'bg-green-500/20 text-green-400'
      case 'DISMISSED':
        return 'bg-gray-500/20 text-gray-400'
      case 'ESCALATED':
        return 'bg-red-500/20 text-red-400'
      default:
        return 'bg-gray-500/20 text-gray-400'
    }
  }

  return (
    <div className="font-sans">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white tracking-tight mb-2">Alertes IA</h1>
        <p className="text-gray-400 text-sm">Gestion des alertes anti-fraude détectées</p>
      </div>

      {/* Filtres */}
      <div className="mb-6 space-y-4">
        {/* Filtres par statut */}
        <div className="flex gap-2 flex-wrap">
          <a
            href="/admin/alerts"
            className={`px-4 py-2 rounded-lg transition ${
              !statusFilter
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Tous ({alerts.length})
          </a>
          <a
            href="/admin/alerts?status=PENDING"
            className={`px-4 py-2 rounded-lg transition ${
              statusFilter === 'PENDING'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            En attente ({statusCounts.PENDING})
          </a>
          <a
            href="/admin/alerts?status=INVESTIGATING"
            className={`px-4 py-2 rounded-lg transition ${
              statusFilter === 'INVESTIGATING'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            En investigation ({statusCounts.INVESTIGATING})
          </a>
          <a
            href="/admin/alerts?status=RESOLVED"
            className={`px-4 py-2 rounded-lg transition ${
              statusFilter === 'RESOLVED'
                ? 'bg-green-500/20 text-green-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Résolues ({statusCounts.RESOLVED})
          </a>
        </div>

        {/* Filtres par sévérité */}
        <div className="flex gap-2">
          <a
            href="/admin/alerts?severity=CRITICAL"
            className={`px-4 py-2 rounded-lg transition ${
              severityFilter === 'CRITICAL'
                ? 'bg-red-500/20 text-red-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🔴 Critique ({severityCounts.CRITICAL})
          </a>
          <a
            href="/admin/alerts?severity=HIGH"
            className={`px-4 py-2 rounded-lg transition ${
              severityFilter === 'HIGH'
                ? 'bg-orange-500/20 text-orange-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🟠 Élevée ({severityCounts.HIGH})
          </a>
          <a
            href="/admin/alerts?severity=MEDIUM"
            className={`px-4 py-2 rounded-lg transition ${
              severityFilter === 'MEDIUM'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🟡 Moyenne ({severityCounts.MEDIUM})
          </a>
          <a
            href="/admin/alerts?severity=LOW"
            className={`px-4 py-2 rounded-lg transition ${
              severityFilter === 'LOW'
                ? 'bg-blue-500/20 text-blue-400'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            🔵 Faible ({severityCounts.LOW})
          </a>
        </div>
      </div>

      {/* Liste des alertes */}
      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-6"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold border ${getSeverityColor(
                        alert.severity
                      )}`}
                    >
                      {alert.severity}
                    </span>
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-bold ${getStatusColor(
                        alert.status
                      )}`}
                    >
                      {alert.status}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {alert.alertType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{alert.title}</h3>
                  <p className="text-gray-400 text-sm mb-4">{alert.description}</p>
                </div>
                <span className="text-gray-500 text-xs">
                  {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-400 text-sm">Entité</p>
                  <p className="text-white">
                    {getEntityName(alert.entity)}
                  </p>
                </div>
                {alert.certificate && (
                  <div>
                    <p className="text-gray-400 text-sm">Certificat</p>
                    <a
                      href={`/admin/certificates/${alert.certificate.id}`}
                      className="text-cyan-400 hover:text-cyan-300 text-sm"
                    >
                      {alert.certificate.publicId || alert.certificate.id.slice(0, 8)} →
                    </a>
                  </div>
                )}
              </div>

              {alert.details && (
                <div className="bg-gray-800/50 rounded-lg p-4 mb-4">
                  <p className="text-gray-400 text-sm mb-2">Détails</p>
                  <pre className="text-white text-xs overflow-auto">
                    {JSON.stringify(alert.details, null, 2)}
                  </pre>
                </div>
              )}

              {alert.status === 'RESOLVED' && alert.resolution && (
                <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
                  <p className="text-green-400 text-sm font-medium mb-1">Résolution</p>
                  <p className="text-gray-300 text-sm">{alert.resolution}</p>
                  {alert.resolvedAt && (
                    <p className="text-gray-500 text-xs mt-2">
                      Résolu le {new Date(alert.resolvedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                {alert.status === 'PENDING' && (
                  <>
                    <button className="bg-blue-500/20 text-blue-400 px-4 py-2 rounded-lg hover:bg-blue-500/30 transition text-sm">
                      🔍 Investiguer
                    </button>
                    <button className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 transition text-sm">
                      ✅ Résoudre
                    </button>
                    <button className="bg-gray-500/20 text-gray-400 px-4 py-2 rounded-lg hover:bg-gray-500/30 transition text-sm">
                      ❌ Ignorer
                    </button>
                  </>
                )}
                {alert.status === 'INVESTIGATING' && (
                  <>
                    <button className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg hover:bg-green-500/30 transition text-sm">
                      ✅ Résoudre
                    </button>
                    <button className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg hover:bg-red-500/30 transition text-sm">
                      🚨 Escalader
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl border border-gray-700 p-12 text-center">
          <div className="text-6xl mb-4">✅</div>
          <h3 className="text-xl font-bold text-white mb-2">Aucune alerte</h3>
          <p className="text-gray-400">Toutes les alertes sont résolues ou il n'y a pas d'alerte en cours.</p>
        </div>
      )}
    </div>
  )
}
