"use client";

import { useState } from "react";
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
            color: "#fff",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          Mot de passe oublié
        </h1>
        {sent ? (
          <p style={{ color: "var(--bt-text)" }}>Si cet email existe, un lien vous a été envoyé.</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "1rem" }}>
              <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} />
            </div>
            <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: "#00d4ff", color: "#0a1628" }}>
              {loading ? "Envoi..." : "Envoyer le lien"}
            </button>
          </form>
        )}
        <p style={{ color: "var(--bt-muted)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          <Link href="/auth/signin" className="text-[#00d4ff] hover:underline">
            Retour à la connexion
          </Link>
        </p>
      </div>
    </div>
  );
}
