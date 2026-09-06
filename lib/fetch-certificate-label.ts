/**
 * Chargement serveur du libellé certificat — Prisma (ne pas importer depuis un client).
 */
import { prisma } from "@/app/lib/db";
import {
  formatCertificateLabel,
  type FormatCertificateLabelResult,
} from "@/lib/format-certificate-label";

const ENTITY_SELECT = {
  entityType: true,
  firstName: true,
  lastName: true,
  legalName: true,
  tradeName: true,
  email: true,
} as const;

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
  });
  if (!cert) return null;
  return formatCertificateLabel({
    id: cert.id,
    publicId: cert.publicId,
    entity: cert.entity,
  });
}
