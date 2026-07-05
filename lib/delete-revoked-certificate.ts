import { prisma } from '@/app/lib/db'
import { writeSecurityAuditLog } from '@/lib/security-audit'

export type DeleteRevokedCertificateResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/** Supprime définitivement un certificat révoqué (ownership utilisateur). */
export async function deleteRevokedCertificate(
  userId: string,
  certificateId: string,
): Promise<DeleteRevokedCertificateResult> {
  const certificate = await prisma.certificate.findFirst({
    where: {
      id: certificateId,
      entity: { userId },
    },
    select: { id: true, status: true },
  })

  if (!certificate) {
    return { ok: false, status: 404, error: 'Certificat introuvable' }
  }

  if (certificate.status !== 'REVOKED') {
    return {
      ok: false,
      status: 400,
      error:
        "Seuls les certificats révoqués peuvent être supprimés. Révoquez d'abord le certificat.",
    }
  }

  await prisma.certificate.delete({ where: { id: certificate.id } })

  return { ok: true }
}

/** Suppression admin — tout certificat REVOKED (jamais ACTIVE/ANCHORED). */
export async function deleteRevokedCertificateAsAdmin(
  adminUserId: string,
  certificateId: string,
): Promise<DeleteRevokedCertificateResult> {
  const certificate = await prisma.certificate.findUnique({
    where: { id: certificateId },
    select: {
      id: true,
      status: true,
      entity: { select: { userId: true } },
    },
  })

  if (!certificate) {
    return { ok: false, status: 404, error: 'Certificat introuvable' }
  }

  if (certificate.status !== 'REVOKED') {
    return {
      ok: false,
      status: 400,
      error:
        'Seuls les certificats révoqués peuvent être supprimés. Révoquez le certificat avant suppression.',
    }
  }

  await prisma.certificate.delete({ where: { id: certificate.id } })

  await writeSecurityAuditLog({
    action: 'ADMIN_CERTIFICATE_DELETED',
    userId: adminUserId,
    resource: 'certificate',
    resourceId: certificateId,
    metadata: {
      certId: certificateId,
      ownerId: certificate.entity.userId,
      adminId: adminUserId,
    },
  })

  return { ok: true }
}
