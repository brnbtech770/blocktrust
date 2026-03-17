"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
            color: "#fff",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          Créer un compte
        </h1>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Prénom</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Nom</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} />
            {fieldError.password && <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>{fieldError.password}</p>}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Confirmer le mot de passe</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} />
            {fieldError.confirmPassword && <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>{fieldError.confirmPassword}</p>}
          </div>
          {error && <p style={{ color: "#E05252", marginBottom: "1rem" }}>{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 rounded-lg font-bold transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: "#00d4ff", color: "#0a1628" }}>
            {loading ? "Création..." : "Créer mon compte"}
          </button>
        </form>
        <p style={{ color: "var(--bt-muted)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
          Déjà un compte ?{" "}
          <Link href="/auth/signin" className="text-[#00d4ff] hover:underline">
            Se connecter
          </Link>
        </p>
      </div>
    </div>
  );
}
