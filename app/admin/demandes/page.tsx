import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import AdminDemandesClient from './AdminDemandesClient'

export default async function AdminDemandesPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/auth/signin')
  if (!isAdmin(session.user.email)) redirect('/dashboard')

  const entries = await prisma.userManualTrustEntry.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { email: true, name: true } },
    },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
        Demandes de vérification manuelle
      </h1>
      <AdminDemandesClient entries={entries} />
    </div>
  )
}
