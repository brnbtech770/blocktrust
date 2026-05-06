"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Logo } from "@/app/components/ui/Logo";

function shortMessage(code: string | null): string {
  if (!code) return "Une erreur d’authentification s’est produite.";
  const m: Record<string, string> = {
    Configuration:
      "Problème de configuration ou de flux OAuth (détails ci‑dessous si applicable).",
    AccessDenied: "Connexion refusée.",
    Verification: "Lien expiré ou déjà utilisé.",
    OAuthSignin: "Impossible de démarrer OAuth.",
    OAuthCallback: "Erreur au retour Google.",
    OAuthAccountNotLinked: "Compte déjà lié à une autre méthode.",
    Callback: "Erreur callback.",
    CredentialsSignin: "Identifiants incorrects.",
    Default: "Connexion impossible.",
  };
  return m[code] ?? `Erreur : ${code}`;
}

function ErrorContent() {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const callbackUrl = searchParams.get("callbackUrl");

  return (
    <div className="min-h-screen bg-navy px-4 py-12 font-sans">
      <div className="mb-6 flex justify-center">
        <Logo size="lg" withText href="/" className="drop-shadow-[0_0_14px_rgba(0,212,255,0.45)]" />
      </div>
      <div className="mx-auto max-w-[480px] rounded-xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm transition-all hover:border-gold/30">
        <h1 className="font-syne mb-3 text-[1.35rem] font-bold tracking-tight text-white">
          Connexion interrompue
        </h1>
        <p style={{ color: "rgba(232,234,240,0.85)", fontSize: "0.95rem", lineHeight: 1.45 }}>
          {shortMessage(error)}
        </p>
        <p
          style={{
            marginTop: "12px",
            fontFamily: "monospace",
            fontSize: "0.8rem",
            color: "rgba(232,234,240,0.6)",
          }}
        >
          code&nbsp;: {error ?? "(non fourni)"}
        </p>

        {error === "Configuration" && (
          <div
            role="region"
            aria-label="Aide Configuration"
            style={{
              marginTop: "1.25rem",
              fontSize: "0.88rem",
              lineHeight: 1.5,
              padding: "14px 16px",
              borderRadius: "10px",
              background: "rgba(224,82,82,0.12)",
              border: "1px solid rgba(224,82,82,0.35)",
              color: "rgba(232,234,240,0.92)",
            }}
            >
            <p style={{ fontWeight: 700, marginBottom: "10px", color: "#ffb4b4" }}>
              Étapes recommandées
            </p>
            <ol style={{ margin: 0, paddingLeft: "1.2rem" }}>
              <li style={{ marginBottom: "8px" }}>
                <a
                  href="/api/auth/reset-oauth-cookies"
                  className="font-semibold text-[#00d4ff] underline hover:brightness-110"
                >
                  Réinitialiser les cookies du flux OAuth
                </a>
              </li>
              <li style={{ marginBottom: "8px" }}>
                Google Cloud → OAuth : URI{" "}
                <code style={{ fontSize: "0.78rem", wordBreak: "break-all", display: "block", marginTop: "4px" }}>
                  https://blocktrust.tech/api/auth/callback/google
                </code>
              </li>
              <li style={{ marginBottom: "8px" }}>
                Vercel : <code>NEXTAUTH_URL</code> = <code>AUTH_URL</code> ={" "}
                <code>https://blocktrust.tech</code> (origine seule)
              </li>
              <li>
                Logs runtime Vercel au moment du clic (filtrer <code>[auth]</code>), pas le log de{" "}
                <code>npm run build</code>.
              </li>
            </ol>
          </div>
        )}

        <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "12px" }}>
          <Link
            href={
              callbackUrl &&
              callbackUrl.startsWith("/") &&
              !callbackUrl.startsWith("//")
                ? `/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`
                : "/auth/signin"
            }
            className="block w-full rounded-lg bg-bt-cyan py-3 text-center text-sm font-bold text-navy transition hover:bg-bt-cyan/90"
          >
            Réessayer la connexion
          </Link>
          <Link href="/api/health" className="text-center text-sm text-[#00d4ff] hover:underline">
            /api/health (vérif déploiement)
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AuthErrorPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-navy px-4 py-12 text-center text-white/80">
          Chargement…
        </div>
      }
    >
      <ErrorContent />
    </Suspense>
  );
}
