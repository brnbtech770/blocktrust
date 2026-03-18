import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'
import TrustConfirmClient from './TrustConfirmClient'

export default async function TrustConfirmPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const session = await auth()
  const { token } = await params

  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(`/trust/confirm/${token}`)}`)
  }

  const relation = await prisma.userTrustRelation.findFirst({
    where: { inviteToken: token },
  })

  if (!relation) {
    return (
      <div className="min-h-screen bt-circuit-bg flex flex-col items-center justify-center p-6" style={{ background: 'var(--bt-navy)' }}>
        <Logo size="lg" withText={false} href="/" />
        <h1 className="text-xl font-bold text-white mt-8">Invitation introuvable</h1>
      </div>
    )
  }

  if (relation.toUserId !== session.user.id) {
    return (
      <div className="min-h-screen bt-circuit-bg flex flex-col items-center justify-center p-6" style={{ background: 'var(--bt-navy)' }}>
        <Logo size="lg" withText={false} href="/" />
        <h1 className="text-xl font-bold text-white mt-8">Non autorisé</h1>
      </div>
    )
  }

  return (
    <div className="min-h-screen bt-circuit-bg flex flex-col items-center p-6" style={{ background: 'var(--bt-navy)' }}>
      <div className="pt-8">
        <Logo size="lg" withText={false} href="/" />
      </div>
      <TrustConfirmClient token={token} />
    </div>
  )
}
