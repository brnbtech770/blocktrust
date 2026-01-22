import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import CreateCertificateForm from "./CreateCertificateForm";

export const metadata = {
  title: "Créer un certificat - BlockTrust",
  description: "Créez votre certificat BlockTrust",
};

export default async function CreateCertificatePage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: {
      id: true,
      status: true,
      plan: true,
    },
  });

  if (!user) {
    redirect("/login");
  }

  if (user.status === "SUSPENDED") {
    redirect("/mon-espace?error=suspended");
  }

  return (
    <div className="min-h-screen bg-gray-900">
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <a
                href="/mon-espace"
                className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Retour
              </a>
            </div>
            <h1 className="text-white font-medium">Créer un certificat</h1>
            <div className="w-20"></div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">
            Nouvelle entité à certifier
          </h2>
          <CreateCertificateForm userId={user.id} />
        </div>
      </main>
    </div>
  );
}
