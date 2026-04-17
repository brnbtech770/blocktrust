import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import AdminDemandesClient from './AdminDemandesClient'

export default async function AdminDemandesPage() {
  await requireAdminPage()

  const entries = await prisma.userManualTrustEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true } },
    },
  })

  return (
    <div className="p-6">
      <h1 className="font-syne mb-6 text-2xl font-bold tracking-tight text-white">
        Demandes de vérification manuelle
      </h1>
      <AdminDemandesClient entries={entries} />
    </div>
  )
}
