// app/admin/organizations/page.tsx
// Vue globale organisations B2B + coffres
// ============================================================

import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import { countOrgVaultEntries } from '@/lib/vault-utils'
import Link from 'next/link'
import { Building2 } from 'lucide-react'
import AdminOrganizationsActions from '@/app/admin/organizations/AdminOrganizationsActions'

export default async function AdminOrganizationsPage() {
  await requireAdminPage()

  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      owner: { select: { email: true } },
      _count: { select: { members: true, vaults: true } },
    },
    take: 300,
  })

  const rows = await Promise.all(
    orgs.map(async (o) => ({
      ...o,
      entryCount: await countOrgVaultEntries(o.id),
    })),
  )

  return (
    <div className="font-sans text-base leading-relaxed text-white/80">
      <div className="mb-6 flex items-center gap-2">
        <Building2 className="h-6 w-6 text-bt-cyan/90" aria-hidden />
        <h1 className="font-syne text-2xl font-bold text-white">Vue globale — organisations</h1>
      </div>
      <p className="mb-6 text-sm text-white/55">
        Synthèse des équipes, membres et coffres BLOCKTRUST™ Vault ({rows.length} organisation
        {rows.length > 1 ? 's' : ''}).
      </p>

      {rows.length === 0 ? (
        <div className="text-center py-12 rounded-xl border border-white/10">
          <Building2 className="w-10 h-10 text-white/20 mx-auto mb-3" aria-hidden />
          <p className="text-white/40 text-sm">Aucune organisation créée</p>
          <p className="text-white/20 text-xs mt-1 max-w-md mx-auto px-4">
            Les organisations apparaissent quand des clients B2B créent leur équipe
          </p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/[0.04] text-xs uppercase tracking-wide text-white/45">
              <tr>
                <th className="px-3 py-2">Organisation</th>
                <th className="px-3 py-2">Slug</th>
                <th className="px-3 py-2">Tier</th>
                <th className="px-3 py-2">Propriétaire</th>
                <th className="px-3 py-2 text-right">Membres</th>
                <th className="px-3 py-2 text-right">Coffres</th>
                <th className="px-3 py-2 text-right">Entrées</th>
                <th className="px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => (
                <tr key={o.id} className="border-b border-white/5 align-top">
                  <td className="px-3 py-2 font-medium text-white">{o.name}</td>
                  <td className="px-3 py-2 font-mono text-xs text-white/60">{o.slug}</td>
                  <td className="px-3 py-2 font-mono text-xs">
                    <span
                      className={
                        o.tier === 'SUSPENDED' ? 'text-amber-400' : 'text-bt-cyan/90'
                      }
                    >
                      {o.tier}
                    </span>
                  </td>
                  <td className="max-w-[200px] truncate px-3 py-2 text-xs text-white/55">
                    {o.owner.email ?? '—'}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/70">{o._count.members}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/70">{o._count.vaults}</td>
                  <td className="px-3 py-2 text-right tabular-nums text-white/70">{o.entryCount}</td>
                  <td className="px-3 py-2">
                    <AdminOrganizationsActions
                      orgId={o.id}
                      orgName={o.name}
                      slug={o.slug}
                      tier={o.tier}
                      isSuspended={o.tier === 'SUSPENDED'}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-6 text-xs text-white/40">
        Rappel : les actions métier restent côté client (
        <Link href="/dashboard/organization" className="text-bt-cyan/90 hover:underline">
          espace équipe
        </Link>
        ).
      </p>
    </div>
  )
}
