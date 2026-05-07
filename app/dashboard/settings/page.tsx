// app/dashboard/settings/page.tsx
// Paramètres compte — auth serveur + affichage session réelle (pas localStorage)
// ============================================================

import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import SettingsClient from './SettingsClient'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/dashboard/settings')}`)
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      image: true,
      extensionApiKeyHash: true,
      extensionApiKey: true,
    },
  })

  if (!user?.email) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent('/dashboard/settings')}`)
  }

  return (
    <SettingsClient
      user={{ email: user.email, name: user.name, image: user.image }}
      extensionKeyInitial={{
        hasKey: Boolean(user.extensionApiKeyHash),
        masked: user.extensionApiKey ?? null,
      }}
    />
  )
}
