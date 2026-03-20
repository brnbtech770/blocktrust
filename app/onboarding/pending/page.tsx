import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'
import OnboardingPendingClient from './OnboardingPendingClient'

export default async function OnboardingPendingPage() {
  const session = await auth()
  if (!session?.user?.id && !session?.user?.email) {
    redirect('/auth/signin?callbackUrl=/onboarding/pending')
  }

  const userId = session.user.id
  const userEmail = session.user.email

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, kycStatus: true, kycRejectedAt: true, kycRejectedReason: true },
      })
    : userEmail
      ? await prisma.user.findUnique({
          where: { email: userEmail },
          select: { id: true, kycStatus: true, kycRejectedAt: true, kycRejectedReason: true },
        })
      : null

  if (!user) redirect('/auth/signin')

  if (user.kycStatus === 'VERIFIED') {
    redirect('/dashboard')
  }

  if (user.kycStatus === 'REJECTED') {
    redirect('/onboarding/rejected')
  }

  const verification = await prisma.kYCVerification.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
    select: { stripeVerificationUrl: true, status: true },
  })

  return (
    <div className="min-h-screen bt-circuit-bg" style={{ background: 'var(--bt-navy)', padding: 24 }}>
      <div className="flex justify-center pt-8 pb-6">
        <Logo size="lg" withText={false} href="/" />
      </div>
      <OnboardingPendingClient
        kycStatus={user.kycStatus ?? 'PENDING'}
        verificationUrl={verification?.stripeVerificationUrl ?? null}
      />
    </div>
  )
}
