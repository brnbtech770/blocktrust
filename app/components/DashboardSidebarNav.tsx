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
  Code2,
  Palette,
  Lock,
} from 'lucide-react'

const iconMap = {
  Home,
  Building,
  Building2,
  Shield,
  ShieldCheck,
  Users,
  CreditCard,
  Settings,
  Code2,
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

export default function DashboardSidebarNav({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon]
        const pathOnly = item.href.split('?')[0]
        const isDashboardRoot = pathOnly === '/dashboard'
        const isActive =
          pathname === pathOnly ||
          pathname === item.href ||
          (!isDashboardRoot && pathname.startsWith(`${pathOnly}/`))
        return (
          <Link
            key={`${item.href}-${item.name}`}
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
      })}
    </nav>
  )
}
