"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import AuthMinimalHeader from "@/app/components/AuthMinimalHeader";
import PasswordStrengthIndicator from "@/app/components/auth/PasswordStrengthIndicator";
import TurnstileWidget from "@/app/components/auth/TurnstileWidget";
import { validatePassword } from "@/lib/password-policy";

const cardClass =
  "mx-auto w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6";

const inputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: "8px",
  border: "1px solid var(--bt-border)",
  backgroundColor: "rgba(6,14,26,0.8)",
  color: "#fff",
};

function RequiredLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label htmlFor={htmlFor} style={{ color: "var(--bt-muted)", display: "block", marginBottom: "4px" }}>
      {children} <span className="text-[#E05252]" aria-hidden>*</span>
    </label>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [acceptCgu, setAcceptCgu] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [turnstileBypass, setTurnstileBypass] = useState(false);
  const [turnstileUnavailableMsg, setTurnstileUnavailableMsg] = useState<string | null>(null);
  const turnstileSiteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";
  const formLoadedAtRef = useRef<number | null>(null);
  const websiteHoneypotRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    formLoadedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (!turnstileSiteKey) {
      console.warn("[register] Turnstile site key missing — widget skipped, bypass enabled");
      setTurnstileBypass(true);
      return;
    }

    if (turnstileToken || turnstileBypass) return;

    const timeout = window.setTimeout(() => {
      console.warn("[register] Turnstile token absent after 8s — bypass enabled");
      setTurnstileBypass(true);
      setTurnstileUnavailableMsg(
        "Vérification de sécurité indisponible. Vous pouvez créer votre compte.",
      );
    }, 8000);

    return () => window.clearTimeout(timeout);
  }, [turnstileSiteKey, turnstileToken, turnstileBypass]);

  function handleTurnstileUnavailable(reason: "script_error" | "render_error") {
    console.warn(`[register] Turnstile unavailable (${reason}) — bypass enabled`);
    setTurnstileBypass(true);
    setTurnstileUnavailableMsg(
      "Vérification de sécurité indisponible. Vous pouvez créer votre compte.",
    );
  }

  function validate(): boolean {
    const err: Record<string, string> = {};
    if (password !== confirmPassword) {
      err.confirmPassword = "Les mots de passe ne correspondent pas.";
    }
    const policy = validatePassword(password, email.trim());
    if (!policy.valid) {
      err.password = policy.errors[0] ?? "Mot de passe invalide.";
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
        "Vous devez accepter les conditions générales et la politique de confidentialité.",
      );
      return;
    }
    if (!validate()) return;
    if (turnstileSiteKey && !turnstileToken && !turnstileBypass) {
      setError("Vérification de sécurité en cours. Réessayez dans un instant.");
      return;
    }

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
          turnstileToken: turnstileToken || undefined,
          turnstileBypass: turnstileBypass || undefined,
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
    <div className="flex min-h-screen flex-col overflow-x-hidden">
      <AuthMinimalHeader />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-6 sm:px-6">
        <div className={cardClass}>
          <h1 className="font-syne mb-4 text-2xl font-bold text-white sm:text-3xl">
            Créer un compte
          </h1>
          <p className="mb-4 text-xs text-white/45">
            Les champs marqués d&apos;un <span className="text-[#E05252]">*</span> sont obligatoires.
          </p>
          <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-2 text-center text-xs text-white/50">
              1. Compte · 2. Plan · 3. Badge partout
            </p>
            <p className="text-center text-[11px] leading-relaxed text-white/35">
              Sans engagement · Résiliable à tout moment
            </p>
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
            <div style={{ marginBottom: "0.875rem" }}>
              <RequiredLabel htmlFor="firstName">Prénom</RequiredLabel>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]"
                style={inputStyle}
                autoComplete="given-name"
              />
            </div>
            <div style={{ marginBottom: "0.875rem" }}>
              <RequiredLabel htmlFor="lastName">Nom</RequiredLabel>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]"
                style={inputStyle}
                autoComplete="family-name"
              />
            </div>
            <div style={{ marginBottom: "0.875rem" }}>
              <RequiredLabel htmlFor="email">Email</RequiredLabel>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]"
                style={inputStyle}
                autoComplete="email"
              />
            </div>
            <div style={{ marginBottom: "0.875rem" }}>
              <RequiredLabel htmlFor="password">Mot de passe</RequiredLabel>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]"
                  style={{ ...inputStyle, paddingRight: "2.75rem" }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex min-h-[36px] min-w-[36px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-white/50 hover:text-bt-cyan"
                  aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <PasswordStrengthIndicator password={password} email={email.trim()} showErrors={Boolean(fieldError.password)} />
              <p className="mt-1 text-xs text-white/45">
                Minimum 8 caractères · majuscule · minuscule · chiffre · caractère spécial
              </p>
              {fieldError.password ? (
                <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>
                  {fieldError.password}
                </p>
              ) : null}
            </div>
            <div style={{ marginBottom: "0.875rem" }}>
              <RequiredLabel htmlFor="confirmPassword">Confirmer le mot de passe</RequiredLabel>
              <div className="relative">
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.1)]"
                  style={{ ...inputStyle, paddingRight: "2.75rem" }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute right-2 top-1/2 inline-flex min-h-[36px] min-w-[36px] -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-white/50 hover:text-bt-cyan"
                  aria-label={
                    showConfirmPassword ? "Masquer la confirmation" : "Afficher la confirmation"
                  }
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {fieldError.confirmPassword && (
                <p style={{ color: "#E05252", fontSize: "0.875rem", marginTop: "4px" }}>
                  {fieldError.confirmPassword}
                </p>
              )}
            </div>
            <label className="mb-4 flex cursor-pointer items-start gap-3 text-sm" style={{ color: "var(--bt-muted)" }}>
              <input
                type="checkbox"
                checked={acceptCgu}
                onChange={(e) => setAcceptCgu(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 cursor-pointer rounded border-white/20 bg-transparent accent-[#00d4ff]"
              />
              <span>
                J&apos;accepte les{" "}
                <Link href="/cgu" className="cursor-pointer text-[#00d4ff] hover:underline" target="_blank" rel="noopener noreferrer">
                  CGU
                </Link>{" "}
                et la{" "}
                <Link href="/privacy" className="cursor-pointer text-[#00d4ff] hover:underline" target="_blank" rel="noopener noreferrer">
                  Politique de confidentialité
                </Link>
                .
              </span>
            </label>
            {turnstileSiteKey ? (
              <div className="mb-4">
                <TurnstileWidget
                  siteKey={turnstileSiteKey}
                  onToken={(token) => {
                    setTurnstileToken(token);
                    setTurnstileUnavailableMsg(null);
                  }}
                  onExpire={() => setTurnstileToken("")}
                  onUnavailable={handleTurnstileUnavailable}
                />
                {turnstileUnavailableMsg ? (
                  <p className="mt-2 text-xs text-[#f59e0b]" role="status">
                    {turnstileUnavailableMsg}
                  </p>
                ) : null}
              </div>
            ) : null}
            {error && <p style={{ color: "#E05252", marginBottom: "1rem" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading || !acceptCgu}
              className="w-full cursor-pointer rounded-lg py-3 font-bold transition-all hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              style={{ background: "#00d4ff", color: "#0a1628" }}
            >
              {loading ? "Création..." : "Créer mon compte"}
            </button>
          </form>
          <p style={{ color: "var(--bt-muted)", marginTop: "1.25rem", fontSize: "0.875rem" }}>
            Déjà un compte ?{" "}
            <Link href="/auth/signin" className="cursor-pointer text-[#00d4ff] hover:underline">
              Se connecter
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
