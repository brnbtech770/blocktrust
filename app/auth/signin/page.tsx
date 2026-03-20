"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";

const pageBg = "#0a1628";

const cardStyle: React.CSSProperties = {
  maxWidth: "420px",
  margin: "0 auto",
  padding: "32px",
  border: "1px solid rgba(0,212,255,0.15)",
  borderRadius: "16px",
  backgroundColor: "rgba(13,31,60,0.85)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(0,212,255,0.15)",
  backgroundColor: "rgba(0,0,0,0.3)",
  color: "rgba(232,234,240,0.9)",
  fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
  fontSize: "14px",
};

const btnCyan: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  borderRadius: "8px",
  fontWeight: 700,
  fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
  background: "#00d4ff",
  color: "#0a1628",
  border: "none",
  cursor: "pointer",
};

const separatorStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
  margin: "20px 0",
  color: "rgba(232,234,240,0.45)",
  fontSize: "13px",
  fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
};

/** Messages NextAuth / Auth.js pour ?error= (visibles aussi pour Google OAuth). */
function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    Configuration:
      "Erreur côté Auth.js (souvent masquée sous « Configuration »). Essayez : supprimer les cookies pour ce site ; vérifier NEXTAUTH_URL / AUTH_URL = https://blocktrust.tech sans chemin ; redirect URI Google = https://blocktrust.tech/api/auth/callback/google ; consulter les logs Vercel [auth] au moment du clic.",
    AccessDenied: "Connexion refusée.",
    Verification: "Le lien de vérification a expiré ou a déjà été utilisé.",
    OAuthSignin: "Impossible de démarrer la connexion OAuth.",
    OAuthCallback: "Erreur lors du retour OAuth (callback).",
    OAuthAccountNotLinked: "Ce compte est déjà lié à une autre méthode de connexion.",
    Callback: "Erreur callback (URL ou secret).",
    Default: "Connexion impossible. Réessayez.",
    CredentialsSignin: "Email ou mot de passe incorrect.",
  };
  return map[code] ?? `Erreur : ${code}`;
}

/** Après redirect depuis dashboard/admin : raison technique (pour support / debug). */
function signinReasonMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    "no-session-cookie":
      "Aucun cookie de session détecté après la redirection. Réessayez Google, ou vérifiez bloqueurs / mode privé. Ensuite ouvrez /api/debug-auth dans cet onglet.",
    "jwt-cookie-unreadable":
      "Cookie de session présent mais non lu (JWT invalide, secret, chunk ou hôte). Ouvrez /api/debug-auth dans cet onglet et vérifiez jwtFromCookie + layoutDiagnostic.",
    "user-not-in-db":
      "Session avec email mais utilisateur introuvable en base. Contact support ou vérifiez la base.",
  };
  return map[code] ?? `Diagnostic : ${code}`;
}

/** Résumé des query params pour support / debug (pas de secrets). */
function urlQueryDiagnostic(sp: ReturnType<typeof useSearchParams>): string | null {
  const error = sp.get("error");
  const reason = sp.get("reason");
  const cb = sp.get("callbackUrl");
  const parts: string[] = [];
  if (error) parts.push(`error=${error}`);
  if (reason) parts.push(`reason=${reason}`);
  if (cb) {
    const s = cb.length > 96 ? `${cb.slice(0, 96)}…` : cb;
    parts.push(`callbackUrl=${s}`);
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const reasonParam = searchParams.get("reason");
  const oauthError =
    errorParam && errorParam !== "CredentialsSignin"
      ? oauthErrorMessage(errorParam)
      : null;
  const reasonHint = signinReasonMessage(reasonParam);
  const urlDiagnosticLine = urlQueryDiagnostic(searchParams);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

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

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMagicError(null);
    setMagicSent(null);
    const trimmed = magicEmail.trim();
    if (!trimmed) {
      setMagicError("Indiquez une adresse email.");
      return;
    }
    setMagicLoading(true);
    try {
      const result = await signIn("email", {
        email: trimmed,
        callbackUrl,
        redirect: false,
      });
      if (result?.error) {
        setMagicError("Impossible d'envoyer le lien. Réessayez plus tard.");
        return;
      }
      setMagicSent(trimmed);
    } catch {
      setMagicError("Impossible d'envoyer le lien.");
    } finally {
      setMagicLoading(false);
    }
  }

  function handleGoogle() {
    if (typeof window === "undefined") return;
    // Navigation pleine page (évite les cas où signIn() client laisse un flux OAuth incomplet sous Next 16).
    const raw = (callbackUrl || "/dashboard").trim();
    const absolute =
      raw.startsWith("http://") || raw.startsWith("https://")
        ? raw
        : `${window.location.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;

    // Même origine → préférer un chemin relatif pour callbackUrl (assertConfig : InvalidCallbackUrl / encodage).
    let callbackForOAuth = absolute;
    try {
      const u = new URL(absolute);
      if (u.origin === window.location.origin) {
        const pathAndQuery = `${u.pathname}${u.search}${u.hash}`;
        callbackForOAuth = pathAndQuery.length > 0 ? pathAndQuery : "/";
      }
    } catch {
      callbackForOAuth = raw.startsWith("/") ? raw : `/${raw}`;
    }

    window.location.assign(
      `/api/auth/signin/google?callbackUrl=${encodeURIComponent(callbackForOAuth)}`
    );
  }

  return (
    <div
      className="min-h-screen px-4 py-12"
      style={{
        background: pageBg,
        fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ margin: "0 auto 24px", display: "flex", justifyContent: "center" }}>
        <Logo size="lg" withText={true} href="/" />
      </div>
      <div style={cardStyle}>
        <h1
          style={{
            fontFamily: "var(--font-syne), sans-serif",
            color: "#fff",
            fontSize: "1.5rem",
            marginBottom: "1.5rem",
            fontWeight: 700,
          }}
        >
          Connexion
        </h1>

        {oauthError && (
          <p
            role="alert"
            style={{
              color: "#E05252",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              lineHeight: 1.45,
            }}
          >
            {oauthError}
          </p>
        )}

        {reasonHint && (
          <p
            role="status"
            style={{
              color: "rgba(232,234,240,0.85)",
              marginBottom: "1.25rem",
              fontSize: "0.85rem",
              lineHeight: 1.45,
              padding: "12px",
              borderRadius: "8px",
              background: "rgba(224,82,82,0.12)",
              border: "1px solid rgba(224,82,82,0.35)",
            }}
          >
            {reasonHint}
            {reasonParam ? (
              <span
                style={{
                  display: "block",
                  marginTop: "8px",
                  fontFamily: "monospace",
                  fontSize: "0.75rem",
                  opacity: 0.9,
                }}
              >
                code&nbsp;: {reasonParam}
              </span>
            ) : null}
          </p>
        )}

        {urlDiagnosticLine ? (
          <p
            style={{
              marginBottom: "1rem",
              padding: "10px 12px",
              borderRadius: "8px",
              fontSize: "0.72rem",
              lineHeight: 1.4,
              fontFamily:
                "var(--font-ibm-plex-mono, ui-monospace), monospace",
              color: "rgba(232,234,240,0.65)",
              background: "rgba(0,0,0,0.35)",
              border: "1px solid rgba(0,212,255,0.12)",
              wordBreak: "break-all",
            }}
          >
            <span style={{ display: "block", marginBottom: "4px", opacity: 0.85 }}>
              Diagnostic URL (copier pour support)
            </span>
            {urlDiagnosticLine}
          </p>
        ) : null}

        {/* 1. Google */}
        <button
          type="button"
          onClick={handleGoogle}
          className="w-full transition-all hover:brightness-110"
          style={btnCyan}
        >
          Continuer avec Google
        </button>

        <div style={separatorStyle}>
          <span style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.2)" }} />
          ou
          <span style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.2)" }} />
        </div>

        {/* 2. Magic link */}
        <form onSubmit={handleMagicLink}>
          <label style={{ color: "rgba(232,234,240,0.75)", display: "block", marginBottom: "8px", fontSize: "13px" }}>
            Lien magique (sans mot de passe)
          </label>
          <input
            type="email"
            value={magicEmail}
            onChange={(e) => {
              setMagicEmail(e.target.value);
              setMagicSent(null);
            }}
            placeholder="vous@exemple.com"
            autoComplete="email"
            className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.15)]"
            style={{ ...inputStyle, marginBottom: "12px" }}
          />
          <button
            type="submit"
            disabled={magicLoading}
            className="w-full transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{
              ...btnCyan,
              background: "rgba(0,212,255,0.15)",
              color: "#00d4ff",
              border: "1px solid rgba(0,212,255,0.4)",
            }}
          >
            {magicLoading ? "Envoi…" : "Envoyer le lien de connexion"}
          </button>
          {magicError && <p style={{ color: "#E05252", marginTop: "12px", fontSize: "14px" }}>{magicError}</p>}
          {magicSent && (
            <p style={{ color: "#1DB87E", marginTop: "12px", fontSize: "14px" }}>
              Lien envoyé à {magicSent}
            </p>
          )}
        </form>

        <div style={separatorStyle}>
          <span style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.2)" }} />
          ou
          <span style={{ flex: 1, height: 1, background: "rgba(0,212,255,0.2)" }} />
        </div>

        {/* 3. Email + mot de passe */}
        <form onSubmit={handleCredentialsSubmit}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.75)", display: "block", marginBottom: "8px", fontSize: "13px" }}>
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.15)]"
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: "1rem" }}>
            <label style={{ color: "rgba(232,234,240,0.75)", display: "block", marginBottom: "8px", fontSize: "13px" }}>
              Mot de passe
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="focus:outline-none focus:border-[#00d4ff] focus:ring-[3px] focus:ring-[rgba(0,212,255,0.15)]"
              style={inputStyle}
            />
            <p style={{ marginTop: "8px", fontSize: "0.875rem" }}>
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
            className="w-full transition-all hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed"
            style={btnCyan}
          >
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <p style={{ color: "rgba(232,234,240,0.55)", marginTop: "1.5rem", fontSize: "0.875rem" }}>
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
    <Suspense fallback={<div style={{ padding: "48px 16px", color: "#e8eaf0", textAlign: "center", background: pageBg }}>Chargement...</div>}>
      <SignInContent />
    </Suspense>
  );
}
