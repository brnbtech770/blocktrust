// types/dashboard.ts
// Types partagés pour le dashboard BlockTrust
// ============================================================

export type CertificateStatus =
  | 'PENDING'
  | 'ACTIVE'
  | 'ANCHORED'
  | 'SUSPENDED'
  | 'REVOKED'
  | 'EXPIRED'

export interface CertificateTableItem {
  id: string
  publicId: string | null
  status: CertificateStatus
  level: string
  issuedAt: string
  verificationCount: number
  entity: {
    id: string
    entityType: string
    legalName: string | null
    tradeName: string | null
    firstName: string | null
    lastName: string | null
    email: string
  }
}

export type VerificationResultType =
  | 'VALID'
  | 'FRAUD_ALERT'
  | 'EXPIRED'
  | 'REVOKED'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'QR_EXPIRED'
  | 'SUSPICIOUS_VOLUME'
  | 'SUSPICIOUS_SCANNING'

export interface VerificationEvent {
  id: string
  certificateId: string | null
  certificatePublicId: string | null
  /** Libellé lisible « Nom (…abcd) » */
  certificateLabel?: string | null
  /** Code complet (tooltip) */
  certificateFullCode?: string | null
  result: VerificationResultType
  verifiedAt: string
  country?: string | null
}

export interface DashboardStats {
  activeCerts: number
  /** Nombre de contacts (entités). */
  contacts: number
  verifications7d: number
  blockchainStatus: 'connected' | 'pending' | 'unavailable'
  fraudAlerts: number
  /** Lien PolygonScan du dernier certificat ancré (si disponible). */
  polygonExplorerUrl?: string | null
}
