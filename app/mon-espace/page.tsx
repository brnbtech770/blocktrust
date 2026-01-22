import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import ClientDashboard from "./ClientDashboard";
export const metadata = {
  title: "Mon Espace - BlockTrust",
  description: "Gérez vos certificats BlockTrust",
};
export default async function MonEspacePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    redirect("/login");
  }
  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      entities: {
        include: {
          certificates: {
            include: {
              signatures: {
                where: { revoked: false },
                orderBy: { issuedAt: "desc" },
                take: 1,
              },
            },
            orderBy: { issuedAt: "desc" },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!user) {
    redirect("/login");
  }
  const totalCertificates = user.entities.reduce(
    (acc, entity) => acc + entity.certificates.length,
    0
  );
  const activeCertificates = user.entities.reduce(
    (acc, entity) =>
      acc + entity.certificates.filter((c) => c.status === "ACTIVE").length,
    0
  );
  let totalVerifications = 0;
  try {
    const certificateIds = user.entities.flatMap((e) =>
      e.certificates.map((c) => c.id)
    );
    
    if (certificateIds.length > 0) {
      totalVerifications = await prisma.verification.count({
        where: {
          certificateId: { in: certificateIds },
        },
      });
    }
  } catch {
    totalVerifications = 0;
  }

  const userData = {
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    status: user.status,
    company: user.company,
    createdAt: user.createdAt.toISOString(),
  };

  const entitiesData = user.entities.map((entity) => ({
    id: entity.id,
    entityType: entity.entityType,
    legalName: entity.legalName,
    firstName: entity.firstName,
    lastName: entity.lastName,
    email: entity.email,
    website: entity.website,
    kycStatus: entity.kycStatus,
    validationLevel: entity.validationLevel,
    createdAt: entity.createdAt.toISOString(),
    certificates: entity.certificates.map((cert) => ({
      id: cert.id,
      status: cert.status,
      level: cert.level,
      issuedAt: cert.issuedAt.toISOString(),
      tokenId: cert.tokenId,
      signature: cert.signatures[0]
        ? {
            jti: cert.signatures[0].jti,
            ctxHash: cert.signatures[0].ctxHash,
            expiresAt: cert.signatures[0].expiresAt.toISOString(),
          }
        : null,
    })),
  }));

  const stats = {
    totalCertificates,
    activeCertificates,
    totalVerifications,
    totalEntities: user.entities.length,
  };

  return (
    <ClientDashboard
      user={userData}
      entities={entitiesData}
      stats={stats}
    />
  );
}
