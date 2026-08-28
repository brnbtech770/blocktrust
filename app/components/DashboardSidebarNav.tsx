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
  Puzzle,
  FileSignature,
  Globe,
  BadgeCheck,
  HelpCircle,
  Crown,
} from 'lucide-react'
import { isChromeExtensionStoreUrlReady } from '@/lib/chrome-extension'

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
  Puzzle,
  FileSignature,
  Globe,
  BadgeCheck,
  HelpCircle,
  Crown,
} as const

export type SidebarItem = {
  name: string
  href: string
  icon: keyof typeof iconMap
  locked?: boolean
  lockTooltip?: string
  external?: boolean
}

export type SidebarSection = {
  label?: string
  items: SidebarItem[]
}

function navLinkClass(isActive: boolean, locked?: boolean) {
  return `group relative flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2.5 font-sans text-sm transition-all ${
    locked ? 'opacity-60' : ''
  } ${
    isActive
      ? 'border border-bt-cyan/30 bg-bt-cyan/10 text-bt-cyan'
      : 'text-white/50 hover:bg-white/5 hover:text-white'
  }`
}

function NavItem({ item }: { item: SidebarItem }) {
  const pathname = usePathname() ?? ''
  const Icon = iconMap[item.icon] ?? Shield
  const pathOnly = item.href.split('?')[0].split('#')[0]
  const isDashboardRoot = pathOnly === '/dashboard'
  const isActive =
    !item.external &&
    (pathname === pathOnly ||
      pathname === item.href ||
      (!isDashboardRoot && pathname.startsWith(`${pathOnly}/`)))

  const isExternal = Boolean(item.external) || item.href.startsWith('http')
  const storeReady = isChromeExtensionStoreUrlReady(item.href)
  const isDisabledExternal = isExternal && !storeReady

  const content = (
    <>
      {isActive ? (
        <span className="absolute left-0 top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-bt-cyan" aria-hidden />
      ) : null}
      <Icon
        size={18}
        strokeWidth={2}
        className={`shrink-0 ${isActive ? 'text-bt-cyan' : 'text-bt-cyan/90'}`}
        aria-hidden
      />
      <span className="min-w-0 flex-1">{item.name}</span>
      {item.locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-white/35" aria-hidden /> : null}
    </>
  )

  if (isExternal) {
    if (isDisabledExternal) {
      return (
        <span
          title="Bientôt disponible sur le Chrome Web Store"
          className={`${navLinkClass(false)} cursor-not-allowed opacity-55`}
          aria-disabled="true"
        >
          {content}
        </span>
      )
    }

    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        title={item.lockTooltip}
        className={navLinkClass(false, item.locked)}
      >
        {content}
      </a>
    )
  }

  return (
    <Link
      href={item.href}
      title={item.lockTooltip}
      className={navLinkClass(isActive, item.locked)}
    >
      {content}
    </Link>
  )
}

export default function DashboardSidebarNav({ sections }: { sections: SidebarSection[] }) {
  return (
    <nav>
      {sections.map((section, idx) => (
        <div key={section.label ?? `section-${idx}`} className={idx > 0 ? 'mt-5' : ''}>
          {section.label ? (
            <p className="mb-1.5 px-3 pt-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
              {section.label}
            </p>
          ) : null}
          <div className="space-y-1">
            {section.items.map((item) => (
              <NavItem key={`${item.href}-${item.name}`} item={item} />
            ))}
          </div>
        </div>
      ))}
    </nav>
  )
}

export function DashboardSidebarNavFlat({ items }: { items: SidebarItem[] }) {
  return <DashboardSidebarNav sections={[{ items }]} />
}
