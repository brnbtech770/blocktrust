import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CertificateManagement from "./CertificateManagement";

const ADMIN_EMAILS = ["brnbtech@gmail.com"];

export const metadata = {
  title: "Gestion des certificats - BlockTrust Admin",
};

export default async function CertificatesPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  if (!ADMIN_EMAILS.includes(session.user.email.toLowerCase())) {
    redirect("/mon-espace");
  }

  const certificates = await prisma.certificate.findMany({
    include: {
      entity: {
        include: {
          user: {
            select: {
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { issuedAt: "desc" },
  });

  const certificatesData = certificates.map((cert) => ({
    id: cert.id,
    status: cert.status,
    level: cert.level,
    issuedAt: cert.issuedAt.toISOString(),
    entity: {
      id: cert.entity.id,
      entityType: cert.entity.entityType,
      legalName: cert.entity.legalName,
      firstName: cert.entity.firstName,
      lastName: cert.entity.lastName,
      email: cert.entity.email,
      siret: cert.entity.siret,
      kycStatus: cert.entity.kycStatus,
    },
    user: {
      name: cert.entity.user.name,
      email: cert.entity.user.email,
    },
  }));

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold text-white mb-6">
        Gestion des certificats
      </h1>
      <CertificateManagement certificates={certificatesData} />
    </div>
  );
}
