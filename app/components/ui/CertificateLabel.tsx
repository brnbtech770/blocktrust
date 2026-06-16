// app/components/ui/CertificateLabel.tsx
// Libellé certificat lisible + tooltip code complet
// ============================================================

import {
  formatCertificateLabel,
  type EntityLikeForLabel,
  type FormatCertificateLabelResult,
} from '@/lib/format-certificate-label'

export type CertificateLabelProps = {
  id: string
  publicId?: string | null
  entity?: EntityLikeForLabel | null
  displayName?: string | null
  className?: string
  mono?: boolean
}

export function getCertificateLabelProps(
  props: CertificateLabelProps,
): FormatCertificateLabelResult {
  return formatCertificateLabel({
    id: props.id,
    publicId: props.publicId,
    entity: props.entity,
    displayName: props.displayName,
  })
}

export default function CertificateLabel({
  id,
  publicId,
  entity,
  displayName,
  className = '',
  mono = true,
}: CertificateLabelProps) {
  const { label, fullCode } = getCertificateLabelProps({
    id,
    publicId,
    entity,
    displayName,
  })

  return (
    <span
      title={fullCode}
      className={`${mono ? 'font-mono text-xs' : 'text-sm'} ${className}`.trim()}
    >
      {label}
    </span>
  )
}
