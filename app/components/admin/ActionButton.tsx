// app/components/admin/ActionButton.tsx
// Bouton d'action admin (Valider / Rejeter / Suspendre / Réactiver / Révoquer).
// ============================================================

'use client'

import type { ComponentProps, ReactNode } from 'react'
import Link from 'next/link'
import {
  CheckCircle,
  XCircle,
  PauseCircle,
  PlayCircle,
  Ban,
  ArrowRight,
} from 'lucide-react'

export type ActionVariant =
  | 'validate'
  | 'reject'
  | 'suspend'
  | 'reactivate'
  | 'revoke'

const VARIANT_CFG: Record<
  ActionVariant,
  { className: string; Icon: typeof CheckCircle; label: string }
> = {
  validate: {
    className:
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
    Icon: CheckCircle,
    label: 'Valider',
  },
  reject: {
    className:
      'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20',
    Icon: XCircle,
    label: 'Rejeter',
  },
  suspend: {
    className:
      'bg-amber-500/10 text-amber-400 border-amber-500/30 hover:bg-amber-500/20',
    Icon: PauseCircle,
    label: 'Suspendre',
  },
  reactivate: {
    className:
      'bg-emerald-500/10 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20',
    Icon: PlayCircle,
    label: 'Réactiver',
  },
  revoke: {
    className:
      'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20',
    Icon: Ban,
    label: 'Révoquer',
  },
}

type Props = Omit<ComponentProps<'button'>, 'className' | 'children'> & {
  variant: ActionVariant
  label?: ReactNode
  loading?: boolean
  className?: string
}

export default function ActionButton({
  variant,
  label,
  loading = false,
  disabled,
  ...rest
}: Props) {
  const cfg = VARIANT_CFG[variant]
  const Icon = cfg.Icon
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 font-sans text-xs font-medium transition-all disabled:opacity-50 ${cfg.className}`}
      {...rest}
    >
      <Icon size={14} aria-hidden />
      <span>{loading ? '…' : (label ?? cfg.label)}</span>
    </button>
  )
}

export function DetailsLink({
  href,
  label = 'Détails',
}: {
  href: string
  label?: string
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 font-sans text-xs text-white/40 transition-all hover:text-bt-cyan"
    >
      {label}
      <ArrowRight size={12} aria-hidden />
    </Link>
  )
}

export function NoActionText({ text = 'Aucune action' }: { text?: string }) {
  return (
    <span className="font-sans text-xs italic text-white/30">{text}</span>
  )
}
