"use client";

import { useState } from "react";
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
          Mot de passe oublié
        </h1>
        {sent ? (
          <p style={{ color: "#e8eaf0" }}>
            Si cet email existe, un lien vous a été envoyé.
          </p>
        ) : (
          <form onSubmit={handleSubmit}>
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
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        )}
        <p style={{ color: "rgba(232,234,240,0.5)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          <Link href="/auth/signin" style={{ color: "#BDA76B" }}>
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
