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

  const getSeverityStyle = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)', borderColor: 'rgba(224,82,82,0.3)' }
      case 'HIGH': return { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)', borderColor: 'rgba(232,148,58,0.3)' }
      case 'MEDIUM': return { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)', borderColor: 'rgba(189,167,107,0.3)' }
      case 'LOW': return { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)', borderColor: 'rgba(0,212,255,0.3)' }
      default: return { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)', borderColor: 'var(--bt-border)' }
    }
  }

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'PENDING': return { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' }
      case 'INVESTIGATING': return { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }
      case 'RESOLVED': return { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }
      case 'DISMISSED': return { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }
      case 'ESCALATED': return { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' }
      default: return { background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }
    }
  }

  const filterCls = (active: boolean) => `px-4 py-2 rounded-lg transition ${active ? '' : 'hover:bg-[rgba(255,255,255,0.04)]'}`

  return (
    <div className="font-sans">
      <p className="mb-6 text-sm" style={{ color: 'var(--bt-muted)' }}>Gestion des alertes anti-fraude détectées</p>

      <div className="mb-6 space-y-4">
        <div className="flex gap-2 flex-wrap">
          <a href="/admin/alerts" className={filterCls(!statusFilter)} style={!statusFilter ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            Tous ({alerts.length})
          </a>
          <a href="/admin/alerts?status=PENDING" className={filterCls(statusFilter === 'PENDING')} style={statusFilter === 'PENDING' ? { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' } : { color: 'var(--bt-muted)' }}>
            En attente ({statusCounts.PENDING})
          </a>
          <a href="/admin/alerts?status=INVESTIGATING" className={filterCls(statusFilter === 'INVESTIGATING')} style={statusFilter === 'INVESTIGATING' ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            En investigation ({statusCounts.INVESTIGATING})
          </a>
          <a href="/admin/alerts?status=RESOLVED" className={filterCls(statusFilter === 'RESOLVED')} style={statusFilter === 'RESOLVED' ? { background: 'rgba(29,184,126,0.15)', color: '#1DB87E' } : { color: 'var(--bt-muted)' }}>
            Résolues ({statusCounts.RESOLVED})
          </a>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href="/admin/alerts?severity=CRITICAL" className={filterCls(severityFilter === 'CRITICAL')} style={severityFilter === 'CRITICAL' ? { background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' } : { color: 'var(--bt-muted)' }}>
            🔴 Critique ({severityCounts.CRITICAL})
          </a>
          <a href="/admin/alerts?severity=HIGH" className={filterCls(severityFilter === 'HIGH')} style={severityFilter === 'HIGH' ? { background: 'rgba(232,148,58,0.15)', color: 'var(--bt-warn)' } : { color: 'var(--bt-muted)' }}>
            🟠 Élevée ({severityCounts.HIGH})
          </a>
          <a href="/admin/alerts?severity=MEDIUM" className={filterCls(severityFilter === 'MEDIUM')} style={severityFilter === 'MEDIUM' ? { background: 'rgba(189,167,107,0.15)', color: 'var(--bt-gold)' } : { color: 'var(--bt-muted)' }}>
            🟡 Moyenne ({severityCounts.MEDIUM})
          </a>
          <a href="/admin/alerts?severity=LOW" className={filterCls(severityFilter === 'LOW')} style={severityFilter === 'LOW' ? { background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' } : { color: 'var(--bt-muted)' }}>
            🔵 Faible ({severityCounts.LOW})
          </a>
        </div>
      </div>

      {alerts.length > 0 ? (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div
              key={alert.id}
              className="rounded-xl border border-white/10 bg-white/5 p-6 transition-all hover:border-gold/30"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <span className="px-3 py-1 rounded-full text-xs font-bold border" style={getSeverityStyle(alert.severity)}>
                      {alert.severity}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-bold" style={getStatusStyle(alert.status)}>
                      {alert.status}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--bt-muted)' }}>
                      {alert.alertType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <h3 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">{alert.title}</h3>
                  <p className="text-sm mb-4" style={{ color: 'var(--bt-muted)' }}>{alert.description}</p>
                </div>
                <span className="text-xs" style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}>
                  {new Date(alert.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm mb-1" style={{ color: 'var(--bt-muted)' }}>Entité</p>
                  <p className="text-white">{getEntityName(alert.entity)}</p>
                </div>
                {alert.certificate && (
                  <div>
                    <p className="text-sm mb-1" style={{ color: 'var(--bt-muted)' }}>Certificat</p>
                    <a href={`/admin/certificates/${alert.certificate.id}`} className="text-sm hover:underline" style={{ color: 'var(--bt-cyan)' }}>
                      {alert.certificate.publicId || alert.certificate.id.slice(0, 8)} →
                    </a>
                  </div>
                )}
              </div>

              {alert.details && (
                <div className="rounded-lg p-4 mb-4" style={{ background: 'rgba(0,0,0,0.3)' }}>
                  <p className="text-sm mb-2" style={{ color: 'var(--bt-muted)' }}>Détails</p>
                  <pre className="text-white text-xs overflow-auto" style={{ fontFamily: 'var(--font-mono-bt), monospace' }}>
                    {JSON.stringify(alert.details, null, 2)}
                  </pre>
                </div>
              )}

              {alert.status === 'RESOLVED' && alert.resolution && (
                <div className="rounded-lg p-4 mb-4 border" style={{ background: 'rgba(29,184,126,0.08)', borderColor: 'rgba(29,184,126,0.3)' }}>
                  <p className="text-sm font-medium mb-1" style={{ color: '#1DB87E' }}>Résolution</p>
                  <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>{alert.resolution}</p>
                  {alert.resolvedAt && (
                    <p className="text-xs mt-2" style={{ color: 'var(--bt-muted)' }}>
                      Résolu le {new Date(alert.resolvedAt).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>
              )}

              <div className="flex gap-2">
                {alert.status === 'PENDING' && (
                  <>
                    <button className="px-4 py-2 rounded-lg text-sm transition" style={{ background: 'rgba(0,212,255,0.1)', color: 'var(--bt-cyan)' }}>
                      🔍 Investiguer
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm transition" style={{ background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }}>
                      ✅ Résoudre
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm transition" style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }}>
                      ❌ Ignorer
                    </button>
                  </>
                )}
                {alert.status === 'INVESTIGATING' && (
                  <>
                    <button className="px-4 py-2 rounded-lg text-sm transition" style={{ background: 'rgba(29,184,126,0.15)', color: '#1DB87E' }}>
                      ✅ Résoudre
                    </button>
                    <button className="px-4 py-2 rounded-lg text-sm transition" style={{ background: 'rgba(224,82,82,0.15)', color: 'var(--bt-danger)' }}>
                      🚨 Escalader
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center transition-all hover:border-gold/30">
          <div className="mb-4 text-6xl">✅</div>
          <h3 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">Aucune alerte</h3>
          <p style={{ color: 'var(--bt-muted)' }}>Toutes les alertes sont résolues ou il n'y a pas d'alerte en cours.</p>
        </div>
      )}
    </div>
  )
}
