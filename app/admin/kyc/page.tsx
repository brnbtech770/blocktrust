import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/app/lib/admin'
import { prisma } from '@/app/lib/db'
import AdminKycClient from './AdminKycClient'

export default async function AdminKycPage() {
  const session = await auth()
  if (!session?.user?.email) redirect('/auth/signin')
  if (!isAdmin(session.user.email)) redirect('/dashboard')

  const users = await prisma.user.findMany({
    where: { email: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      accountType: true,
      kycStatus: true,
      kycVerifiedAt: true,
      kycRejectedAt: true,
      kycRejectedReason: true,
      siret: true,
      companyName: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-white mb-6" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
        Vérifications KYC
      </h1>
      <AdminKycClient users={users} />
    </div>
  )
}
