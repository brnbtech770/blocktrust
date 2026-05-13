// app/dashboard/organization/[slug]/page.tsx
// Détail organisation + coffres + équipe
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { notFound, redirect } from 'next/navigation'
import OrganizationSlugDashboard from './OrganizationSlugDashboard'

type Props = { params: Promise<{ slug: string }> }

export default async function OrganizationSlugPage({ params }: Props) {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/dashboard/organization')
  }

  const { slug } = await params
  const org = await prisma.organization.findFirst({
    where: { slug },
    select: { id: true },
  })
  if (!org) notFound()

  const m = await prisma.organizationMember.findUnique({
    where: {
      organizationId_userId: { organizationId: org.id, userId: session.user.id },
    },
    select: { joinedAt: true },
  })
  if (!m?.joinedAt) {
    redirect('/dashboard/organization')
  }

  return <OrganizationSlugDashboard orgSlug={slug} />
}
