"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";

const cardStyle = {
  maxWidth: "420px",
  margin: "0 auto",
  padding: "24px",
  border: "1px solid rgba(189,167,107,0.2)",
  borderRadius: "12px",
  backgroundColor: "rgba(0,34,68,0.85)",
};

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const err: Record<string, string> = {};
    if (password !== confirmPassword) {
      err.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    if (password.length < 12) {
      err.password = "Minimum 12 caractères.";
    }
    if (!/[A-Z]/.test(password)) {
      err.password = (err.password || "") + " Au moins 1 majuscule.";
    }
    if (!/[0-9]/.test(password)) {
      err.password = (err.password || "") + " Au moins 1 chiffre.";
    }
    if (!/[^a-zA-Z0-9]/.test(password)) {
      err.password = (err.password || "") + " Au moins 1 caractère spécial.";
    }
    setFieldError(err);
    return Object.keys(err).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setFieldError({});
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
        }),
      });
      const data = await res.json();

      if (res.status === 201) {
        await signIn("credentials", {
          email: email.trim(),
          password,
          callbackUrl: "/dashboard",
        });
        router.push("/dashboard");
        return;
      }
      setError(data.error || "Une erreur est survenue.");
    } catch {
      setError("Erreur réseau. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: "48px 16px" }}>
      <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
        <Logo size="lg" withText={true} href="/" />
      </div>
      <div style={cardStyle}>
        <h1
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            color: "#BDA76B",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          Créer un compte
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.8)", display: "block", marginBottom: "4px" }}>
              Prénom
            </label>
            <input
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
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
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.8)", display: "block", marginBottom: "4px" }}>
              Nom
            </label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
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
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.8)", display: "block", marginBottom: "4px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.8)", display: "block", marginBottom: "4px" }}>
              Mot de passe
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
              <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>
                {fieldError.password}
              </p>
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
          {error && (
            <p style={{ color: "#E05252", marginBottom: "1rem" }}>{error}</p>
          )}
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
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <p style={{ color: "rgba(232,234,240,0.5)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          Déjà un compte ?{" "}
          <Link href="/auth/signin" style={{ color: "#BDA76B" }}>
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
