// app/components/admin/StatusBadge.tsx
// Badge statut unifié (certificats / kyc / trust / user).
// ============================================================

export type StatusBadgeType = 'certificate' | 'kyc' | 'trust' | 'user'

type Tone =
  | 'pending'
  | 'active'
  | 'suspended'
  | 'revoked'
  | 'verified'
  | 'rejected'
  | 'neutral'

const TONE_CLASSES: Record<Tone, string> = {
  pending:   'bg-amber-500/15    text-amber-400    border-amber-500/30',
  active:    'bg-bt-cyan/15      text-bt-cyan      border-bt-cyan/30',
  verified:  'bg-emerald-500/15  text-emerald-400  border-emerald-500/30',
  suspended: 'bg-amber-500/15    text-amber-400    border-amber-500/30',
  revoked:   'bg-red-500/15      text-red-400      border-red-500/30',
  rejected:  'bg-red-500/15      text-red-400      border-red-500/30',
  neutral:   'bg-white/10        text-white/60     border-white/20',
}

function toneFor(status: string, type: StatusBadgeType): Tone {
  const s = status.toUpperCase()

  if (type === 'certificate') {
    if (s === 'PENDING') return 'pending'
    if (s === 'ACTIVE' || s === 'ANCHORED') return 'active'
    if (s === 'SUSPENDED') return 'suspended'
    if (s === 'REVOKED' || s === 'EXPIRED') return 'revoked'
    return 'neutral'
  }

  if (type === 'kyc') {
    if (s === 'VERIFIED') return 'verified'
    if (s === 'REJECTED') return 'rejected'
    if (s === 'REQUIRES_INPUT' || s === 'PROCESSING') return 'pending'
    return 'pending' // PENDING par défaut
  }

  if (type === 'trust') {
    if (s === 'ADMIN_VERIFIED' || s === 'VERIFIED') return 'verified'
    if (s === 'REJECTED') return 'rejected'
    if (s === 'PENDING_ADMIN' || s === 'PENDING') return 'pending'
    return 'neutral'
  }

  // user
  if (s === 'ACTIVE' || s === 'ACTIF') return 'verified'
  if (s === 'PENDING') return 'pending'
  if (s === 'SUSPENDED' || s === 'BANNED') return 'revoked'
  return 'neutral'
}

export default function StatusBadge({
  status,
  type,
  className = '',
}: {
  status: string
  type: StatusBadgeType
  className?: string
}) {
  const tone = TONE_CLASSES[toneFor(status, type)]
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-xs uppercase tracking-wider ${tone} ${className}`.trim()}
    >
      {status}
    </span>
  )
}
