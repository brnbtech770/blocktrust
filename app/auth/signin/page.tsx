"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { sanitizeCallbackUrl } from "@/app/lib/auth-callback-url";
import AuthMinimalHeader from "@/app/components/AuthMinimalHeader";
import {
  CREDENTIALS_ERROR_MESSAGE,
  oauthOrSignInErrorMessage,
  parseCredentialsSignInError,
} from "@/lib/auth-signin-errors";

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

function initialCredentialsError(errorParam: string | null): string | null {
  if (!errorParam) return null;
  if (errorParam === "CredentialsSignin" || errorParam === "no-session-cookie") {
    return CREDENTIALS_ERROR_MESSAGE;
  }
  return oauthOrSignInErrorMessage(errorParam);
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
  const registered = searchParams.get("registered") === "1";
  const clearedOAuth = searchParams.get("cleared") === "oauth";
  const oauthError =
    errorParam &&
    errorParam !== "CredentialsSignin" &&
    errorParam !== "Configuration"
      ? oauthOrSignInErrorMessage(errorParam)
      : null;
  const reasonHint = signinReasonMessage(reasonParam);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(() => initialCredentialsError(errorParam));
  const [loading, setLoading] = useState(false);

  const [magicEmail, setMagicEmail] = useState("");
  const [magicSent, setMagicSent] = useState<string | null>(null);
  const [magicLoading, setMagicLoading] = useState(false);
  const [magicError, setMagicError] = useState<string | null>(null);

  async function handleCredentialsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const emailNorm = email.trim().toLowerCase();
    try {
      const result = await signIn("credentials", {
        email: emailNorm,
        password,
        callbackUrl,
        redirect: false,
      });
      if (result?.ok) {
        router.push(callbackUrl);
        return;
      }
      setError(parseCredentialsSignInError(result).message);
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
    const trimmed = magicEmail.trim().toLowerCase();
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

        {registered && (
          <p
            role="status"
            style={{
              color: "#1DB87E",
              marginBottom: "1.25rem",
              fontSize: "0.9rem",
              lineHeight: 1.45,
            }}
          >
            Compte créé. Connectez-vous avec votre email et mot de passe.
          </p>
        )}

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
              autoComplete="email"
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
              autoComplete="current-password"
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
            <p role="alert" style={{ color: "#E05252", marginBottom: "1rem", fontSize: "0.9rem", lineHeight: 1.45 }}>
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
