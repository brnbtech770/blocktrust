// app/admin/logs/page.tsx
// Journal des actions admin récentes
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import { Activity } from 'lucide-react'

const LOG_TYPES = [
  'KYC_SUBMITTED',
  'KYC_APPROVED',
  'KYC_REJECTED',
  'CERT_REVOKED',
  'NEW_PAYMENT',
  'CERT_ANCHORED',
  'FRAUD_ALERT',
  'SECURITY',
] as const

function formatAlertType(type: string): string {
  const map: Record<string, string> = {
    KYC_SUBMITTED: 'KYC soumis',
    KYC_APPROVED: 'KYC approuvé',
    KYC_REJECTED: 'KYC rejeté',
    CERT_REVOKED: 'Certificat révoqué',
    NEW_PAYMENT: 'Plan / paiement',
    CERT_ANCHORED: 'Certificat ancré',
    FRAUD_ALERT: 'Alerte fraude',
    SECURITY: 'Sécurité',
  }
  return map[type] ?? type
}

export default async function AdminLogsPage() {
  await requireAdminPage()

  const [alerts, auditRows] = await Promise.all([
    prisma.adminAlert.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { id: true, email: true, name: true } },
      },
    }),
    prisma.auditLog.findMany({
      where: {
        OR: [
          { action: { startsWith: 'ADMIN_' } },
          { action: { in: ['FRAUD_AGENT_ALERT', 'AUTH_SIGNIN_FAILED'] } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    }),
  ])

  return (
    <div className="font-sans">
      <div className="mb-6 flex items-center gap-2">
        <Activity className="h-6 w-6 text-bt-cyan/90" aria-hidden />
        <h1 className="font-syne text-2xl font-bold text-white">Logs d&apos;activité</h1>
      </div>
      <p className="mb-6 text-sm" style={{ color: 'var(--bt-muted)' }}>
        Dernières actions admin : KYC, révocations, plans, alertes traitées et événements
        système.
      </p>

      <div className="mb-8">
        <h2 className="mb-3 font-syne text-sm font-semibold uppercase tracking-wider text-white/50">
          Alertes & actions ({alerts.length})
        </h2>
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Titre</th>
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Statut</th>
              </tr>
            </thead>
            <tbody>
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-white/40">
                    Aucune activité enregistrée.
                  </td>
                </tr>
              ) : (
                alerts.map((a) => (
                  <tr key={a.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                    <td className="px-4 py-3 font-mono text-xs text-white/55">
                      {new Date(a.createdAt).toLocaleString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-white/5 px-2 py-0.5 font-mono text-xs text-bt-cyan">
                        {formatAlertType(a.type)}
                      </span>
                    </td>
                    <td className="max-w-xs px-4 py-3 text-white">{a.title}</td>
                    <td className="px-4 py-3 text-white/60">
                      {a.user?.email ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      {a.read ? (
                        <span className="text-xs text-emerald-400/90">Traitée</span>
                      ) : (
                        <span className="text-xs text-amber-400/90">Non lue</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {auditRows.length > 0 && (
        <div>
          <h2 className="mb-3 font-syne text-sm font-semibold uppercase tracking-wider text-white/50">
            Audit système ({auditRows.length})
          </h2>
          <ul className="space-y-2">
            {auditRows.map((row) => (
              <li
                key={row.id}
                className="rounded-lg border border-white/10 bg-white/[0.03] px-4 py-3 text-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-xs text-bt-cyan">{row.action}</span>
                  <span className="font-mono text-xs text-white/40">
                    {new Date(row.createdAt).toLocaleString('fr-FR')}
                  </span>
                </div>
                {row.resourceId ? (
                  <p className="mt-1 text-xs text-white/50">Ressource : {row.resourceId}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-6 text-xs text-white/35">
        Types suivis : {LOG_TYPES.join(', ')}
      </p>
    </div>
  )
}
