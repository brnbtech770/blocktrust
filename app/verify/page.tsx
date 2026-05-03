"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { Clock, ShieldAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/app/components/ui/Logo";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

const C = {
  valid: "#10b981",
  expired: "#f59e0b",
  revoked: "#E05252",
  tampered: "#ef4444",
  invalid: "#E05252",
} as const;

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

  const showSuccess = verdict === "VALID" || verdict === "VALID_WITH_WARNING";

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
            <p className="font-syne text-lg text-[#00d4ff]/90">
              INVALIDE — Lien incomplet
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Aucun jeton sécurisé n&apos;a été fourni dans l&apos;URL. Scannez le QR code officiel depuis un message
              certifié BLOCKTRUST™ ou ouvrez le lien reçu de votre interlocuteur.
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
          <div className="mx-auto flex max-w-sm flex-col items-center gap-6 px-2 text-center">
            <div className="relative">
              <div
                className="absolute inset-0 scale-125 animate-pulse rounded-full blur-2xl"
                style={{ backgroundColor: `${C.valid}33` }}
                aria-hidden
              />
              <BlockTrustBadge
                size={120}
                instanceId="verify-public"
                className="relative z-10 [&>svg]:drop-shadow-[0_0_22px_rgba(16,185,129,0.35)]"
              />
            </div>

            <div className="flex items-center justify-center gap-2">
              <div
                className="h-3 w-3 animate-pulse rounded-full"
                style={{ backgroundColor: C.valid }}
                aria-hidden
              />
              <span
                className="font-syne text-lg font-semibold uppercase tracking-widest"
                style={{ color: C.valid }}
              >
                VALIDE
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
                Anti-falsification
              </p>
              <ul className="space-y-1.5">
                {[
                  "Signature cryptographique ES256 infalsifiable",
                  "QR code rotatif — impossible à copier",
                  "Identité attestée et vérifiable en temps réel",
                ].map((item) => (
                  <li key={item} className="flex gap-2 text-xs leading-relaxed text-white/60">
                    <span className="text-xs" style={{ color: C.valid }} aria-hidden>
                      ✓
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <a
              href="https://blocktrust.tech"
              className="text-xs font-syne text-[#00d4ff]/60 transition hover:text-[#00d4ff]"
              rel="noopener noreferrer"
            >
              BLOCKTRUST™ — Certifier votre identité →
            </a>
            <p className="mt-4 text-xs text-white/30">
              Connectez-vous pour voir si ce contact fait partie de votre réseau de confiance
            </p>
          </div>
        )}

        {verdict && failVerdict && (
          <FailVerdictCard verdict={verdict} />
        )}
      </main>
    </div>
  );
}

function FailVerdictCard({
  verdict,
}: {
  verdict: Exclude<
    Verdict,
    "VALID" | "VALID_WITH_WARNING"
  >;
}) {
  const isTampered = verdict === "TAMPERED";
  const isExpired = verdict === "EXPIRED";
  const isRevoked = verdict === "REVOKED";

  type Visual = {
    halo: string;
    disk: string;
    iconClass: string;
    labelClass: string;
    label: string;
    subtitle: string;
    Icon: typeof ShieldAlert | typeof Clock;
  };

  let v: Visual;
  if (isExpired) {
    v = {
      halo: "bg-[#f59e0b]/25",
      disk: "border-2 border-[#f59e0b]/70 bg-[#f59e0b]/12",
      iconClass: "text-[#f59e0b]",
      labelClass: "text-[#f59e0b]",
      label: "INVALIDE",
      subtitle:
        "Ce badge n’est plus valide. Demandez un badge récent à votre interlocuteur.",
      Icon: Clock,
    };
  } else if (isRevoked) {
    v = {
      halo: "bg-[#E05252]/22",
      disk: "border-2 border-[#E05252]/75 bg-[#E05252]/10",
      iconClass: "text-[#E05252]",
      labelClass: "text-[#E05252]",
      label: "INVALIDE",
      subtitle:
        "Ce badge a été révoqué par son propriétaire. Ne pas faire confiance à ce document.",
      Icon: ShieldAlert,
    };
  } else if (isTampered) {
    v = {
      halo: "bg-[#ef4444]/28",
      disk: "border-2 border-[#ef4444]/80 bg-[#ef4444]/10",
      iconClass: "text-[#ef4444]",
      labelClass: "text-[#ef4444]",
      label: "FRAUDE",
      subtitle:
        "Ce badge a été modifié ou copié dans un contexte frauduleux. Tentative de fraude probable.",
      Icon: ShieldAlert,
    };
  } else {
    v = {
      halo: "bg-[#E05252]/22",
      disk: "border-2 border-[#E05252]/75 bg-[#E05252]/10",
      iconClass: "text-[#E05252]",
      labelClass: "text-[#E05252]",
      label: "INVALIDE",
      subtitle:
        "Ce badge ne peut pas être vérifié. Il est peut-être corrompu ou falsifié.",
      Icon: ShieldAlert,
    };
  }

  const IconCmp = v.Icon;

  const wrapClass = [
    "mx-auto flex w-full max-w-sm flex-col items-center gap-6 rounded-[1.75rem] p-4 text-center sm:p-5",
    isTampered ? "animate-pulse border-2 border-[#ef4444] shadow-[0_0_32px_rgba(239,68,68,0.22)]" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={wrapClass}>
      <div className="relative flex w-full flex-col items-center gap-6">
        <div
          className={`pointer-events-none absolute inset-1 -z-0 scale-[1.4] animate-pulse rounded-full blur-2xl ${v.halo}`}
          aria-hidden
        />

        <div
          className={`relative z-10 flex h-28 w-28 shrink-0 items-center justify-center rounded-full shadow-inner ${v.disk}`}
        >
          <IconCmp className={`h-12 w-12 shrink-0 ${v.iconClass}`} strokeWidth={2} aria-hidden />
        </div>

        <span className={`font-syne relative z-10 text-lg font-semibold uppercase tracking-widest ${v.labelClass}`}>
          {v.label}
        </span>

        <p className="relative z-10 max-w-[22rem] text-sm leading-relaxed text-white/50">{v.subtitle}</p>

        {isTampered ? (
          <p className="relative z-10 w-full rounded-lg border border-[#ef4444]/35 bg-[#ef4444]/10 px-3 py-2 text-xs text-[#fca5a5]">
            Alerte critique — ne transmettez aucune donnée sensible.
          </p>
        ) : null}

        <div className="relative z-10 w-full rounded-xl border border-white/10 bg-white/[0.04] p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#00d4ff]">
            Anti-usurpation
          </p>
          <ul className="space-y-1.5">
            {[
              "Ne partagez aucune information sensible",
              "Ne répondez pas depuis ce canal seul",
              "Contactez votre interlocuteur par un moyen vérifié",
              "security@blocktrust.tech",
            ].map((item) => (
              <li key={item} className="flex gap-2 text-xs leading-relaxed text-white/55">
                <span className="text-xs text-[#00d4ff]/70" aria-hidden>
                  →
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        <a
          href="https://blocktrust.tech"
          className="relative z-10 font-syne text-xs text-[#00d4ff]/60 transition hover:text-[#00d4ff]"
          rel="noopener noreferrer"
        >
          BLOCKTRUST™ — Certifier votre identité →
        </a>
      </div>
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
