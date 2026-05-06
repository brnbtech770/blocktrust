"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";
import { sanitizeCallbackUrl } from "@/app/lib/auth-callback-url";

const pageBg = "#0a1628";


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
      "Aucun cookie de session détecté après la redirection. Réessayez Google, ou vérifiez bloqueurs / mode privé. Consultez les logs Vercel filtrés sur [auth] ou ouvrez /api/health pour comparer le SHA de déploiement.",
    "jwt-cookie-unreadable":
      "Cookie de session présent mais non lu (JWT invalide, secret, chunk ou hôte). Consultez les logs Vercel filtrés sur [auth] ou /api/health (authRelease, prefetchRscAuthBypass).",
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

/**
 * Pour signIn('google') : si callback est une URL absolue autorisée, envoyer un chemin relatif
 * (réduit InvalidCallbackUrl côté assertConfig). `safeCallbackUrl` est déjà passée par sanitizeCallbackUrl.
 */
function googleSignInCallbackUrl(safeCallbackUrl: string): string {
  const t = safeCallbackUrl.trim();
  if (typeof window === "undefined") {
    return t.startsWith("/") ? t : "/dashboard";
  }
  if (t.startsWith("http://") || t.startsWith("https://")) {
    try {
      const u = new URL(t);
      const originOk =
        u.origin === window.location.origin ||
        u.hostname === "blocktrust.tech" ||
        u.hostname === "localhost";
      if (originOk) {
        const pq = `${u.pathname}${u.search}${u.hash}`;
        return pq.length > 0 ? pq : "/";
      }
      return "/dashboard";
    } catch {
      return "/dashboard";
    }
  }
  return t.startsWith("/") ? t : "/dashboard";
}

function SignInContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = sanitizeCallbackUrl(searchParams.get("callbackUrl"));
  const errorParam = searchParams.get("error");
  const reasonParam = searchParams.get("reason");
  const clearedOAuth = searchParams.get("cleared") === "oauth";
  const oauthError =
    errorParam &&
    errorParam !== "CredentialsSignin" &&
    errorParam !== "Configuration"
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
    // Auth.js v5 : flux sign-in OAuth via signIn() (POST/CSRF) — pas de GET /api/auth/signin/google.
    signIn("google", { callbackUrl: googleSignInCallbackUrl(callbackUrl) });
  }

  return (
    <div
      className="min-h-screen overflow-x-hidden px-3 py-8 sm:px-4 sm:py-12"
      style={{
        background: pageBg,
        fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto mb-6 flex justify-center sm:mb-8">
        <div className="origin-center scale-[0.88] sm:scale-100">
          <Logo size="lg" withText href="/" className="drop-shadow-[0_0_14px_rgba(0,212,255,0.45)]" />
        </div>
      </div>
      <div className="mx-auto w-full max-w-sm rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-8">
        <h1 className="font-syne mb-4 text-2xl font-bold text-white sm:mb-6 sm:text-3xl lg:text-4xl">
          Connexion
        </h1>

        {clearedOAuth && (
          <p
            role="status"
            style={{
              color: "#1DB87E",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              lineHeight: 1.45,
            }}
          >
            Cookies du flux OAuth ont été effacés. Réessayez « Continuer avec Google ».
          </p>
        )}

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

        {errorParam === "Configuration" && (
          <div
            role="alert"
            style={{
              color: "rgba(232,234,240,0.92)",
              marginBottom: "1.25rem",
              fontSize: "0.88rem",
              lineHeight: 1.5,
              padding: "14px 16px",
              borderRadius: "10px",
              background: "rgba(224,82,82,0.14)",
              border: "1px solid rgba(224,82,82,0.4)",
            }}
          >
            <p style={{ fontWeight: 700, marginBottom: "10px", color: "#ffb4b4" }}>
              Erreur « Configuration » (Auth.js)
            </p>
            <p style={{ marginBottom: "10px", opacity: 0.95 }}>
              La cause réelle est souvent dans les <strong>logs Vercel</strong> (filtrer{" "}
              <code style={{ fontSize: "0.8rem" }}>[auth]</code> au moment où vous cliquez sur Google).
            </p>
            <ol style={{ margin: 0, paddingLeft: "1.2rem" }}>
              <li style={{ marginBottom: "8px" }}>
                <a
                  href="/api/auth/reset-oauth-cookies"
                  className="font-semibold text-[#00d4ff] underline hover:brightness-110"
                >
                  Réinitialiser les cookies du flux OAuth
                </a>{" "}
                (callback, état, PKCE) — recommandé en premier.
              </li>
              <li style={{ marginBottom: "8px" }}>
                Google Cloud Console → identifiants OAuth : URI de redirection{" "}
                <strong>exacte</strong> :{" "}
                <code style={{ fontSize: "0.78rem", wordBreak: "break-all", display: "block", marginTop: "4px" }}>
                  https://blocktrust.tech/api/auth/callback/google
                </code>
              </li>
              <li style={{ marginBottom: "8px" }}>
                Vercel : <code>NEXTAUTH_URL</code> = <code>AUTH_URL</code> ={" "}
                <code>https://blocktrust.tech</code> (sans chemin, sans slash final obligatoire).
              </li>
              <li>
                <a
                  href="/api/health"
                  className="text-[#00d4ff] underline hover:brightness-110"
                >
                  /api/health
                </a>{" "}
                — vérif déploiement (SHA Git, authRelease) sans exposer la session.
              </li>
            </ol>
          </div>
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
