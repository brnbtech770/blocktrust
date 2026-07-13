"use client";

import { useState } from "react";
import { AlertTriangle } from "lucide-react";

type Props = {
  email: string;
};

export default function EmailVerificationBanner({ email }: Props) {
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
      role="status"
      className="border-b border-[#f59e0b]/35 bg-[#f59e0b]/12 px-4 py-3 text-sm text-white/85"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="flex items-start gap-2 leading-relaxed">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[#f59e0b]" aria-hidden />
          <span>
            Votre email n&apos;est pas encore confirmé. Certaines fonctionnalités seront limitées
            tant que votre email n&apos;est pas vérifié.
          </span>
        </p>
        <button
          type="button"
          onClick={handleResend}
          disabled={loading}
          className="shrink-0 rounded-lg border border-[#f59e0b]/50 px-3 py-2 text-xs font-semibold text-[#f59e0b] transition-colors hover:bg-[#f59e0b]/15 disabled:opacity-60"
        >
          {loading ? "Envoi…" : "Renvoyer l'email"}
        </button>
      </div>
      {message ? <p className="mx-auto mt-2 max-w-7xl text-xs text-[#1DB87E]">{message}</p> : null}
      {error ? <p className="mx-auto mt-2 max-w-7xl text-xs text-[#E05252]">{error}</p> : null}
    </div>
  );
}
