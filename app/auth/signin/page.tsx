"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";

const cardStyle: React.CSSProperties = {
  maxWidth: "420px",
  margin: "0 auto",
  padding: "32px",
  border: "1px solid var(--bt-border)",
  borderRadius: "16px",
  backgroundColor: "rgba(13,31,60,0.9)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid var(--bt-border)",
  backgroundColor: "rgba(6,14,26,0.8)",
  color: "#fff",
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
            color: "#fff",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          Connexion
        </h1>

        <button
          type="button"
          onClick={handleGoogle}
          className="w-full py-3 rounded-lg border text-white transition-colors mb-4"
          style={{
            background: "rgba(255,255,255,0.05)",
            borderColor: "rgba(255,255,255,0.15)",
          }}
        >
          Continuer avec Google
        </button>

        <p style={{ color: "var(--bt-muted)", textAlign: "center", marginBottom: "1rem", fontSize: "0.875rem" }}>
          ou
        </p>

        <form onSubmit={handleCredentialsSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Mot de passe</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]"
              style={inputStyle}
            />
            <p style={{ marginTop: "4px", fontSize: "0.875rem" }}>
              <Link href="/auth/forgot-password" className="text-[#00d4ff] hover:underline">
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
            className="w-full py-3 rounded-lg font-bold transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "#00d4ff", color: "#0a1628" }}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ color: "var(--bt-muted)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="text-[#00d4ff] hover:underline">
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
