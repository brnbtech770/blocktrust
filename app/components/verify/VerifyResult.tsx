"use client";

import Link from "next/link";
import {
  AlertTriangle,
  Check,
  Clock,
  Globe,
  Mail,
  Minus,
  Phone,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";
import type { TrustEngineResult } from "@/lib/trust-engine";
import { VERIFY_COLORS, type Verdict } from "@/app/components/verify/verify-types";

function scoreTextColor(score: number): string {
  if (score >= 75) return "text-[#10b981]";
  if (score >= 50) return "text-[#BDA76B]";
  return "text-[#E05252]";
}

function OfficialTrustBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#BDA76B]/40 bg-[#BDA76B]/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[#BDA76B]">
      <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
      Compte officiel BLOCKTRUST™
    </span>
  );
}

function mainTrustSignals(engine: TrustEngineResult | null) {
  const find = (type: string) => engine?.signals.find((s) => s.type === type);
  const kyc = find("KYC_VERIFIED");
  const network = find("IN_YOUR_NETWORK");

  return [
    {
      id: "kyc",
      label: "Vérification d'identité",
      ok: Boolean(kyc),
      Icon: ShieldCheck,
      color: "#10b981",
    },
    {
      id: "network",
      label: "Dans votre réseau",
      ok: Boolean(network),
      Icon: Users,
      color: "#00d4ff",
    },
  ];
}

export function ValidWowView({
  displayName,
  holderEmail,
  dateLabel,
  linkKind,
  rotatingExpiresAt,
  trustEngine,
  identityVerified,
  walletAddress,
  walletNetworkDisplay,
  certifiedDomains,
  certifiedEmails,
  certifiedPhones,
  sessionUser,
  vaultMatchBanner,
  contactAddState,
  contactAddMessage,
  onAddContact,
}: {
  displayName: string;
  holderEmail: string | null;
  dateLabel: string;
  linkKind: "rotating" | "permanent";
  rotatingExpiresAt: string | null;
  trustEngine: TrustEngineResult | null;
  identityVerified: boolean;
  walletAddress: string | null;
  walletNetworkDisplay: string | null;
  certifiedDomains: string[];
  certifiedEmails: string[];
  certifiedPhones: string[];
  sessionUser: { email?: string | null; name?: string | null } | null;
  vaultMatchBanner: { inOrganization: boolean; match: boolean } | null;
  contactAddState: "idle" | "loading" | "done" | "error";
  contactAddMessage: string | null;
  onAddContact: () => void;
}) {
  const isAuthenticated = Boolean(sessionUser);
  const signals = mainTrustSignals(trustEngine);
  const canAddContact = Boolean(sessionUser && certifiedEmails[0]?.trim());

  return (
    <div className="mx-auto mt-8 flex w-full max-w-lg flex-col items-center gap-7 px-2 sm:max-w-xl">
      <div className="relative mx-auto flex w-full max-w-[300px] flex-col items-center animate-badge-pop opacity-0">
        <div
          className="absolute inset-0 scale-125 rounded-full blur-3xl"
          style={{ backgroundColor: `${VERIFY_COLORS.valid}40` }}
          aria-hidden
        />
        <BlockTrustBadge
          size={140}
          instanceId="verify-public"
          tagline="preview"
          className="relative z-10 [&_svg]:drop-shadow-[0_0_28px_rgba(16,185,129,0.45)]"
        />
      </div>

      <div
        className="flex animate-fade-up items-center justify-center gap-2 opacity-0"
        style={{ animationDelay: "120ms" }}
      >
        <div
          className="h-3 w-3 animate-pulse rounded-full"
          style={{ backgroundColor: identityVerified ? VERIFY_COLORS.valid : "#f59e0b" }}
          aria-hidden
        />
        <span
          className="font-syne text-lg font-semibold uppercase tracking-widest"
          style={{ color: identityVerified ? VERIFY_COLORS.valid : "#f59e0b" }}
        >
          {identityVerified ? "Identité certifiée BLOCKTRUST™" : "Identité déclarée — non vérifiée"}
        </span>
      </div>

      <p
        className="font-syne animate-fade-up text-2xl font-bold text-white opacity-0 sm:text-3xl"
        style={{ animationDelay: "180ms" }}
      >
        {displayName}
      </p>

      <div
        className="w-full rounded-xl border border-[#f59e0b]/35 bg-[#1a1a2e] px-4 py-3 text-left text-sm leading-relaxed text-white/70"
        style={{ borderLeftWidth: 3, borderLeftColor: "#f59e0b" }}
        role="note"
      >
        <p>
          Ce badge appartient à <strong className="text-white">{displayName}</strong>
          {holderEmail ? (
            <>
              {" "}
              (<span className="font-mono text-white/80">{holderEmail}</span>)
            </>
          ) : null}
          . Vérifiez que cette personne correspond bien à votre interlocuteur.
        </p>
        <p className="mt-2">
          Un badge copié par un tiers ne garantit PAS son identité. En cas de doute, demandez un
          nouveau lien de vérification directement à votre interlocuteur.
        </p>
        {linkKind === "rotating" ? (
          <p className="mt-2 text-[#10b981]">
            Ce lien a été généré spécifiquement pour ce partage
            {rotatingExpiresAt
              ? ` et expirera le ${new Date(rotatingExpiresAt).toLocaleString("fr-FR", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}.`
              : "."}
          </p>
        ) : (
          <p className="mt-2 text-white/55">
            Ce lien est permanent. Si vous avez un doute sur l&apos;identité de la personne qui vous
            l&apos;a envoyé, demandez-lui un lien de vérification temporaire.
          </p>
        )}
      </div>

      {!identityVerified ? (
        <div
          className="w-full animate-fade-up rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-center text-sm leading-relaxed text-[#f59e0b] opacity-0"
          style={{ animationDelay: "200ms" }}
        >
          Cette identité a été <strong>déclarée par son titulaire</strong> mais n&apos;a pas été
          vérifiée par contrôle d&apos;identité. Le nom affiché n&apos;est pas une
          identité certifiée par BLOCKTRUST™.
        </div>
      ) : null}

      {isAuthenticated && trustEngine ? (
        <>
          <div
            className="animate-fade-up text-center opacity-0"
            style={{ animationDelay: "240ms" }}
          >
            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-white/45">
              Score de confiance
            </p>
            <p
              className={`font-syne text-6xl font-bold tabular-nums sm:text-7xl ${scoreTextColor(trustEngine.globalScore)}`}
            >
              {trustEngine.globalScore}
              <span className="text-2xl font-semibold text-white/35 sm:text-3xl">/100</span>
            </p>
            <p className="mt-2 text-sm text-white/45">{trustEngine.contextLabel}</p>
            {trustEngine.isOfficialAccount ? (
              <div className="mt-3 flex justify-center">
                <OfficialTrustBadge />
              </div>
            ) : null}
          </div>

          <div
            className="grid w-full animate-fade-up grid-cols-1 gap-3 opacity-0 sm:grid-cols-2"
            style={{ animationDelay: "300ms" }}
          >
            {signals.map((signal) => {
              const Icon = signal.Icon;
              return (
                <div
                  key={signal.id}
                  className={`rounded-xl border p-4 text-left transition ${
                    signal.ok
                      ? "border-white/10 bg-white/[0.04]"
                      : "border-white/5 bg-white/[0.02]"
                  }`}
                >
                  <div className="mb-2 flex items-center justify-between">
                    <Icon
                      className="h-5 w-5"
                      style={{ color: signal.ok ? signal.color : "#64748b" }}
                      aria-hidden
                    />
                    {signal.ok ? (
                      <Check className="h-4 w-4 text-[#10b981]" aria-hidden />
                    ) : (
                      <X className="h-4 w-4 text-white/25" aria-hidden />
                    )}
                  </div>
                  <p className={`text-sm font-medium ${signal.ok ? "text-white" : "text-white/45"}`}>
                    {signal.label}
                  </p>
                </div>
              );
            })}
          </div>
        </>
      ) : null}

      {!isAuthenticated ? (
        <div
          className="w-full animate-fade-up overflow-hidden rounded-2xl border border-[#00d4ff]/25 bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] p-5 text-center opacity-0 sm:p-6"
          style={{ animationDelay: "300ms" }}
        >
          <div
            aria-hidden
            className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-xl border border-[#00d4ff]/30 bg-[#00d4ff]/10"
          >
            <ShieldCheck className="h-5 w-5 text-[#00d4ff]" />
          </div>
          <p className="font-syne text-base font-semibold text-white">
            Voir le score de confiance complet
          </p>
          <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-white/55">
            Créez votre compte gratuit pour voir le score de confiance complet et certifier votre
            propre identité.
          </p>
          <Link
            href="/auth/signin"
            className="mt-4 inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-5 py-2.5 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/25"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
            Commencer gratuitement
          </Link>
        </div>
      ) : null}

      <p
        className="animate-fade-up text-sm text-white/40 opacity-0"
        style={{ animationDelay: "360ms" }}
      >
        Certifié le {dateLabel}
        {" · "}Vérifié à l&apos;instant
      </p>

      {canAddContact ? (
        <div
          className="w-full animate-fade-up opacity-0"
          style={{ animationDelay: "400ms" }}
        >
          <button
            type="button"
            onClick={onAddContact}
            disabled={contactAddState === "loading" || contactAddState === "done"}
            className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-xl border border-[#00d4ff]/40 bg-[#00d4ff]/15 px-5 py-3 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/25 disabled:pointer-events-none disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4 shrink-0" aria-hidden />
            {contactAddState === "loading"
              ? "Ajout en cours…"
              : contactAddState === "done"
                ? "Contact ajouté"
                : "Ajouter à mes contacts"}
          </button>
          {contactAddMessage ? (
            <p
              role="status"
              className={`mt-2 text-center text-xs ${
                contactAddState === "error" ? "text-[#E05252]" : "text-[#10b981]"
              }`}
            >
              {contactAddMessage}
            </p>
          ) : null}
        </div>
      ) : !sessionUser ? (
        <p
          className="animate-fade-up text-center text-xs text-white/35 opacity-0"
          style={{ animationDelay: "400ms" }}
        >
          <Link href="/auth/signin" className="text-[#00d4ff] hover:underline">
            Connectez-vous
          </Link>{" "}
          pour ajouter ce contact à votre réseau de confiance
        </p>
      ) : null}

      {walletAddress?.trim() ? (
        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
          <p className="mb-2 text-xs uppercase tracking-widest text-[#00d4ff]">
            Wallet certifié
          </p>
          <p className="break-all font-mono text-xs text-white/70">{walletAddress.trim()}</p>
          <p className="mt-1 text-xs text-white/30">
            Réseau : {walletNetworkDisplay ?? "—"}
          </p>
        </div>
      ) : null}

      {(certifiedDomains.length > 0 ||
        certifiedEmails.length > 0 ||
        certifiedPhones.length > 0) ? (
        <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
          <p className="mb-3 text-xs uppercase tracking-widest text-[#00d4ff]">
            Points de contact certifiés
          </p>

          {certifiedDomains.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1 text-xs text-white/40">Domaines officiels</p>
              {certifiedDomains.map((d) => (
                <p
                  key={d}
                  className="flex items-center gap-2 font-mono text-xs text-white/70"
                >
                  <Globe className="size-3 shrink-0 text-[#00d4ff]" aria-hidden />
                  {d}
                </p>
              ))}
            </div>
          ) : null}

          {certifiedEmails.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1 text-xs text-white/40">Emails officiels</p>
              {certifiedEmails.map((e) => (
                <p
                  key={e}
                  className="flex items-center gap-2 break-all font-mono text-xs text-white/70"
                >
                  <Mail className="size-3 shrink-0 text-[#00d4ff]" aria-hidden />
                  {e}
                </p>
              ))}
            </div>
          ) : null}

          {certifiedPhones.length > 0 ? (
            <div className="mb-3">
              <p className="mb-1 text-xs text-white/40">Téléphones officiels</p>
              {certifiedPhones.map((p) => (
                <p
                  key={p}
                  className="flex items-center gap-2 font-mono text-xs text-white/70"
                >
                  <Phone className="size-3 shrink-0 text-[#00d4ff]" aria-hidden />
                  {p}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {sessionUser &&
      vaultMatchBanner?.inOrganization &&
      vaultMatchBanner.match ? (
        <div
          role="status"
          className="w-full rounded-xl border border-[#10b981]/35 bg-[#10b981]/10 px-4 py-3 text-left text-sm text-[#10b981]/95"
        >
          Ces coordonnées certifiées correspondent à une référence enregistrée dans le BLOCKTRUST™ Vault de
          votre organisation.
        </div>
      ) : null}

      {sessionUser &&
      vaultMatchBanner?.inOrganization &&
      !vaultMatchBanner.match ? (
        <div
          role="status"
          className="w-full rounded-xl border border-[#f59e0b]/35 bg-[#f59e0b]/10 px-4 py-3 text-left text-sm text-[#f59e0b]/95"
        >
          Aucune entrée de votre coffre équipe ne correspond à ces coordonnées certifiées. Vérifiez
          l&apos;identité avec attention.
        </div>
      ) : null}

      {isAuthenticated && trustEngine && trustEngine.signals.length > 3 ? (
        <TrustEnginePanel engine={trustEngine} />
      ) : null}

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
              <Check
                className="mt-0.5 h-3.5 w-3.5 shrink-0"
                style={{ color: VERIFY_COLORS.valid }}
                aria-hidden
              />
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
    </div>
  );
}

function TrustEnginePanel({ engine }: { engine: TrustEngineResult }) {
  const scoreColor =
    engine.globalScore >= 75
      ? "text-emerald-400"
      : engine.globalScore >= 50
        ? "text-[#BDA76B]"
        : "text-[#E05252]";

  const recommendationColor =
    engine.recommendation === "TRUST"
      ? "text-emerald-400"
      : engine.recommendation === "VERIFY"
        ? "text-[#BDA76B]"
        : "text-[#E05252]";

  return (
    <div className="mt-4 w-full space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-left">
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-widest text-white/50">
          Score de confiance
        </span>
        <span className={`text-lg font-bold ${scoreColor}`}>
          {engine.globalScore}/100
        </span>
      </div>
      {engine.isOfficialAccount ? (
        <div className="pt-1">
          <OfficialTrustBadge />
        </div>
      ) : null}

      {engine.signals.map((signal) => (
        <div key={signal.type} className="flex flex-col gap-1 border-b border-white/5 py-2 text-xs last:border-0 sm:flex-row sm:items-center sm:gap-2 sm:border-0 sm:py-1">
          <div className="flex items-center gap-2">
            {signal.impact === "positive" ? (
              <Check className="h-3.5 w-3.5 shrink-0 text-emerald-400" aria-hidden />
            ) : signal.impact === "negative" ? (
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-[#E05252]" aria-hidden />
            ) : (
              <Minus className="h-3.5 w-3.5 shrink-0 text-white/40" aria-hidden />
            )}
            <span className="text-white/60">{signal.label}</span>
          </div>
          {signal.detail ? (
            <span className="pl-6 text-white/30 sm:ml-auto sm:pl-0">{signal.detail}</span>
          ) : null}
        </div>
      ))}

      <div className={`mt-2 text-xs font-semibold ${recommendationColor}`}>
        {engine.contextLabel}
      </div>
    </div>
  );
}

export function FraudCertificateCard() {
  const tips = [
    "Ne transmettez aucune donnée sensible à ce canal.",
    "Contactez votre interlocuteur par un moyen que vous avez déjà vérifié.",
    "Signalez une suspicion à security@blocktrust.tech.",
  ];

  return (
    <div className="mx-auto flex w-full max-w-sm animate-pulse flex-col items-center gap-6 rounded-[1.75rem] border-2 border-[#ef4444] p-4 text-center shadow-[0_0_32px_rgba(239,68,68,0.22)] sm:p-5">
      <div className="relative flex w-full flex-col items-center gap-6">
        <div
          className="pointer-events-none absolute inset-1 -z-0 scale-[1.4] animate-pulse rounded-full blur-2xl bg-[#ef4444]/28"
          aria-hidden
        />

        <div className="relative z-10 flex h-28 w-28 shrink-0 items-center justify-center rounded-full border-2 border-[#ef4444]/80 bg-[#ef4444]/10 shadow-inner">
          <ShieldAlert className="h-12 w-12 shrink-0 text-[#ef4444]" strokeWidth={2} aria-hidden />
        </div>

        <p className="font-syne relative z-10 text-lg font-semibold leading-snug text-[#ef4444]">
          Tentative de fraude détectée
        </p>

        <p className="relative z-10 max-w-[22rem] text-sm leading-relaxed text-white/50">
          Cet identifiant de badge ne correspond à aucun certificat BLOCKTRUST. Il a probablement été falsifié ou
          modifié.
        </p>

        <div className="relative z-10 w-full rounded-xl border border-[#ef4444]/40 bg-[#ef4444]/10 p-4 text-left">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#ef4444]">Que faire ?</p>
          <ul className="space-y-1.5">
            {tips.map((item) => (
              <li key={item} className="flex gap-2 text-xs leading-relaxed text-[#fca5a5]/95">
                <span className="text-[#ef4444]" aria-hidden>
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

export function FailVerdictCard({
  verdict,
}: {
  verdict: Exclude<Verdict, "VALID" | "VALID_WITH_WARNING" | "FRAUD">;
}) {
  const isTampered = verdict === "TAMPERED";
  const isExpired = verdict === "EXPIRED";
  const isRevoked = verdict === "REVOKED";
  const isInvalid = verdict === "INVALID";
  const isError = verdict === "ERROR";

  type Visual = {
    halo: string;
    disk: string;
    iconClass: string;
    labelClass: string;
    label: string;
    subtitle: string;
    Icon: typeof ShieldAlert | typeof Clock | typeof ShieldOff;
    labelNormalCase?: boolean;
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
  } else if (isInvalid) {
    v = {
      halo: "bg-[#f59e0b]/20",
      disk: "border-2 border-[#f59e0b]/65 bg-[#f59e0b]/08",
      iconClass: "text-[#f59e0b]",
      labelClass: "text-[#f59e0b]",
      label: "Badge invalide",
      subtitle:
        "Le jeton ou le contexte de vérification n’est pas reconnu. Ouvrez le lien ou le QR officiel depuis le message certifié BLOCKTRUST™.",
      Icon: ShieldOff,
      labelNormalCase: true,
    };
  } else if (isError) {
    v = {
      halo: "bg-[#f59e0b]/20",
      disk: "border-2 border-[#f59e0b]/65 bg-[#f59e0b]/08",
      iconClass: "text-[#f59e0b]",
      labelClass: "text-[#f59e0b]",
      label: "Badge invalide",
      subtitle: "La vérification n’a pas pu aboutir. Réessayez dans un instant ou utilisez un autre lien officiel.",
      Icon: ShieldOff,
      labelNormalCase: true,
    };
  } else {
    verdict satisfies never;
    throw new Error("verdict inattendu");
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

        <span
          className={`font-syne relative z-10 text-lg font-semibold ${v.labelNormalCase ? "" : "uppercase tracking-widest"} ${v.labelClass}`}
        >
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

