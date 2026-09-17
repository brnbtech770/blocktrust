// Payload d'ancrage public : statut + date, sans hash / contrat / bloc.
// Les détails techniques restent réservés aux réponses admin.
// ============================================================

const DEFAULT_CONTRACT_ADDRESS = '0x000000000000000000000000000000000000dEaD'

export type PublicAnchorPayload = {
  anchored: boolean
  anchoredAt: string | null
}

export type AdminAnchorDetails = {
  txHash: string | null
  blockNumber: number | null
  explorerUrl: string | null
  contractAddress: string | null
  anchoredAt: string | null
}

export type CertificateAnchorSource = {
  blockchainStatus?: string | null
  status?: string | null
  polygonTxHash?: string | null
  txHash?: string | null
  polygonBlock?: number | null
  blockNumber?: number | null
  polygonExplorerUrl?: string | null
  polygonAnchoredAt?: Date | string | null
  anchoredAt?: Date | string | null
  issuedAt?: Date | string | null
}

function toIso(value: Date | string | null | undefined): string | null {
  if (!value) return null
  const d = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(d.getTime())) return null
  return d.toISOString()
}

export function isCertificateAnchored(cert: CertificateAnchorSource | null | undefined): boolean {
  if (!cert) return false
  if (cert.blockchainStatus === 'NOT_ANCHORED') return false
  return (
    cert.blockchainStatus === 'ANCHORED' ||
    cert.status === 'ANCHORED' ||
    Boolean(cert.polygonTxHash || cert.txHash)
  )
}

export function publicAnchorPayload(
  cert: CertificateAnchorSource | null | undefined,
): PublicAnchorPayload {
  if (!isCertificateAnchored(cert)) {
    return { anchored: false, anchoredAt: null }
  }
  const anchoredAt =
    toIso(cert?.polygonAnchoredAt) ?? toIso(cert?.anchoredAt) ?? toIso(cert?.issuedAt)
  return { anchored: true, anchoredAt }
}

export function adminAnchorDetails(
  cert: CertificateAnchorSource | null | undefined,
): AdminAnchorDetails {
  const pub = publicAnchorPayload(cert)
  const contract = process.env.POLYGON_CONTRACT_ADDRESS?.trim()
  return {
    txHash: cert?.polygonTxHash ?? cert?.txHash ?? null,
    blockNumber: cert?.polygonBlock ?? cert?.blockNumber ?? null,
    explorerUrl: cert?.polygonExplorerUrl ?? null,
    contractAddress: contract && contract.length > 0 ? contract : DEFAULT_CONTRACT_ADDRESS,
    anchoredAt: pub.anchoredAt,
  }
}
