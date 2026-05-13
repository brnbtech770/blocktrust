// app/dashboard/vault/page.tsx
// Liste de tous les coffres accessibles
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ShieldCheck } from 'lucide-react'

export default async function VaultIndexPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard/vault')
  }

  const memberships = await prisma.organizationMember.findMany({
    where: { userId: session.user.id, joinedAt: { not: null } },
    select: { organizationId: true },
  })
  const orgIds = memberships.map((m) => m.organizationId)
  if (orgIds.length === 0) {
    return (
      <div className="mx-auto max-w-3xl font-sans text-white/80">
        <h1 className="font-syne text-2xl font-bold text-white">BlockTrust Vault</h1>
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
      <div className="mb-6 flex items-center gap-2">
        <ShieldCheck className="h-6 w-6 text-bt-cyan/90" aria-hidden />
        <h1 className="font-syne text-2xl font-bold tracking-tight text-white">BlockTrust Vault</h1>
      </div>
      <p className="mb-6 text-sm text-white/50">Coffres partagés au sein de vos organisations.</p>
      <ul className="space-y-2">
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
