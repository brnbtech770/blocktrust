"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/app/components/ui/Logo";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

type Verdict =
  | "VALID"
  | "VALID_WITH_WARNING"
  | "TAMPERED"
  | "REVOKED"
  | "EXPIRED"
  | "INVALID"
  | "ERROR";

type VerifyApiSuccess = {
  verdict: Verdict;
  reason?: string | null;
  entityName?: string;
  certifiedAt?: string | null;
  entityId?: string;
  certificateId?: string;
  jti?: string;
  error?: string;
};

function formatCertifiedDate(iso: string | undefined | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return "—";
  }
}

function VerifyContent() {
  const sp = useSearchParams();
  const [token, setToken] = useState("");
  const [tokenFixApplied, setTokenFixApplied] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [entityName, setEntityName] = useState<string | null>(null);
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);

  const context = useMemo(
    () => ({
      from: "contact@brnb.fr",
      to: "test@client.com",
      subject: "Test BlockTrust V2",
      date: new Date().toISOString(),
      body: "Hello",
    }),
    []
  );

  useEffect(() => {
    const direct = sp.get("token");
    if (direct) {
      setToken(direct);
      return;
    }

    const search = window.location.search;
    if (search.includes("token%3D")) {
      const fixedSearch = search.replace(/token%3D/g, "token=");
      const params = new URLSearchParams(fixedSearch);
      const fixedToken = params.get("token");
      if (fixedToken) {
        setToken(fixedToken);
        setTokenFixApplied(true);
      }
    }
  }, [sp]);

  useEffect(() => {
    if (!token) return;

    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/v2/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ token, context }),
      });
      const data = (await res.json()) as VerifyApiSuccess;
      if (cancelled) return;
      setVerdict((data.verdict as Verdict) ?? "ERROR");
      setEntityName(data.entityName ?? null);
      setCertifiedAt(data.certifiedAt ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [token, context]);

  const dateLabel = formatCertifiedDate(certifiedAt);
  const displayName = entityName?.trim() || "Titulaire certifié";

  const showSuccess =
    verdict === "VALID" || verdict === "VALID_WITH_WARNING";

  const failVerdict =
    verdict === "TAMPERED" ||
    verdict === "REVOKED" ||
    verdict === "EXPIRED" ||
    verdict === "INVALID" ||
    verdict === "ERROR";

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628] text-white antialiased">
      <header className="flex shrink-0 justify-center px-4 pt-8 pb-4">
        <Link
          href="https://blocktrust.tech"
          className="inline-flex items-center gap-2 opacity-80 transition hover:opacity-100"
        >
          <Logo size="sm" withText={false} href="" />
          <span className="font-syne text-sm font-bold leading-none tracking-wider text-bt-cyan">
            BLOCKTRUST
            <span className="text-[10px] align-super">™</span>
          </span>
        </Link>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-4 pb-12 pt-4">
        {!token && (
          <div className="max-w-md text-center">
            <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-[#00d4ff]/50" aria-hidden />
            <p className="font-syne text-lg text-white/90">
              Lien de vérification incomplet
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Aucun jeton sécurisé n&apos;a été fourni dans l&apos;URL. Scannez le QR code officiel depuis un message
              certifié BlockTrust ou ouvrez le lien reçu de votre interlocuteur.
            </p>
          </div>
        )}

        {tokenFixApplied && (
          <div
            role="status"
            className="mb-6 w-full max-w-sm rounded-xl border border-bt-cyan/35 bg-[#00d4ff]/10 px-4 py-3 text-center text-sm text-[#00d4ff]"
          >
            Lien corrigé automatiquement (jeton encodé).
          </div>
        )}

        {token && !verdict && (
          <div className="flex flex-col items-center gap-4">
            <div
              className="h-16 w-16 animate-spin rounded-full border-2 border-[#00d4ff]/30 border-t-[#00d4ff]"
              aria-hidden
            />
            <p className="text-sm text-white/50">Vérification en cours...</p>
          </div>
        )}

        {verdict && showSuccess && (
          <div className="flex max-w-sm flex-col items-center gap-6 text-center mx-auto px-2">
            <div className="relative">
              <div
                className="animate-pulse rounded-full bg-emerald-500/20 blur-2xl absolute inset-0 scale-125"
                aria-hidden
              />
              <BlockTrustBadge
                size={120}
                instanceId="verify-public"
                className="relative z-10 [&>svg]:drop-shadow-[0_0_20px_rgba(16,185,129,0.35)]"
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <div className="h-3 w-3 animate-pulse rounded-full bg-emerald-400" aria-hidden />
              <span className="font-syne text-lg font-semibold uppercase tracking-widest text-emerald-400">
                Identité vérifiée
              </span>
            </div>

            <p className="font-syne text-2xl font-bold text-white">{displayName}</p>

            <p className="text-sm text-white/40">
              Certifié le {dateLabel}
              {" · "}Vérifié à l&apos;instant
            </p>

            <div className="h-px w-full bg-white/10" aria-hidden />

            <div className="w-full rounded-xl border border-[#00d4ff]/20 bg-[#00d4ff]/5 p-4 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#00d4ff]">
                Pourquoi faire confiance à ce badge ?
              </p>
              <ul className="space-y-1.5">
                {[
                  "Signature cryptographique ES256 infalsifiable",
                  "QR code rotatif — impossible à copier",
                  "Ancré sur Polygon blockchain",
                  "Identité vérifiée par BLOCKTRUST",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-relaxed text-white/60">
                    <span className="text-xs text-emerald-400" aria-hidden>
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-white/30">Vérification gratuite · Sans compte requis</p>
            <a
              href="https://blocktrust.tech"
              className="text-xs text-[#00d4ff]/50 transition hover:text-[#00d4ff]"
              rel="noopener noreferrer"
            >
              Certifiez votre identité sur BLOCKTRUST™ →
            </a>
          </div>
        )}

        {verdict && failVerdict && (
          <div className="flex max-w-sm flex-col items-center gap-6 text-center mx-auto px-2">
            <div className="relative">
              <div
                className="animate-pulse rounded-full bg-red-500/20 blur-2xl absolute inset-0 scale-125"
                aria-hidden
              />
              <div className="relative z-10 flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-red-500/40 bg-red-500/10">
                <ShieldAlert className="h-12 w-12 text-red-400" aria-hidden />
              </div>
            </div>

            {verdict === "REVOKED" && (
              <>
                <span className="font-syne text-lg font-semibold uppercase tracking-widest text-red-400">
                  Badge révoqué
                </span>
                <p className="text-sm leading-relaxed text-white/50">
                  Ce badge a été révoqué par son propriétaire. Ne pas faire confiance à ce document.
                </p>
              </>
            )}

            {verdict === "TAMPERED" && (
              <>
                <span className="font-syne text-lg font-semibold uppercase tracking-widest text-red-400">
                  Falsification détectée
                </span>
                <p className="text-sm leading-relaxed text-white/50">
                  Ce badge a été modifié ou copié dans un contexte frauduleux. Tentative de fraude probable.
                </p>
              </>
            )}

            {verdict === "EXPIRED" && (
              <>
                <span className="font-syne text-lg font-semibold uppercase tracking-widest text-amber-300">
                  Badge expiré
                </span>
                <p className="text-sm leading-relaxed text-white/50">
                  Ce badge n&apos;est plus valide. Demandez un badge récent à votre interlocuteur.
                </p>
              </>
            )}

            {(verdict === "INVALID" || verdict === "ERROR") && (
              <>
                <span className="font-syne text-lg font-semibold uppercase tracking-widest text-red-400">
                  Badge invalide
                </span>
                <p className="text-sm leading-relaxed text-white/50">
                  Ce badge ne peut pas être vérifié. Il est peut-être corrompu ou falsifié.
                </p>
              </>
            )}

            <div className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-left">
              <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-red-400">
                ⚠️ Que faire ?
              </p>
              <ul className="space-y-1.5">
                {[
                  "Ne partagez aucune information sensible",
                  "Ne répondez pas à ce message",
                  "Contactez directement l'expéditeur par un autre canal",
                  "Signalez cette tentative à security@blocktrust.tech",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-relaxed text-white/60">
                    <span className="text-xs text-red-400" aria-hidden>
                      →
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="https://blocktrust.tech"
              className="text-xs text-[#00d4ff]/50 transition hover:text-[#00d4ff]"
              rel="noopener noreferrer"
            >
              Certifiez votre identité sur BLOCKTRUST™ →
            </a>
          </div>
        )}
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#0a1628] px-4">
          <div
            className="h-12 w-12 animate-spin rounded-full border-2 border-[#00d4ff]/25 border-t-[#00d4ff]"
            aria-hidden
          />
          <p className="text-sm text-white/45">Chargement...</p>
        </div>
      }
    >
      <VerifyContent />
    </Suspense>
  );
}
