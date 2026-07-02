"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { sanitizeCallbackUrl } from "@/app/lib/auth-callback-url";
import AuthMinimalHeader from "@/app/components/AuthMinimalHeader";

const pageBg = "#0a1628";


const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
  padding: "12px 14px",
  borderRadius: "8px",
  border: "1px solid rgba(0,212,255,0.15)",
  backgroundColor: "rgba(0,0,0,0.3)",
  color: "rgba(232,234,240,0.9)",
  fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
  fontSize: "16px",
};

const btnCyan: React.CSSProperties = {
  width: "100%",
  minHeight: "48px",
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
  margin: "14px 0",
  color: "rgba(232,234,240,0.45)",
  fontSize: "13px",
  fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
};

const CREDENTIALS_ERROR_MESSAGE =
  "Email ou mot de passe incorrect. Si vous vous êtes inscrit avec Google, utilisez le bouton « Se connecter avec Google » ou définissez un mot de passe dans vos paramètres.";

const LOCKOUT_ERROR_MESSAGE =
  "Compte temporairement verrouillé. Réessayez dans 15 minutes.";

/** Erreurs credentials / Auth.js : jamais de code technique côté utilisateur. */
function credentialsErrorMessage(
  code: string | null | undefined,
  url?: string | null,
): string {
  if (code === "account_locked") {
    return LOCKOUT_ERROR_MESSAGE;
  }
  if (url?.includes("account_locked")) {
    return LOCKOUT_ERROR_MESSAGE;
  }
  if (!code) return CREDENTIALS_ERROR_MESSAGE;
  return CREDENTIALS_ERROR_MESSAGE;
}

/** Messages NextAuth / Auth.js pour ?error= (visibles aussi pour Google OAuth). */
function oauthErrorMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    AccessDenied: "Connexion refusée.",
    Verification: "Le lien de vérification a expiré ou a déjà été utilisé.",
    OAuthSignin: "Impossible de démarrer la connexion OAuth.",
    OAuthCallback: "Erreur lors du retour OAuth (callback).",
    OAuthAccountNotLinked:
      "Cet email est déjà enregistré avec une autre méthode. Utilisez le lien magique ou définissez un mot de passe dans vos paramètres pour vous connecter aussi par email.",
    Callback: "Erreur callback (URL ou secret).",
    Default: "Connexion impossible. Réessayez.",
    CredentialsSignin: CREDENTIALS_ERROR_MESSAGE,
    account_locked: LOCKOUT_ERROR_MESSAGE,
  };
  return map[code] ?? "Connexion impossible. Réessayez.";
}

/** Après redirect depuis dashboard/admin : message utilisateur (sans codes techniques). */
function signinReasonMessage(code: string | null): string | null {
  if (!code) return null;
  const map: Record<string, string> = {
    "no-session-cookie":
      "La session n'a pas pu être établie. Réessayez la connexion, ou utilisez Google si votre compte a été créé avec Google.",
    "jwt-cookie-unreadable":
      "La session n'a pas pu être lue. Déconnectez-vous, effacez les cookies du site si besoin, puis reconnectez-vous.",
    "user-not-in-db":
      "Compte introuvable. Contactez le support BLOCKTRUST si le problème persiste.",
  };
  return map[code] ?? "Connexion impossible. Réessayez ou contactez le support.";
}

/** Chemin relatif same-origin pour assertConfig (évite InvalidCallbackUrl / Configuration). */
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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => {
    if (
      errorParam === "CredentialsSignin" ||
      errorParam === "no-session-cookie"
    ) {
      return CREDENTIALS_ERROR_MESSAGE;
    }
    return null;
  });
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
      const errCode =
        (result as { code?: string } | undefined)?.code ?? result?.error ?? undefined;
      if (errCode === "account_locked") {
        setError(LOCKOUT_ERROR_MESSAGE);
        return;
      }
      setError(credentialsErrorMessage(errCode, result?.url));
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
    // Auth.js v5 : OAuth via signIn() (POST + CSRF). GET /api/auth/signin/google → Configuration.
    void signIn("google", {
      callbackUrl: googleSignInCallbackUrl(callbackUrl),
    });
  }

  return (
    <div
      className="flex min-h-screen flex-col overflow-x-hidden"
      style={{
        background: pageBg,
        fontFamily: "var(--font-inter), Inter, system-ui, sans-serif",
      }}
    >
      <AuthMinimalHeader />
      <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 pb-6 sm:px-4">
        <div className="w-full rounded-xl border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:p-6">
        <h1 className="font-syne mb-4 text-2xl font-bold text-white sm:text-3xl">
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
          <p
            role="alert"
            className="mb-4 rounded-lg border border-[#E05252]/35 bg-[#E05252]/12 px-3 py-2 text-sm text-[#ffb4b4]"
          >
            Connexion temporairement indisponible. Réessayez plus tard ou contactez le support.
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
          </p>
        )}

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
          <label className="mb-2 block text-sm text-white/75">
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
            <label className="mb-2 block text-sm text-white/75">
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
            <label className="mb-2 block text-sm text-white/75">
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
          {error && (
            <p style={{ color: "#E05252", marginBottom: "1rem", fontSize: "0.9rem", lineHeight: 1.45 }}>
              {error}
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

        <p style={{ color: "rgba(232,234,240,0.55)", marginTop: "1.25rem", fontSize: "0.875rem" }}>
          Pas encore de compte ?{" "}
          <Link href="/auth/register" className="cursor-pointer text-[#00d4ff] hover:underline">
            Créer un compte
          </Link>
        </p>
        </div>
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
