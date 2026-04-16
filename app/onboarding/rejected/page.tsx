import { redirect } from 'next/navigation'
import { auth } from '@/app/lib/auth-server'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'

export default async function OnboardingRejectedPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect('/auth/signin?callbackUrl=/onboarding/rejected')
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { kycRejectedReason: true },
  })

  if (!user) redirect('/auth/signin')

  return (
    <div className="min-h-screen bt-circuit-bg" style={{ background: 'var(--bt-navy)', padding: 24 }}>
      <div className="flex justify-center pt-8 pb-6">
        <Logo size="lg" withText={false} href="/" />
      </div>
      <div className="mx-auto max-w-[480px] rounded-xl border border-red-500/30 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-gold/30">
        <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <h1 className="font-syne mb-2 text-xl font-bold tracking-tight text-white">
          Vérification refusée
        </h1>
        {user.kycRejectedReason && (
          <p className="text-sm mb-6" style={{ color: 'var(--bt-muted)' }}>
            {user.kycRejectedReason}
          </p>
        )}
        <a
          href="mailto:support@blocktrust.tech"
          className="inline-block py-3 px-6 rounded-lg font-bold text-white"
          style={{ background: '#E05252' }}
        >
          Contacter le support
        </a>
      </div>
    </div>
  )
}
