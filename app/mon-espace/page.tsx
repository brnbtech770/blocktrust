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
