'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  UserCog,
  Building2,
  BadgeCheck,
  ShieldCheck,
  GitPullRequest,
  Activity,
  Bell,
  Crown,
} from 'lucide-react'

const adminIconMap = {
  LayoutDashboard,
  Users,
  UserCog,
  Building2,
  BadgeCheck,
  ShieldCheck,
  GitPullRequest,
  Activity,
  Bell,
  Crown,
} as const

export type AdminNavIconName = keyof typeof adminIconMap

export type AdminNavLinkProps = {
  href: string
  label: string
  icon: AdminNavIconName
  badge?: number
}

export default function AdminNavLink({ href, label, icon, badge }: AdminNavLinkProps) {
  const pathname = usePathname() ?? ''
  const Icon = adminIconMap[icon] ?? LayoutDashboard
  const active =
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    (href === '/admin/alerts' && pathname === '/admin/ai-alerts')

  return (
    <Link
      href={href}
      className={`group flex items-center gap-3 rounded-lg px-4 py-3 text-base font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)] hover:text-white ${
        active ? 'bg-[rgba(0,212,255,0.08)] text-white' : ''
      }`}
      style={{ color: active ? undefined : 'var(--bt-muted)' }}
    >
      <span className="inline-flex shrink-0 transition-all duration-300 group-hover:drop-shadow-[0_0_6px_rgba(0,212,255,0.8)]">
        <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="flex-1">{label}</span>
      {badge != null && badge > 0 ? (
        <span
          className="min-w-[1.35rem] rounded-full px-1.5 py-0.5 text-center text-[10px] font-bold text-white"
          style={{ background: '#dc2626' }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}
