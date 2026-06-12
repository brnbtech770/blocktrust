'use client'

// app/admin/clients/AdminClientsTable.tsx
// Liste clients avec actions rapides (badge, plan, email, détail)
// ============================================================

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { CheckCircle2, Clock, XCircle, Eye, CreditCard, Mail, ExternalLink } from 'lucide-react'
import BlockTrustBadge from '@/app/components/ui/BlockTrustBadge'
import { VALID_PLAN_CODES, type AdminPlanCode } from '@/lib/admin-update-user-plan'
import { getPlanDisplayLabel } from '@/lib/plan-features'

export type AdminClientRow = {
  id: string
  name: string
  email: string
  image: string | null
  initials: string
  badgeLabel: string
  badgeClassName: string
  anchorLabel: string
  anchorClassName: string
  anchorIcon: 'check' | 'clock' | 'x'
  planCode: string
  billingLabel: string
  periodLabel: string
  kycText: string
  kycClassName: string
  trustScore: number
  createdAtLabel: string
}

const PLAN_OPTIONS = [...VALID_PLAN_CODES]

function AnchorIcon({ kind }: { kind: AdminClientRow['anchorIcon'] }) {
  if (kind === 'check') return <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
  if (kind === 'clock') return <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
  return <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
}

export default function AdminClientsTable({ rows }: { rows: AdminClientRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [badgeUserId, setBadgeUserId] = useState<string | null>(null)
  const [planUser, setPlanUser] = useState<{ id: string; planCode: string } | null>(null)
  const [selectedPlan, setSelectedPlan] = useState<AdminPlanCode>('ESSENTIEL')
  const [planError, setPlanError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  async function updatePlan() {
    if (!planUser) return
    setPlanError(null)
    const res = await fetch(`/api/admin/users/${planUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan: selectedPlan }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setPlanError(typeof data.error === 'string' ? data.error : 'Mise à jour impossible')
      return
    }
    setPlanUser(null)
    setToast('Plan mis à jour.')
    startTransition(() => router.refresh())
    window.setTimeout(() => setToast(null), 4000)
  }

  return (
    <>
      {toast && (
        <div
          className="mb-4 rounded-lg border px-4 py-3 text-sm"
          style={{
            background: 'rgba(29,184,126,0.12)',
            borderColor: 'rgba(29,184,126,0.35)',
            color: '#1DB87E',
          }}
          role="status"
        >
          {toast}
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-white/10 bg-[#0d1f3c]/80">
        <table className="min-w-[1180px] w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-[10px] uppercase tracking-widest text-white/45">
              <th className="sticky left-0 z-10 bg-[#0d1f3c] px-4 py-3 font-semibold">User</th>
              <th className="px-4 py-3 font-semibold">Badge</th>
              <th className="px-4 py-3 font-semibold">Ancrage</th>
              <th className="px-4 py-3 font-semibold">Plan</th>
              <th className="px-4 py-3 font-semibold">Facturation</th>
              <th className="px-4 py-3 font-semibold">KYC</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Inscrit</th>
              <th className="sticky right-0 z-10 bg-[#0d1f3c] px-4 py-3 font-semibold text-right">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-white/5 hover:bg-white/[0.03]">
                <td className="sticky left-0 z-[1] bg-[#0d1f3c] px-4 py-3">
                  <div className="flex items-center gap-3">
                    {r.image ? (
                      <img
                        src={r.image}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#00d4ff]/25 text-xs font-bold text-[#00d4ff]"
                        aria-hidden
                      >
                        {r.initials}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{r.name}</p>
                      <p className="truncate font-mono text-xs text-white/45">{r.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${r.badgeClassName}`}
                  >
                    {r.badgeLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${r.anchorClassName}`}>
                    <AnchorIcon kind={r.anchorIcon} />
                    {r.anchorLabel}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-white/90">{r.planCode}</td>
                <td className="px-4 py-3">
                  <p className="text-xs text-white/90">{r.billingLabel}</p>
                  <p className="text-[10px] uppercase tracking-wider text-white/35">{r.periodLabel}</p>
                </td>
                <td className={`px-4 py-3 text-xs font-medium ${r.kycClassName}`}>{r.kycText}</td>
                <td className="px-4 py-3 font-mono text-xs tabular-nums text-white/80">
                  {r.trustScore}
                  <span className="text-white/35">/100</span>
                </td>
                <td className="px-4 py-3 text-xs text-white/55">{r.createdAtLabel}</td>
                <td className="sticky right-0 z-[1] bg-[#0d1f3c] px-4 py-3">
                  <div className="flex flex-wrap justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => setBadgeUserId(r.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:bg-white/5"
                      title="Voir badge"
                    >
                      <Eye className="h-3 w-3" aria-hidden />
                      Badge
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPlanUser({ id: r.id, planCode: r.planCode === '—' ? 'ESSENTIEL' : r.planCode })
                        setSelectedPlan(
                          (r.planCode !== '—' ? r.planCode : 'ESSENTIEL') as AdminPlanCode
                        )
                        setPlanError(null)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#BDA76B]/35 px-2 py-1 text-[10px] font-semibold text-[#BDA76B] transition hover:bg-[#BDA76B]/10"
                      title="Gérer plan"
                    >
                      <CreditCard className="h-3 w-3" aria-hidden />
                      Plan
                    </button>
                    <a
                      href={`mailto:${encodeURIComponent(r.email)}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-white/15 px-2 py-1 text-[10px] font-semibold text-white/70 transition hover:bg-white/5"
                      title="Envoyer email"
                    >
                      <Mail className="h-3 w-3" aria-hidden />
                      Email
                    </a>
                    <Link
                      href={`/admin/users/${r.id}`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[#00d4ff]/35 bg-[#00d4ff]/10 px-2 py-1 text-[10px] font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/20"
                      title="Voir détail"
                    >
                      <ExternalLink className="h-3 w-3" aria-hidden />
                      Détail
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-white/45">Aucun client pour ce filtre.</p>
        ) : null}
      </div>

      {badgeUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          role="dialog"
          aria-modal="true"
          aria-label="Aperçu badge BLOCKTRUST"
        >
          <div
            className="max-w-sm rounded-xl border p-6 shadow-xl"
            style={{ background: 'var(--bt-navy)', borderColor: 'var(--bt-border)' }}
          >
            <h2 className="font-syne mb-4 text-lg font-bold text-white">Badge BLOCKTRUST</h2>
            <div className="flex justify-center py-4">
              <BlockTrustBadge size={200} instanceId={`client-preview-${badgeUserId}`} />
            </div>
            <button
              type="button"
              onClick={() => setBadgeUserId(null)}
              className="mt-4 w-full rounded-lg px-4 py-2 text-sm font-medium text-white transition"
              style={{ background: 'rgba(255,255,255,0.08)' }}
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {planUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.65)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="plan-modal-title"
        >
          <div
            className="max-w-md w-full rounded-xl border p-6 shadow-xl"
            style={{ background: 'var(--bt-navy)', borderColor: 'var(--bt-border)' }}
          >
            <h2 id="plan-modal-title" className="font-syne text-lg font-bold text-white">
              Gérer le plan
            </h2>
            <p className="mt-2 text-sm" style={{ color: 'var(--bt-muted)' }}>
              Plan actuel : {getPlanDisplayLabel(planUser.planCode)}
            </p>
            <select
              value={selectedPlan}
              onChange={(e) => setSelectedPlan(e.target.value as AdminPlanCode)}
              className="mt-4 w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-sm text-white focus:border-bt-cyan focus:outline-none"
            >
              {PLAN_OPTIONS.map((p) => (
                <option key={p} value={p} className="bg-[#0d1f3c]">
                  {getPlanDisplayLabel(p)}
                </option>
              ))}
            </select>
            {planError && (
              <p className="mt-2 text-sm text-red-400">{planError}</p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPlanUser(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium transition"
                style={{ background: 'rgba(255,255,255,0.08)', color: 'var(--bt-muted)' }}
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={updatePlan}
                disabled={pending}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                style={{ background: 'var(--bt-cyan)' }}
              >
                {pending ? 'Mise à jour…' : 'Mettre à jour'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
