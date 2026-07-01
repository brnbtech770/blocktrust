import type { Metadata } from "next";
import { auth } from "@/app/lib/auth-server";
import VerifyPageClient from "@/app/components/verify/VerifyPageClient";
import { prefetchVerifyCertPayload } from "@/lib/verify-page-prefetch";

export const metadata: Metadata = {
  title: "Vérifier un badge — BLOCKTRUST™",
  description:
    "Vérifiez l'authenticité d'un badge ou certificat BLOCKTRUST™ : scan QR, lien public ou identifiant de badge.",
  alternates: {
    canonical: "/verify",
  },
  openGraph: {
    title: "Vérifier un badge — BLOCKTRUST™",
    description:
      "Contrôle public d'un certificat BLOCKTRUST™ avant de faire confiance à un interlocuteur.",
    url: "/verify",
  },
};

type VerifyPageProps = {
  searchParams: Promise<{
    certId?: string;
    token?: string;
    vt?: string;
  }>;
};

/** Page publique de vérification — shell RSC + îlots client. */
export default async function VerifyPage({ searchParams }: VerifyPageProps) {
  const sp = await searchParams;
  const certId = sp.certId?.trim();
  const session = await auth().catch(() => null);
  const sessionUser = session?.user
    ? {
        id: session.user.id,
        email: session.user.email ?? null,
        name: session.user.name ?? null,
      }
    : null;
  const initialCertData = certId ? await prefetchVerifyCertPayload(certId) : null;

  return (
    <VerifyPageClient
      initialCertId={certId}
      initialCertData={initialCertData}
      sessionUser={sessionUser}
    />
  );
}
