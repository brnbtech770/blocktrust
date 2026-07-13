"use client";

import { useState } from "react";
import { ShieldAlert } from "lucide-react";

type Props = {
  email: string;
};

export default function AccountSuspendedBanner({ email }: Props) {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleResend() {
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
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      role="alert"
      className="border-b border-[#E05252]/40 bg-[#E05252]/15 px-4 py-3 text-sm text-white/90"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 leading-relaxed">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[#E05252]" aria-hidden />
          <span>
            Compte suspendu. Confirmez votre email pour le réactiver. Certaines fonctionnalités
            sont bloquées tant que votre email n&apos;est pas vérifié.
          </span>
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="shrink-0 rounded-lg border border-[#E05252]/50 px-3 py-2 text-xs font-semibold text-[#E05252] transition-colors hover:bg-[#E05252]/15 disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Renvoyer l'email"}
        </button>
      </div>
      {message ? <p className="mx-auto mt-2 max-w-7xl text-xs text-[#1DB87E]">{message}</p> : null}
      {error ? <p className="mx-auto mt-2 max-w-7xl text-xs text-[#E05252]">{error}</p> : null}
    </div>
  );
}
