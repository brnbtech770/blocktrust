"use client";

import { useState } from "react";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setSent(false);
    try {
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-12">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" withText={true} href="/" />
      </div>
      <div className="mx-auto max-w-[420px] rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-gold/30">
        <h1 className="font-syne mb-6 text-2xl font-bold tracking-tight text-white">
          Mot de passe oublié
        </h1>
        {sent ? (
          <p className="text-white/80">Si cet email existe, un lien vous a été envoyé.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="mb-1 block text-sm text-white/60">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-bt-cyan focus:outline-none focus:ring-2 focus:ring-bt-cyan/20"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-bt-cyan py-3 font-bold text-navy transition hover:bg-bt-cyan/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        )}
        <p className="mt-6 text-sm text-white/50">
          <Link href="/auth/signin" className="text-bt-cyan hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
