'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  Home,
  Building,
  Building2,
  Shield,
  ShieldCheck,
  Users,
  CreditCard,
  Settings,
  Palette,
  Lock,
  LayoutDashboard,
} from 'lucide-react'

const iconMap = {
  Home,
  LayoutDashboard,
  Building,
  Building2,
  Shield,
  ShieldCheck,
  Users,
  CreditCard,
  Settings,
  Palette,
  Lock,
} as const

export type SidebarItem = {
  name: string
  href: string
  icon: keyof typeof iconMap
  locked?: boolean
  lockTooltip?: string
}

export type SidebarSection = {
  label?: string
  items: SidebarItem[]
}

function NavItem({ item }: { item: SidebarItem }) {
  const pathname = usePathname() ?? ''
  const Icon = iconMap[item.icon] ?? Shield
  const pathOnly = item.href.split('?')[0]
  const isDashboardRoot = pathOnly === '/dashboard'
  const isActive =
    pathname === pathOnly ||
    pathname === item.href ||
    (!isDashboardRoot && pathname.startsWith(`${pathOnly}/`))

  return (
    <Link
      href={item.href}
      title={item.lockTooltip}
      className={`group flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm transition-all ${
        item.locked ? 'opacity-70' : ''
      } ${
        isActive
          ? 'border border-gold/25 bg-gold/10 text-gold'
          : 'text-white/50 hover:bg-white/5 hover:text-white'
      }`}
    >
      <Icon
        size={18}
        strokeWidth={2}
        className={`shrink-0 ${isActive ? 'text-gold' : 'text-bt-cyan/90'}`}
        aria-hidden
      />
      <span>{item.name}</span>
    </Link>
  )
}

export default function DashboardSidebarNav({ sections }: { sections?: SidebarSection[] }) {
  const safeSections = sections ?? []

  return (
    <nav>
      {safeSections.map((section, idx) => {
        if (!section?.items) return null

        return (
          <div key={section.label ?? `section-${idx}`} className={idx > 0 ? 'mt-4' : ''}>
            {section.label ? (
              <p className="mb-1 px-3 pt-1 text-[10px] uppercase tracking-widest text-white/20">
                {section.label}
              </p>
            ) : null}
            <div className="space-y-1">
              {section.items.map((item) => (
                <NavItem key={`${item.href}-${item.name}`} item={item} />
              ))}
            </div>
          </div>
        )
      })}
    </nav>
  )
}

// Rétrocompatibilité : liste plate → une section sans label
export function DashboardSidebarNavFlat({ items }: { items: SidebarItem[] }) {
  return <DashboardSidebarNav sections={[{ items: items ?? [] }]} />
}
