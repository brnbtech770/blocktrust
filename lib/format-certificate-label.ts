/**
 * © 2026 BRNB TECH — BLOCKTRUST™
 * Libellés certificat lisibles — nom + suffixe (…4 derniers caractères).
 */
import { prisma } from '@/app/lib/db'

export type EntityLikeForLabel = {
  entityType?: string | null
  firstName?: string | null
  lastName?: string | null
  legalName?: string | null
  tradeName?: string | null
  email?: string | null
  /** Nom compte utilisateur (fallback) */
  name?: string | null
}

export interface FormatCertificateLabelInput {
  id: string
  publicId?: string | null
  entity?: EntityLikeForLabel | null
  /** Nom déjà résolu (prioritaire sur entity) */
  displayName?: string | null
}

export interface FormatCertificateLabelResult {
  /** Ex. « Olivier BRNB (…db33) » */
  label: string
  /** Code complet pour tooltip / copie admin */
  fullCode: string
  /** Suffixe seul « …db33 » */
  suffix: string
  displayName: string | null
}

const ENTITY_SELECT = {
  entityType: true,
  firstName: true,
  lastName: true,
  legalName: true,
  tradeName: true,
  email: true,
} as const

/** Nom affichable d'une entité (particulier ou entreprise). */
export function entityDisplayNameFromEntity(
  entity?: EntityLikeForLabel | null,
): string | null {
  if (!entity) return null
  if (entity.name?.trim()) return entity.name.trim()
  if (entity.entityType === 'INDIVIDUAL') {
    const individual = [entity.firstName, entity.lastName]
      .filter(Boolean)
      .join(' ')
      .trim()
    if (individual) return individual
  }
  const business = entity.legalName?.trim() || entity.tradeName?.trim()
  if (business) return business
  return entity.email?.trim() || null
}

export function certificateFullCode(input: {
  id: string
  publicId?: string | null
}): string {
  return input.publicId?.trim() || input.id
}

export function certificateCodeSuffix(input: {
  id: string
  publicId?: string | null
}): string {
  const code = certificateFullCode(input)
  if (code.length <= 4) return code
  return `…${code.slice(-4)}`
}

/**
 * Format standard : « Prénom Nom (…abcd) » ou « email@… (…abcd) ».
 * Le code complet est dans `fullCode` (tooltip).
 */
export function formatCertificateLabel(
  input: FormatCertificateLabelInput,
): FormatCertificateLabelResult {
  const fullCode = certificateFullCode(input)
  const suffix = certificateCodeSuffix(input)
  const displayName =
    input.displayName?.trim() || entityDisplayNameFromEntity(input.entity)

  if (displayName) {
    return { label: `${displayName} (${suffix})`, fullCode, suffix, displayName }
  }
  if (input.entity?.email?.trim()) {
    return {
      label: `${input.entity.email.trim()} (${suffix})`,
      fullCode,
      suffix,
      displayName: null,
    }
  }
  return { label: suffix, fullCode, suffix, displayName: null }
}

/** Charge certificat + entité et retourne le libellé formaté. */
export async function fetchCertificateLabel(
  certificateId: string,
): Promise<FormatCertificateLabelResult | null> {
  const cert = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      publicId: true,
      entity: { select: ENTITY_SELECT },
    },
  })
  if (!cert) return null
  return formatCertificateLabel({
    id: cert.id,
    publicId: cert.publicId,
    entity: cert.entity,
  })
}

/** Libellé utilisateur pour alertes sans certificat (TrustScore, etc.). */
export function formatUserLabel(user: {
  id: string
  name?: string | null
  email?: string | null
}): string {
  const name = user.name?.trim()
  if (name) return name
  const email = user.email?.trim()
  if (email) return email
  return `…${user.id.slice(-4)}`
}

/** Remplace les UUID certificat/entité dans une description legacy par des libellés. */
export function replaceCertificateIdsInText(
  text: string,
  certLabels: Map<string, string>,
): string {
  let out = text
  for (const [id, label] of certLabels) {
    out = out.split(id).join(label)
    if (id.length > 8) {
      out = out.split(id.slice(0, 8)).join(label)
    }
  }
  return out
}
