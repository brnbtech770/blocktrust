"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email: email.trim(),
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.ok) {
        router.push(callbackUrl);
        return;
      }
      setError(result?.error || "Email ou mot de passe incorrect.");
    } catch {
      setError("Erreur de connexion.");
    } finally {
      setLoading(false);
    }
  }

  function handleGoogle() {
    signIn("google", { callbackUrl });
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
          Connexion
        </h1>

        <button
          type="button"
          onClick={handleGoogle}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "8px",
            border: "1px solid rgba(189,167,107,0.4)",
            backgroundColor: "transparent",
            color: "#e8eaf0",
            cursor: "pointer",
            marginBottom: "1rem",
          }}
        >
          Continuer avec Google
        </button>

        <p
          style={{
            color: "rgba(232,234,240,0.5)",
            textAlign: "center",
            marginBottom: "1rem",
            fontSize: "0.875rem",
          }}
        >
          ou
        </p>

        <form onSubmit={handleCredentialsSubmit}>
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
            <p style={{ marginTop: "4px", fontSize: "0.875rem" }}>
              <Link href="/auth/forgot-password" style={{ color: "#BDA76B" }}>
                Mot de passe oublié ?
              </Link>
            </p>
          </div>
          {(error || errorParam) && (
            <p style={{ color: "#E05252", marginBottom: "1rem" }}>
              {error || (errorParam === "CredentialsSignin" && "Email ou mot de passe incorrect.") || errorParam}
            </p>
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
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ color: "rgba(232,234,240,0.5)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          Pas encore de compte ?{" "}
          <Link href="/auth/register" style={{ color: "#BDA76B" }}>
            Créer un compte
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={<div style={{ padding: "48px 16px", color: "#e8eaf0", textAlign: "center" }}>Chargement...</div>}>
      <SignInContent />
    </Suspense>
  );
}
