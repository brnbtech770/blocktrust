"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

const cardStyle = {
  maxWidth: "420px",
  margin: "0 auto",
  padding: "24px",
  border: "1px solid rgba(189,167,107,0.2)",
  borderRadius: "12px",
  backgroundColor: "rgba(0,34,68,0.85)",
};

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
        <div style={cardStyle}>
          <h1 style={{ fontFamily: "var(--font-syne), sans-serif", color: "#BDA76B", marginBottom: "1rem" }}>
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
      <div style={cardStyle}>
        <h1
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            color: "#BDA76B",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
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
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(189,167,107,0.3)",
                backgroundColor: "#001a33",
                color: "#e8eaf0",
              }}
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
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "8px",
                border: "1px solid rgba(189,167,107,0.3)",
                backgroundColor: "#001a33",
                color: "#e8eaf0",
              }}
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
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              backgroundColor: "#BDA76B",
              color: "#001a33",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
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
