"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";

const cardClass =
  "mx-auto max-w-[420px] rounded-xl border border-gold/20 bg-white/5 p-6 backdrop-blur-sm transition-all hover:border-gold/40";

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [valid, setValid] = useState<boolean | null>(null);
  const [reason, setReason] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      setValid(false);
      setReason("invalid");
      return;
    }
    fetch(`/api/auth/reset-password?token=${encodeURIComponent(token)}`)
      .then((res) => res.json())
      .then((data) => {
        setValid(data.valid === true);
        setReason(data.reason ?? null);
      })
      .catch(() => {
        setValid(false);
        setReason("invalid");
      });
  }, [token]);

  function validate(): boolean {
    const err: Record<string, string> = {};
    if (password.length < 12) err.password = "Minimum 12 caractères.";
    if (!/[A-Z]/.test(password)) err.password = (err.password || "") + " Au moins 1 majuscule.";
    if (!/[0-9]/.test(password)) err.password = (err.password || "") + " Au moins 1 chiffre.";
    if (!/[^a-zA-Z0-9]/.test(password)) err.password = (err.password || "") + " Au moins 1 caractère spécial.";
    if (password !== confirmPassword) err.confirmPassword = "Les mots de passe ne correspondent pas.";
    setFieldError(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError({});
    if (!validate() || !token) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push("/auth/signin");
        return;
      }
      setError(data.error || "Une erreur est survenue.");
    } catch {
      setError("Erreur réseau.");
    } finally {
      setLoading(false);
    }
  }

  if (valid === null) {
    return (
      <div style={{ padding: "48px 16px", color: "#e8eaf0", textAlign: "center" }}>
        Vérification du lien...
      </div>
    );
  }

  if (!valid) {
    return (
      <div style={{ padding: "48px 16px" }}>
        <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
          <Logo size="lg" withText={true} href="/" />
        </div>
        <div className={cardClass}>
          <h1 className="font-syne mb-4 text-xl font-bold tracking-tight text-gold">
            Lien invalide ou expiré
          </h1>
          <p style={{ color: "#e8eaf0", marginBottom: "1rem" }}>
            {reason === "expired"
              ? "Ce lien a expiré. Demandez un nouveau lien."
              : "Ce lien n'est pas valide."}
          </p>
          <Link href="/auth/forgot-password" style={{ color: "#BDA76B" }}>
            Demander un nouveau lien
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: "48px 16px" }}>
      <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
        <Logo size="lg" withText={true} href="/" />
      </div>
      <div className={cardClass}>
        <h1 className="font-syne mb-6 text-2xl font-bold tracking-tight text-gold">
          Nouveau mot de passe
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.8)", display: "block", marginBottom: "4px" }}>
              Nouveau mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gold/30 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            {fieldError.password && (
              <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>{fieldError.password}</p>
            )}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.8)", display: "block", marginBottom: "4px" }}>
              Confirmer le mot de passe
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              className="w-full rounded-lg border border-gold/30 bg-white/5 px-3 py-2.5 text-white placeholder:text-white/40 focus:border-gold/50 focus:outline-none focus:ring-2 focus:ring-gold/20"
            />
            {fieldError.confirmPassword && (
              <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>
                {fieldError.confirmPassword}
              </p>
            )}
          </div>
          {error && <p style={{ color: "#E05252", marginBottom: "1rem" }}>{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full cursor-pointer rounded-lg bg-gold py-3 font-semibold text-navy transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Enregistrement..." : "Réinitialiser le mot de passe"}
          </button>
        </form>
        <p style={{ color: "rgba(232,234,240,0.5)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          <Link href="/auth/signin" style={{ color: "#BDA76B" }}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div style={{ padding: "48px 16px", color: "#e8eaf0", textAlign: "center" }}>Chargement...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
