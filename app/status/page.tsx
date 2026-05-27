import Link from 'next/link'
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  CircleDashed,
  Clock,
  Server,
  XCircle,
} from 'lucide-react'
import { getOpsHealth, type CronHealth, type ServiceHealth, type ServiceStatus } from '@/lib/ops-health'

export const dynamic = 'force-dynamic'

function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'ok':
      return 'Opérationnel'
    case 'degraded':
      return 'Dégradé'
    case 'down':
      return 'Indisponible'
    case 'unconfigured':
      return 'Non configuré'
  }
}

function StatusIcon({ status }: { status: ServiceStatus }) {
  if (status === 'ok') {
    return <CheckCircle2 className="h-5 w-5 text-[#10b981]" aria-hidden />
  }
  if (status === 'degraded' || status === 'down') {
    return <XCircle className="h-5 w-5 text-[#E05252]" aria-hidden />
  }
  return <CircleDashed className="h-5 w-5 text-white/40" aria-hidden />
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div className="rounded-xl border border-white/10 bg-[#0d1f3c] p-5">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="font-syne text-lg font-semibold text-white">{service.name}</h3>
        <StatusIcon status={service.status} />
      </div>
      <p className="text-sm text-white/70">{statusLabel(service.status)}</p>
      {service.latencyMs !== null && (
        <p className="mt-1 font-mono text-xs text-[#00d4ff]">{service.latencyMs} ms</p>
      )}
      {service.detail && (
        <p className="mt-2 text-xs text-white/50">{service.detail}</p>
      )}
    </div>
  )
}

function formatLastRun(cron: CronHealth): string {
  if (!cron.lastRunAt) return 'Jamais'
  const date = new Date(cron.lastRunAt)
  return date.toLocaleString('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'medium',
  })
}

function CronRow({ cron }: { cron: CronHealth }) {
  const staleCritical =
    (cron.id === 'fraud-surveillance' || cron.id === 'anomaly-detector') &&
    (cron.minutesSinceLastRun === null || cron.minutesSinceLastRun > 10)

  return (
    <tr className="border-b border-white/5 last:border-0">
      <td className="px-4 py-3 pr-4 text-sm text-white">{cron.label}</td>
      <td className="px-4 py-3 pr-4 font-mono text-xs text-white/70">{formatLastRun(cron)}</td>
      <td className="px-4 py-3 pr-4 font-mono text-xs text-white/50">
        {cron.minutesSinceLastRun !== null ? `${cron.minutesSinceLastRun} min` : '—'}
      </td>
      <td className="px-4 py-3">
        {staleCritical || (cron.stale && cron.id === 'subscription-monitor') ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#E05252]/15 px-2.5 py-0.5 text-xs text-[#E05252]">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
            Inactif
          </span>
        ) : cron.lastRunAt ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#10b981]/15 px-2.5 py-0.5 text-xs text-[#10b981]">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            OK
          </span>
        ) : (
          <span className="text-xs text-white/40">En attente</span>
        )}
      </td>
    </tr>
  )
}

export default async function StatusPage() {
  const health = await getOpsHealth()

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <div className="mx-auto max-w-5xl px-4 py-12">
        <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="mb-2 font-mono text-xs uppercase tracking-widest text-[#00d4ff]">
              BLOCKTRUST™
            </p>
            <h1 className="font-syne flex items-center gap-3 text-3xl font-bold">
              <Activity className="h-8 w-8 text-[#00d4ff]" aria-hidden />
              Statut des services
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Dernière vérification :{' '}
              {new Date(health.checkedAt).toLocaleString('fr-FR', {
                dateStyle: 'full',
                timeStyle: 'medium',
              })}
            </p>
          </div>
          <div
            className={`rounded-xl border px-4 py-3 ${
              health.ok
                ? 'border-[#10b981]/30 bg-[#10b981]/10'
                : 'border-[#E05252]/30 bg-[#E05252]/10'
            }`}
          >
            <p className="font-syne text-lg font-semibold">
              {health.ok ? 'Tous les systèmes opérationnels' : 'Incident en cours'}
            </p>
            {health.vercelGitCommitSha && (
              <p className="mt-1 font-mono text-xs text-white/50">
                build {health.vercelGitCommitSha.slice(0, 7)}
              </p>
            )}
          </div>
        </div>

        {health.alerts.length > 0 && (
          <div className="mb-8 rounded-xl border border-[#E05252]/30 bg-[#E05252]/10 p-4">
            <h2 className="mb-2 flex items-center gap-2 font-syne text-sm font-semibold text-[#E05252]">
              <AlertTriangle className="h-4 w-4" aria-hidden />
              Alertes
            </h2>
            <ul className="space-y-1 text-sm text-white/80">
              {health.alerts.map((alert) => (
                <li key={alert}>• {alert}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="mb-10">
          <h2 className="font-syne mb-4 flex items-center gap-2 text-xl font-semibold">
            <Server className="h-5 w-5 text-[#00d4ff]" aria-hidden />
            Services
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ServiceCard service={health.services.database} />
            <ServiceCard service={health.services.qstash} />
            <ServiceCard service={health.services.stripe} />
            <ServiceCard service={health.services.resend} />
            <ServiceCard service={health.services.polygon} />
          </div>
        </section>

        <section className="mb-10">
          <h2 className="font-syne mb-4 flex items-center gap-2 text-xl font-semibold">
            <Clock className="h-5 w-5 text-[#00d4ff]" aria-hidden />
            Crons &amp; agents
          </h2>
          <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1f3c]">
            <table className="w-full min-w-[640px] px-4 text-left">
              <thead>
                <tr className="border-b border-white/10 text-xs uppercase tracking-wide text-white/50">
                  <th className="px-4 py-3 font-medium">Agent</th>
                  <th className="px-4 py-3 font-medium">Dernière exécution</th>
                  <th className="px-4 py-3 font-medium">Il y a</th>
                  <th className="px-4 py-3 font-medium">État</th>
                </tr>
              </thead>
              <tbody>
                {health.crons.map((cron) => (
                  <CronRow key={cron.id} cron={cron} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Surveillance QStash : alerte si inactivité &gt; 10 min. Abonnements : seuil 70 min
            (cron horaire).
          </p>
        </section>

        <p className="text-sm text-white/50">
          <Link href="/" className="text-[#00d4ff] hover:underline">
            ← Retour à l&apos;accueil
          </Link>
          {' · '}
          <Link href="/api/health" className="text-[#00d4ff] hover:underline">
            API health (JSON)
          </Link>
        </p>
      </div>
    </div>
  )
}
