'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Home, Building, Shield, Users, CreditCard, Settings } from 'lucide-react'

const iconMap = {
  Home,
  Building,
  Shield,
  Users,
  CreditCard,
  Settings,
} as const

export type SidebarItem = { name: string; href: string; icon: keyof typeof iconMap }

export default function DashboardSidebarNav({ items }: { items: SidebarItem[] }) {
  const pathname = usePathname()

  return (
    <nav className="space-y-1">
      {items.map((item) => {
        const Icon = iconMap[item.icon]
        const pathOnly = item.href.split('?')[0]
        const isActive = pathname === pathOnly || pathname === item.href
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2 rounded-lg px-3 py-2 font-sans text-sm transition-all ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-white/50 hover:bg-white/5 hover:text-white'
            }`}
          >
            <Icon size={18} strokeWidth={2} className="shrink-0" aria-hidden />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
