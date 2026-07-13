"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import AuthMinimalHeader from "@/app/components/AuthMinimalHeader";

export default function VerifyEmailSentClient() {
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
    if (!email) {
      setError("Adresse email introuvable. Recommencez l'inscription.");
      return;
    }
    setLoading(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (res.ok) {
        setMessage(data.message ?? "Email renvoyé.");
      } else {
        setError(data.message ?? data.error ?? "Impossible de renvoyer l'email.");
      }
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <AuthMinimalHeader backHref="/auth/signin" />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-8 sm:px-6">
        <div className="rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
          <h1 className="font-syne mb-4 text-2xl font-bold text-white">Vérifiez votre email</h1>
          <p className="mb-4 text-sm leading-relaxed text-white/75">
            Un email de confirmation a été envoyé à{" "}
            <span className="font-mono text-[#00d4ff]">{email || "votre adresse"}</span>.
            Vérifiez votre boîte de réception (et les spams).
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={loading || !email}
            className="mb-4 w-full rounded-lg py-3 font-bold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            style={{ background: "#00d4ff", color: "#0a1628" }}
          >
            {loading ? "Envoi…" : "Renvoyer l'email de confirmation"}
          </button>
          {message ? (
            <p role="status" className="mb-3 text-sm text-[#1DB87E]">
              {message}
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="mb-3 text-sm text-[#E05252]">
              {error}
            </p>
          ) : null}
          <p className="text-sm text-white/55">
            Déjà confirmé ?{" "}
            <Link href="/auth/signin" className="text-[#00d4ff] hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
