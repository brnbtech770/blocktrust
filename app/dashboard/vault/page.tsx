// app/dashboard/vault/page.tsx
// Liste de tous les coffres accessibles
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Plus, ShieldCheck } from 'lucide-react'
import type { OrgRole } from '@prisma/client'
import FeatureOnboardingTooltip from '@/app/components/onboarding/FeatureOnboardingTooltip'

const MANAGE_VAULT_ROLES: OrgRole[] = ['OWNER', 'ADMIN', 'MANAGER']

export default async function VaultIndexPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard/vault')
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id, joinedAt: { not: null } },
    include: {
      organization: { select: { id: true, slug: true, name: true } },
    },
  })
  const orgIds = memberships.map((m) => m.organizationId)
  const manageableOrgs = memberships.filter((m) => MANAGE_VAULT_ROLES.includes(m.role))
  const createVaultHref =
    manageableOrgs.length === 1
      ? `/dashboard/organization/${manageableOrgs[0].organization.slug}`
      : '/dashboard/organization'
  const canCreateVault = manageableOrgs.length > 0
  if (orgIds.length === 0) {
    return (
      <div className="mx-auto max-w-3xl font-sans text-white/80">
        <FeatureOnboardingTooltip feature="vault" />
        <h1 className="font-syne text-2xl font-bold text-white">BLOCKTRUST™ Vault</h1>
        <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-6 text-sm text-white/50">
          Vous n&apos;êtes membre d&apos;aucune organisation.{' '}
          <Link href="/dashboard/organization" className="text-bt-cyan underline-offset-2 hover:underline">
            Créer ou rejoindre une équipe
          </Link>
        </p>
      </div>
    )
  }

  const vaults = await prisma.trustVault.findMany({
    where: { organizationId: { in: orgIds } },
    include: {
      organization: { select: { name: true, slug: true } },
      _count: { select: { entries: true } },
    },
    orderBy: { updatedAt: 'desc' },
  })

  return (
    <div className="mx-auto max-w-3xl font-sans text-white/85">
      <FeatureOnboardingTooltip feature="vault" />
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-6 w-6 text-bt-cyan/90" aria-hidden />
          <h1 className="font-syne text-2xl font-bold tracking-tight text-white">BLOCKTRUST™ Vault</h1>
        </div>
        {canCreateVault ? (
          <Link
            href={createVaultHref}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-2 text-sm font-medium text-bt-cyan transition hover:bg-bt-cyan/25"
          >
            <Plus className="h-4 w-4" aria-hidden />
            Créer un coffre
          </Link>
        ) : null}
      </div>
      <p className="mb-6 text-sm text-white/50">Coffres partagés au sein de vos organisations.</p>
      <ul className="space-y-2">
        {vaults.length === 0 ? (
          <li className="rounded-xl border border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-white/45">
            Aucun coffre pour l&apos;instant.{' '}
            {canCreateVault ? (
              <Link href={createVaultHref} className="text-bt-cyan underline-offset-2 hover:underline">
                Créer un coffre
              </Link>
            ) : (
              <span>Demandez à un administrateur de votre équipe.</span>
            )}
          </li>
        ) : null}
        {vaults.map((v) => (
          <li key={v.id}>
            <Link
              href={`/dashboard/vault/${v.id}`}
              className="flex items-center justify-between rounded-xl border border-white/10 bg-[#0d1f3c]/60 px-4 py-3 transition hover:border-bt-cyan/25"
            >
              <div className="min-w-0">
                <p className="font-medium text-white">{v.name}</p>
                <p className="text-xs text-white/40">
                  {v.organization.name} · {v._count.entries} entrée{v._count.entries > 1 ? 's' : ''}
                </p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
