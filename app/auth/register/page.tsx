"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";

const cardClass =
  "mx-auto w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm sm:p-8";

const inputStyle: CSSProperties = {
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
  const [acceptCgu, setAcceptCgu] = useState(false);
  const formLoadedAtRef = useRef<number | null>(null);
  const websiteHoneypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    formLoadedAtRef.current = Date.now();
  }, []);

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
    if (!acceptCgu) {
      setError(
        "Vous devez accepter les conditions générales et la politique de confidentialité."
      );
      return;
    }
    if (!validate()) return;

    setLoading(true);
    try {
      const website = websiteHoneypotRef.current?.value ?? "";
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          password,
          website,
          formLoadedAt: formLoadedAtRef.current ?? Date.now(),
          acceptCgu: true,
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
    <div className="overflow-x-hidden px-4 py-8 sm:px-6 sm:py-12">
      <div style={{ margin: '0 auto 24px', display: 'flex', justifyContent: 'center' }}>
        <Logo size="lg" withText={true} href="/" />
      </div>
      <div className={cardClass}>
        <h1 className="font-syne mb-6 text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
          Créer un compte
        </h1>
        <div className="mb-6 p-4 bg-white/[0.03] border border-white/10 rounded-xl">
          <p className="text-white/70 text-xs text-center mb-3">
            Vous êtes à 3 étapes de votre badge certifié
          </p>
          <div className="flex items-center justify-center gap-4 text-xs">
            <span className="text-white/40">1. Créez votre compte</span>
            <span className="text-white/20" aria-hidden>→</span>
            <span className="text-white/40">2. Choisissez votre plan</span>
            <span className="text-white/20" aria-hidden>→</span>
            <span className="text-white/40">3. Vérifiez votre identité</span>
          </div>
        </div>
        <form onSubmit={handleSubmit} autoComplete="on">
          <input
            ref={websiteHoneypotRef}
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            style={{ display: "none" }}
          />
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Prénom</label>
            <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} autoComplete="given-name" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Nom</label>
            <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} autoComplete="family-name" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} autoComplete="email" />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Mot de passe</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} autoComplete="new-password" />
            {fieldError.password && <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>{fieldError.password}</p>}
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>Confirmer le mot de passe</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]" style={inputStyle} autoComplete="new-password" />
            {fieldError.confirmPassword && <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>{fieldError.confirmPassword}</p>}
          </div>
          <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm" style={{ color: "var(--bt-muted)" }}>
            <input
              type="checkbox"
              checked={acceptCgu}
              onChange={(e) => setAcceptCgu(e.target.checked)}
              className="mt-1 h-4 w-4 shrink-0 rounded border-white/20 bg-transparent accent-[#00d4ff]"
            />
            <span>
              J&apos;accepte les{" "}
              <Link href="/cgu" className="text-[#00d4ff] hover:underline" target="_blank" rel="noopener noreferrer">
                CGU
              </Link>{" "}
              et la{" "}
              <Link href="/privacy" className="text-[#00d4ff] hover:underline" target="_blank" rel="noopener noreferrer">
                Politique de confidentialité
              </Link>
              .
            </span>
          </label>
          {error && <p style={{ color: "#E05252", marginBottom: "1rem" }}>{error}</p>}
          <button type="submit" disabled={loading || !acceptCgu} className="w-full py-3 rounded-lg font-bold transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed" style={{ background: "#00d4ff", color: "#0a1628" }}>
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
