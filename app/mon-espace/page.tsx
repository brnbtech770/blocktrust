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
    })),
  }));

  const stats = {
    totalCertificates,
    activeCertificates,
    totalVerifications,
    totalEntities: user.entities.length,
  };

  return <ClientDashboard user={userData} entities={entitiesData} stats={stats} />;
}
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";

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
          certificates: true,
        },
      },
    },
  });

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Mon Espace</h1>
        <p className="text-gray-600 mb-8">Bienvenue, {user.name || user.email}</p>

        <div className="bg-white rounded-xl shadow p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Mes Certificats</h2>

          {user.entities.length === 0 ? (
            <p className="text-gray-500">Aucune entité enregistrée.</p>
          ) : (
            <div className="space-y-4">
              {user.entities.map((entity) => (
                <div key={entity.id} className="border rounded-lg p-4">
                  <h3 className="font-medium">
                    {entity.legalName || `${entity.firstName} ${entity.lastName}`}
                  </h3>
                  <p className="text-sm text-gray-500">{entity.email}</p>
                  <p className="text-sm mt-2">
                    Certificats : {entity.certificates.length}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <a
          href="/mon-espace/nouveau-certificat"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700"
        >
          Demander un certificat
        </a>
      </div>
    </div>
  );
}
