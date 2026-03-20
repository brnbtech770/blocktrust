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
            className={`flex items-center gap-2 md:gap-3 px-3 py-2.5 md:px-4 md:py-3 text-sm md:text-base rounded-lg transition-colors font-medium border-l-2 ${
              isActive
                ? 'text-[#00d4ff] bg-[rgba(0,212,255,0.08)] border-[#00d4ff]'
                : 'border-transparent hover:text-white hover:bg-[rgba(255,255,255,0.04)]'
            }`}
            style={!isActive ? { color: 'var(--bt-muted)' } : undefined}
          >
            <Icon className="h-[18px] w-[18px] md:h-[22px] md:w-[22px] shrink-0" strokeWidth={2} />
            <span>{item.name}</span>
          </Link>
        )
      })}
    </nav>
  )
}
