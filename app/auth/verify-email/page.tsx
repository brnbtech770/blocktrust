import Link from "next/link";
import { redirect } from "next/navigation";
import AuthMinimalHeader from "@/app/components/AuthMinimalHeader";
import { verifyEmailByToken } from "@/lib/email-verification";

type PageProps = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: PageProps) {
  const { token } = await searchParams;
  const result = await verifyEmailByToken(token);

  if (result.ok) {
    redirect("/auth/signin?verified=1");
  }

  const isExpired = result.reason === "expired";

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <AuthMinimalHeader backHref="/auth/signin" />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-8 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
          <h1 className="font-syne mb-4 text-2xl font-bold text-white">
            {isExpired ? "Lien expiré" : "Lien invalide"}
          </h1>
          <p className="mb-4 text-sm leading-relaxed text-white/75">
            {isExpired
              ? "Ce lien de confirmation a expiré (validité 24 h). Demandez un nouvel email."
              : "Ce lien de confirmation est invalide ou a déjà été utilisé."}
          </p>
          <Link
            href="/auth/verify-email-sent"
            className="mb-3 inline-flex w-full items-center justify-center rounded-lg py-3 font-bold transition-all hover:brightness-110"
            style={{ background: "#00d4ff", color: "#0a1628" }}
          >
            Renvoyer un email
          </Link>
          <p className="text-sm text-white/55">
            <Link href="/auth/signin" className="text-[#00d4ff] hover:underline">
              Retour à la connexion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
