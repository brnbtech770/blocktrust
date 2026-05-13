// app/dashboard/organization/page.tsx
// Hub organisations B2B
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { hasOrgAccess } from '@/lib/vault-utils'
import CreateOrgForm from './CreateOrgForm'
import { Building2, ChevronRight } from 'lucide-react'

export default async function OrganizationIndexPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard/organization')
  }

  const sub = await prisma.subscription.findUnique({
    where: { userId: session.user.id },
    select: { plan: true, status: true },
  })
  const canCreate =
    sub?.status === 'active' && sub.plan ? hasOrgAccess(sub.plan) : false

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id, joinedAt: { not: null } },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          tier: true,
          _count: { select: { vaults: true, members: true } },
        },
      },
    },
    orderBy: { joinedAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-3xl font-sans text-white/85">
      <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-syne text-2xl font-bold tracking-tight text-white">Organisation</h1>
          <p className="mt-1 text-sm text-white/50">
            Équipe, invitations et coffres BlockTrust Vault pour votre entreprise.
          </p>
        </div>
      </div>

      <div className="mb-8">
        <CreateOrgForm disabled={!canCreate} />
      </div>

      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-white/40">Mes organisations</p>
        {memberships.length === 0 ? (
          <p className="rounded-lg border border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
            Aucune organisation pour l’instant. Créez la première ci-dessus ou acceptez une invitation reçue par
            e-mail.
          </p>
        ) : (
          <ul className="space-y-2">
            {memberships.map((m) => (
              <li key={m.organization.id}>
                <Link
                  href={`/dashboard/organization/${m.organization.slug}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-[#0d1f3c]/80 px-4 py-3 transition hover:border-bt-cyan/25 hover:bg-[#0d1f3c]"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Building2 className="h-5 w-5 shrink-0 text-bt-cyan/80" aria-hidden />
                    <div className="min-w-0">
                      <p className="truncate font-medium text-white">{m.organization.name}</p>
                      <p className="text-xs text-white/40">
                        {m.role} · {m.organization._count.vaults} coffre
                        {m.organization._count.vaults > 1 ? 's' : ''} · {m.organization._count.members} membre
                        {m.organization._count.members > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-white/35" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
