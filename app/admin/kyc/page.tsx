import { prisma } from '@/app/lib/db'
import { requireAdminPage } from '@/app/lib/require-admin-page'
import AdminKycClient from './AdminKycClient'

export default async function AdminKycPage() {
  await requireAdminPage()

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
      kycVerifications: {
        where: { siretVerified: true },
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: { siretVerified: true, siretData: true, updatedAt: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Aplatissement : on remonte le flag "INSEE vérifié" au niveau utilisateur.
  const usersWithInsee = users.map(({ kycVerifications, ...rest }) => ({
    ...rest,
    siretVerifiedByInsee: kycVerifications[0]?.siretVerified ?? false,
  }))

  return (
    <div className="p-6">
      <h1 className="font-syne mb-6 text-2xl font-bold tracking-tight text-white">
        Vérifications KYC
      </h1>
      <AdminKycClient users={usersWithInsee} />
    </div>
  )
}
