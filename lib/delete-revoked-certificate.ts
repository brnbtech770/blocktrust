import { prisma } from '@/app/lib/db'

export type DeleteRevokedCertificateResult =
  | { ok: true }
  | { ok: false; status: number; error: string }

/** Supprime définitivement un certificat révoqué (hard delete + cascades Prisma). */
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
        'Seuls les certificats révoqués peuvent être supprimés. Révoquez d\'abord le certificat.',
    }
  }

  await prisma.certificate.delete({ where: { id: certificate.id } })

  return { ok: true }
}
