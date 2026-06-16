// app/components/admin/IdCell.tsx
// ID certificat : libellé lisible + tooltip code complet.
// ============================================================

import CertificateLabel from '@/app/components/ui/CertificateLabel'
import type { EntityLikeForLabel } from '@/lib/format-certificate-label'

export default function IdCell({
  id,
  display,
  publicId,
  entity,
}: {
  id: string
  /** @deprecated Préférer publicId + entity pour formatCertificateLabel */
  display?: string
  publicId?: string | null
  entity?: EntityLikeForLabel | null
}) {
  if (publicId !== undefined || entity) {
    return (
      <CertificateLabel
        id={id}
        publicId={publicId ?? null}
        entity={entity}
        className="block max-w-[180px] truncate rounded bg-bt-cyan/5 px-2 py-1 text-bt-cyan/70"
      />
    )
  }

  const label = display ?? id
  return (
    <code
      title={id}
      className="block max-w-[100px] truncate rounded bg-bt-cyan/5 px-2 py-1 font-mono text-xs text-bt-cyan/70"
    >
      {label}
    </code>
  )
}
