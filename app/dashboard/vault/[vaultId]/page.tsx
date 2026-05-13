// app/dashboard/vault/[vaultId]/page.tsx
// Détail coffre + entrées
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { loadVaultForUser, orgRoleCanManageVaults } from '@/lib/org-vault-server'
import { notFound, redirect } from 'next/navigation'
import VaultDetailClient from './VaultDetailClient'

type Props = { params: Promise<{ vaultId: string }> }

export default async function VaultDetailPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard/vault')
  }

  const { vaultId } = await params
  const loaded = await loadVaultForUser(vaultId, session.user.id)
  if (!loaded) notFound()

  const org = await prisma.organization.findUnique({
    where: { id: loaded.vault.organizationId },
    select: { name: true, slug: true },
  })
  if (!org) notFound()

  return (
    <VaultDetailClient
      vaultId={vaultId}
      organizationSlug={org.slug}
      organizationName={org.name}
      canEdit={orgRoleCanManageVaults(loaded.membership.role)}
    />
  )
}
