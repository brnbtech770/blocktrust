// app/admin/team/page.tsx
// Équipe BLOCKTRUST™ — réservé aux emails admin (ADMIN_EMAILS)
// ============================================================

import { auth } from '@/app/lib/auth-server'
import { redirect } from 'next/navigation'
import { isAdmin } from '@/lib/admin-utils'
import { Crown, Shield } from 'lucide-react'

const ADMIN_TEAM = [
  {
    name: 'Olivier Bernabé',
    role: 'CEO & Fondateur',
    initials: 'OB',
    color: 'cyan' as const,
  },
  {
    name: 'Laurianne Winter',
    role: 'DAF & Chef de projet',
    initials: 'LW',
    color: 'gold' as const,
  },
  {
    name: 'Déborah Slama',
    role: 'Directrice Marketing',
    initials: 'DS',
    color: 'gold' as const,
  },
  {
    name: 'Shaï Bernabé',
    role: 'Data & IA',
    initials: 'SB',
    color: 'cyan' as const,
  },
]

export default async function AdminTeamPage() {
  const session = await auth()
  if (!session?.user?.email || !isAdmin(session.user.email)) {
    redirect('/dashboard')
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center gap-3">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#BDA76B]/20 bg-[#BDA76B]/10"
          aria-hidden
        >
          <Crown className="h-5 w-5 text-[#BDA76B]" strokeWidth={2} />
        </div>
        <div>
          <h1 className="font-syne text-2xl font-bold text-white">Équipe BLOCKTRUST™</h1>
          <p className="text-sm text-white/40">Accès administrateur réservé</p>
        </div>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {ADMIN_TEAM.map((member) => (
          <div
            key={member.initials}
            className="flex flex-col items-center gap-3 rounded-xl border border-white/10 bg-[#0d1f3c] p-5 transition hover:border-white/20"
          >
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full border ${
                member.color === 'cyan'
                  ? 'border-[#00d4ff]/20 bg-[#00d4ff]/10'
                  : 'border-[#BDA76B]/20 bg-[#BDA76B]/10'
              }`}
            >
              <span
                className={`font-syne text-sm font-bold ${
                  member.color === 'cyan' ? 'text-[#00d4ff]' : 'text-[#BDA76B]'
                }`}
              >
                {member.initials}
              </span>
            </div>

            <div className="text-center">
              <p className="font-syne text-sm font-semibold text-white">{member.name}</p>
              <p className="mt-1 text-xs text-[#BDA76B]">{member.role}</p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" aria-hidden />
              <span className="text-[10px] font-medium uppercase tracking-widest text-emerald-400/70">
                Admin actif
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-white/10 bg-[#0d1f3c] p-5">
        <div className="mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 shrink-0 text-[#00d4ff]" strokeWidth={2} aria-hidden />
          <p className="text-sm font-semibold text-white/60">Accès admin configuré via</p>
        </div>
        <code className="font-mono text-xs text-white/40">ADMIN_EMAILS (variable Vercel Sensitive)</code>
        <p className="mt-2 text-xs text-white/30">
          Pour ajouter un admin : mettre à jour ADMIN_EMAILS dans Vercel → Redéployer.
        </p>
      </div>
    </div>
  )
}
