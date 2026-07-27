import Link from 'next/link'
import { Check, Clock } from 'lucide-react'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'
import { JOIN_BLOCKTRUST_ESSENTIEL_LABEL } from '@/lib/pricing'

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params

  const relation = await prisma.userTrustRelation.findFirst({
    where: { inviteToken: token },
    include: {
      fromUser: { select: { name: true, email: true } },
    },
  })

  if (!relation) {
    return (
      <div className="min-h-screen bt-circuit-bg flex flex-col items-center justify-center p-6" style={{ background: 'var(--bt-navy)' }}>
        <Logo size="lg" withText={false} href="/" />
        <h1 className="font-syne mt-8 mb-2 text-xl font-bold tracking-tight text-white">
          Invitation introuvable
        </h1>
        <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>Ce lien n&apos;existe pas ou a été révoqué.</p>
      </div>
    )
  }

  if (relation.inviteExpiry && relation.inviteExpiry < new Date()) {
    return (
      <div className="min-h-screen bt-circuit-bg flex flex-col items-center justify-center p-6" style={{ background: 'var(--bt-navy)' }}>
        <Logo size="lg" withText={false} href="/" />
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mt-8 text-amber-400">
          <Clock className="h-8 w-8" aria-hidden />
        </div>
        <h1 className="font-syne mt-6 mb-2 text-xl font-bold tracking-tight text-white">
          Cette invitation a expiré
        </h1>
        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--bt-muted)' }}>
          Demandez à {relation.fromUser.name || 'l\'expéditeur'} de vous renvoyer une invitation.
        </p>
      </div>
    )
  }

  const fromName = relation.fromUser.name || relation.fromUser.email || 'Un utilisateur BLOCKTRUST'
  const initiales = fromName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bt-circuit-bg flex flex-col items-center p-6" style={{ background: 'var(--bt-navy)' }}>
      <div className="pt-8">
        <Logo size="lg" withText={false} href="/" />
      </div>

      <div className="mt-10 w-full max-w-[480px] rounded-xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur-sm transition-all hover:border-gold/30 md:p-10">
        <div
          className="w-[60px] h-[60px] rounded-full mx-auto flex items-center justify-center text-xl font-bold text-white mb-4"
          style={{ background: 'rgba(0,212,255,0.2)' }}
        >
          {initiales}
        </div>
        <h1 className="font-syne mb-3 text-2xl font-extrabold tracking-tight text-white">
          {fromName} vous fait confiance sur BLOCKTRUST™
        </h1>
        <p className="text-[15px] mb-6" style={{ color: 'var(--bt-muted)' }}>
          {fromName} a certifié son identité numérique et vous invite à rejoindre son cercle de confiance.
        </p>

        <div className="h-px w-full mb-6" style={{ background: 'var(--bt-border)' }} />

        <p className="text-sm font-semibold text-white mb-3">Pourquoi rejoindre ?</p>
        <ul className="text-left text-sm space-y-2 mb-6" style={{ color: 'var(--bt-muted)' }}>
          <li className="flex items-center gap-2"><Check className="h-5 w-5 shrink-0 text-bt-cyan" aria-hidden /> Identité certifiée et infalsifiable</li>
          <li className="flex items-center gap-2"><Check className="h-5 w-5 shrink-0 text-bt-cyan" aria-hidden /> Badge QR vérifiable partout</li>
          <li className="flex items-center gap-2"><Check className="h-5 w-5 shrink-0 text-bt-cyan" aria-hidden /> Protection contre l&apos;usurpation d&apos;identité</li>
          <li className="flex items-center gap-2"><Check className="h-5 w-5 shrink-0 text-bt-cyan" aria-hidden /> Alertes fraude en temps réel</li>
        </ul>

        <Link
          href={`/pricing?ref=${token}`}
          className="font-syne block w-full rounded-[10px] bg-bt-cyan py-4 px-8 text-center text-base font-bold text-navy transition hover:bg-bt-cyan/90"
        >
          {JOIN_BLOCKTRUST_ESSENTIEL_LABEL}
        </Link>
        <p className="text-[11px] mt-3" style={{ color: 'var(--bt-muted)', fontFamily: 'var(--font-mono-bt), monospace' }}>
          Sans engagement · CB obligatoire · Annulation à tout moment
        </p>
      </div>

      <footer className="mt-12 flex items-center gap-2" style={{ color: 'var(--bt-muted)' }}>
        <Logo size="sm" withText={false} href="/" />
        <span className="text-xs">blocktrust.tech</span>
      </footer>
    </div>
  )
}
