import { notFound } from 'next/navigation'
import Link from 'next/link'
import { prisma } from '@/app/lib/db'
import { Logo } from '@/app/components/ui/Logo'

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
        <h1 className="text-xl font-bold text-white mt-8 mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
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
        <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mt-8 text-amber-400 text-4xl">🕐</div>
        <h1 className="text-xl font-bold text-white mt-6 mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          Cette invitation a expiré
        </h1>
        <p className="text-sm text-center max-w-sm" style={{ color: 'var(--bt-muted)' }}>
          Demandez à {relation.fromUser.name || 'l\'expéditeur'} de vous renvoyer une invitation.
        </p>
      </div>
    )
  }

  const fromName = relation.fromUser.name || relation.fromUser.email || 'Un utilisateur BlockTrust'
  const initiales = fromName.slice(0, 2).toUpperCase()

  return (
    <div className="min-h-screen bt-circuit-bg flex flex-col items-center p-6" style={{ background: 'var(--bt-navy)' }}>
      <div className="pt-8">
        <Logo size="lg" withText={false} href="/" />
      </div>

      <div
        className="w-full max-w-[480px] mt-10 rounded-2xl p-8 md:p-10 text-center"
        style={{
          border: '1px solid rgba(0,212,255,0.2)',
          borderRadius: 16,
          background: 'rgba(13,31,60,0.8)',
        }}
      >
        <div
          className="w-[60px] h-[60px] rounded-full mx-auto flex items-center justify-center text-xl font-bold text-white mb-4"
          style={{ background: 'rgba(0,212,255,0.2)' }}
        >
          {initiales}
        </div>
        <h1 className="text-2xl font-extrabold text-white mb-3" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
          {fromName} vous fait confiance sur BlockTrust
        </h1>
        <p className="text-[15px] mb-6" style={{ color: 'var(--bt-muted)' }}>
          {fromName} a certifié son identité numérique et vous invite à rejoindre son cercle de confiance.
        </p>

        <div className="h-px w-full mb-6" style={{ background: 'var(--bt-border)' }} />

        <p className="text-sm font-semibold text-white mb-3">Pourquoi rejoindre ?</p>
        <ul className="text-left text-sm space-y-2 mb-6" style={{ color: 'var(--bt-muted)' }}>
          <li className="flex items-center gap-2"><span style={{ color: '#00d4ff' }}>✓</span> Identité certifiée et infalsifiable</li>
          <li className="flex items-center gap-2"><span style={{ color: '#00d4ff' }}>✓</span> Badge QR vérifiable partout</li>
          <li className="flex items-center gap-2"><span style={{ color: '#00d4ff' }}>✓</span> Protection contre l&apos;usurpation d&apos;identité</li>
          <li className="flex items-center gap-2"><span style={{ color: '#00d4ff' }}>✓</span> Alertes fraude en temps réel</li>
        </ul>

        <Link
          href={`/pricing?ref=${token}`}
          className="block w-full py-4 px-8 rounded-[10px] font-bold text-base text-center transition hover:brightness-110"
          style={{ background: '#00d4ff', color: '#0a1628', fontFamily: 'var(--font-syne), sans-serif' }}
        >
          Rejoindre BlockTrust — 4,99€/mois
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
