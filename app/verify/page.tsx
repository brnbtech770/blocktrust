"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clock,
  Globe,
  Link2,
  Mail,
  Minus,
  Phone,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Logo } from "@/app/components/ui/Logo";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";
import type { TrustEngineResult } from "@/lib/trust-engine";

const C = {
  valid: "#10b981",
  expired: "#f59e0b",
  revoked: "#E05252",
  tampered: "#ef4444",
  invalid: "#E05252",
} as const;

const VERIFY_FETCH_TIMEOUT_MS = 8000;

const VERIFY_TIMEOUT_MESSAGE =
  "La vérification a pris trop de temps. Réessayez.";

function isAbortError(e: unknown): boolean {
  return (
    (e instanceof DOMException && e.name === "AbortError") ||
    (e instanceof Error && e.name === "AbortError")
  );
}

/** URL absolue ou chemin relatif type /verify?… (base prod pour le parse). */
function tryParseUserPastedUrl(input: string): URL | null {
  const t = input.trim();
  if (!t) return null;
  try {
    return new URL(t);
  } catch {
    try {
      return new URL(t, "https://blocktrust.tech");
    } catch {
      return null;
    }
  }
}

function extractVtFromUrl(input: string): string | null {
  const url = tryParseUserPastedUrl(input);
  if (!url) return null;
  const vt = url.searchParams.get("vt")?.trim();
  return vt && vt.length > 0 ? vt : null;
}

function extractCertId(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;

  const url = tryParseUserPastedUrl(trimmed);
  if (url) {
    const certId = url.searchParams.get("certId")?.trim();
    if (certId && certId.length > 0) return certId;

    const segments = url.pathname.split("/").filter(Boolean);
    const verifyIdx = segments.indexOf("verify");
    if (verifyIdx >= 0 && segments[verifyIdx + 1]) {
      const idSegment = segments[verifyIdx + 1];
      if (idSegment !== "qr" && idSegment.length > 5) return idSegment;
    }
  }

  const pathMatch = trimmed.match(/\/verify\/([^/?#\s]+)/);
  if (
    pathMatch?.[1] &&
    pathMatch[1] !== "qr" &&
    pathMatch[1].length > 5
  ) {
    return pathMatch[1];
  }

  return trimmed;
}

type Verdict =
  | "VALID"
  | "VALID_WITH_WARNING"
  | "TAMPERED"
  | "REVOKED"
  | "EXPIRED"
  | "INVALID"
  | "FRAUD"
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
  walletAddress?: string;
  walletNetwork?: string;
  walletNetworkDisplay?: string;
  certifiedDomains?: string[];
  certifiedEmails?: string[];
  certifiedPhones?: string[];
  trustEngine?: TrustEngineResult | null;
  identityVerified?: boolean;
  polygonAnchored?: boolean;
  polygonExplorerUrl?: string | null;
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
  const { data: session } = useSession();
  const router = useRouter();
  const sp = useSearchParams();
  const certIdQuery = sp.get("certId")?.trim() ?? "";
  const vtQuery = sp.get("vt")?.trim() ?? "";
  const [resolvedVtCertId, setResolvedVtCertId] = useState<string | null>(null);
  const [vtResolveStatus, setVtResolveStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [token, setToken] = useState("");
  const [tokenFixApplied, setTokenFixApplied] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [entityName, setEntityName] = useState<string | null>(null);
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletNetworkDisplay, setWalletNetworkDisplay] = useState<string | null>(null);
  const [certifiedDomains, setCertifiedDomains] = useState<string[]>([]);
  const [certifiedEmails, setCertifiedEmails] = useState<string[]>([]);
  const [certifiedPhones, setCertifiedPhones] = useState<string[]>([]);
  const [manualIdInput, setManualIdInput] = useState("");
  const [verifyErrorMessage, setVerifyErrorMessage] = useState<string | null>(null);
  const [vaultMatchBanner, setVaultMatchBanner] = useState<{
    inOrganization: boolean;
    match: boolean;
  } | null>(null);
  const [trustEngine, setTrustEngine] = useState<TrustEngineResult | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [polygonAnchored, setPolygonAnchored] = useState(false);
  const [polygonExplorerUrl, setPolygonExplorerUrl] = useState<string | null>(null);
  const [contactAddState, setContactAddState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [contactAddMessage, setContactAddMessage] = useState<string | null>(null);

  const hasValidToken = token.trim().length > 10;

  const handleManualVerify = () => {
    const raw = manualIdInput.trim();
    if (!raw) return;

    const vt = extractVtFromUrl(raw);
    if (vt) {
      window.location.href = `/verify?vt=${encodeURIComponent(vt)}`;
      return;
    }

    const id = extractCertId(raw);
    if (!id) return;

    window.location.href = `/verify?certId=${encodeURIComponent(id)}`;
  };

  const context = useMemo(
    () => ({
      from: "contact@brnb.fr",
      to: "test@client.com",
      subject: "Test BLOCKTRUST™ V2",
      date: new Date().toISOString(),
      body: "Hello",
    }),
    []
  );

  useEffect(() => {
    const directRaw = sp.get("token")?.trim() ?? "";
    if (directRaw.length > 10) {
      setToken(directRaw);
      return;
    }

    if (certIdQuery || vtQuery) {
      setToken("");
      return;
    }

    const tokenParam = sp.get("token");
    if (tokenParam !== null && tokenParam.trim().length <= 10) {
      setToken("");
    }

    const search = window.location.search;
    if (search.includes("token%3D")) {
      const fixedSearch = search.replace(/token%3D/g, "token=");
      const params = new URLSearchParams(fixedSearch);
      const fixedToken = params.get("token")?.trim() ?? "";
      if (fixedToken.length > 10) {
        setToken(fixedToken);
        setTokenFixApplied(true);
      }
    }
  }, [sp, certIdQuery, vtQuery]);

  useEffect(() => {
    if (!vtQuery) {
      setResolvedVtCertId(null);
      setVtResolveStatus("idle");
      return;
    }

    const ac = new AbortController();
    let cancelled = false;
    const timeoutId = setTimeout(() => ac.abort(), VERIFY_FETCH_TIMEOUT_MS);

    setVtResolveStatus("loading");
    setResolvedVtCertId(null);

    void (async () => {
      try {
        const res = await fetch(
          `/api/verify/resolve-token?vt=${encodeURIComponent(vtQuery)}`,
          { signal: ac.signal },
        );
        clearTimeout(timeoutId);
        const data = (await res.json()) as { certId?: string; error?: string };
        if (cancelled) return;
        if (typeof data.certId === "string" && data.certId.length > 0) {
          setResolvedVtCertId(data.certId);
          setVtResolveStatus("ok");
        } else {
          setVtResolveStatus("error");
        }
      } catch (e: unknown) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        setVtResolveStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, [vtQuery]);

  const certIdForVerify = vtQuery
    ? vtResolveStatus === "ok" && resolvedVtCertId
      ? resolvedVtCertId
      : ""
    : certIdQuery;

  useEffect(() => {
    const trimmed = token.trim();
    if (trimmed.length <= 10) return;

    setVerdict(null);
    setVerifyErrorMessage(null);
    setIdentityVerified(false);
    setPolygonAnchored(false);
    setPolygonExplorerUrl(null);
    setEntityName(null);
    setCertifiedAt(null);
    setWalletAddress(null);
    setWalletNetworkDisplay(null);
    setCertifiedDomains([]);
    setCertifiedEmails([]);
    setCertifiedPhones([]);
    setTrustEngine(null);
    setContactAddState("idle");
    setContactAddMessage(null);

    const ac = new AbortController();
    let cancelled = false;
    const timeoutId = setTimeout(() => ac.abort(), VERIFY_FETCH_TIMEOUT_MS);

    void (async () => {
      try {
        const res = await fetch("/api/v2/verify", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: trimmed, context }),
          signal: ac.signal,
        });
        clearTimeout(timeoutId);
        const data = (await res.json()) as VerifyApiSuccess;
        if (cancelled) return;
        setVerdict((data.verdict as Verdict) ?? "ERROR");
        setEntityName(data.entityName ?? null);
        setCertifiedAt(data.certifiedAt ?? null);
        setWalletAddress(data.walletAddress?.trim() ? data.walletAddress : null);
        setWalletNetworkDisplay(
          data.walletNetworkDisplay?.trim()
            ? data.walletNetworkDisplay
            : data.walletNetwork?.trim()
              ? data.walletNetwork
              : null,
        );
        setCertifiedDomains(
          Array.isArray(data.certifiedDomains) ? data.certifiedDomains : [],
        );
        setCertifiedEmails(
          Array.isArray(data.certifiedEmails) ? data.certifiedEmails : [],
        );
        setCertifiedPhones(
          Array.isArray(data.certifiedPhones) ? data.certifiedPhones : [],
        );
      } catch (e: unknown) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (isAbortError(e)) {
          setVerdict("ERROR");
          setVerifyErrorMessage(VERIFY_TIMEOUT_MESSAGE);
          return;
        }
        setVerdict("ERROR");
        setVerifyErrorMessage(null);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, [token, context]);

  useEffect(() => {
    if (hasValidToken || !certIdForVerify) return;

    setVerdict(null);
    setVerifyErrorMessage(null);
    setIdentityVerified(false);
    setPolygonAnchored(false);
    setPolygonExplorerUrl(null);
    setEntityName(null);
    setCertifiedAt(null);
    setWalletAddress(null);
    setWalletNetworkDisplay(null);
    setCertifiedDomains([]);
    setCertifiedEmails([]);
    setCertifiedPhones([]);
    setTrustEngine(null);
    setContactAddState("idle");
    setContactAddMessage(null);

    const ac = new AbortController();
    let cancelled = false;
    const timeoutId = setTimeout(() => ac.abort(), VERIFY_FETCH_TIMEOUT_MS);

    void (async () => {
      try {
        const res = await fetch(`/api/public/certificate/${encodeURIComponent(certIdForVerify)}`, {
          signal: ac.signal,
        });
        clearTimeout(timeoutId);
        const data = (await res.json()) as VerifyApiSuccess;
        if (cancelled) return;
        setVerdict((data.verdict as Verdict) ?? "ERROR");
        setEntityName(data.entityName ?? null);
        setCertifiedAt(data.certifiedAt ?? null);
        setWalletAddress(data.walletAddress?.trim() ? data.walletAddress : null);
        setWalletNetworkDisplay(
          data.walletNetworkDisplay?.trim()
            ? data.walletNetworkDisplay
            : data.walletNetwork?.trim()
              ? data.walletNetwork
              : null,
        );
        setCertifiedDomains(
          Array.isArray(data.certifiedDomains) ? data.certifiedDomains : [],
        );
        setCertifiedEmails(
          Array.isArray(data.certifiedEmails) ? data.certifiedEmails : [],
        );
        setCertifiedPhones(
          Array.isArray(data.certifiedPhones) ? data.certifiedPhones : [],
        );
        setTrustEngine(data.trustEngine ?? null);
        setIdentityVerified(Boolean(data.identityVerified));
        setPolygonAnchored(Boolean(data.polygonAnchored));
        setPolygonExplorerUrl(
          data.polygonExplorerUrl?.trim() ? data.polygonExplorerUrl : null,
        );
      } catch (e: unknown) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        if (isAbortError(e)) {
          setVerdict("ERROR");
          setVerifyErrorMessage(VERIFY_TIMEOUT_MESSAGE);
          return;
        }
        setVerdict("ERROR");
        setVerifyErrorMessage(null);
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, [hasValidToken, certIdForVerify]);

  const dateLabel = formatCertifiedDate(certifiedAt);
  const displayName = entityName?.trim() || "Titulaire certifié";

  const showSuccess = verdict === "VALID" || verdict === "VALID_WITH_WARNING";

  const failVerdict =
    verdict === "TAMPERED" ||
    verdict === "REVOKED" ||
    verdict === "EXPIRED" ||
    verdict === "INVALID" ||
    verdict === "FRAUD" ||
    verdict === "ERROR";

  useEffect(() => {
    setVaultMatchBanner(null);
    if (!showSuccess || !session?.user) return;
    if (certifiedEmails.length === 0 && certifiedDomains.length === 0) return;

    let cancelled = false;
    void (async () => {
      const res = await fetch("/api/vault/check-match", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          emails: certifiedEmails,
          domains: certifiedDomains,
        }),
      });
      const j = (await res.json()) as { inOrganization?: boolean; match?: boolean };
      if (cancelled || !res.ok) return;
      setVaultMatchBanner({
        inOrganization: Boolean(j.inOrganization),
        match: Boolean(j.match),
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [showSuccess, session?.user, certifiedEmails, certifiedDomains]);

  const activeQuery = Boolean(
    hasValidToken ||
      certIdForVerify ||
      (vtQuery && (vtResolveStatus === "loading" || vtResolveStatus === "ok")),
  );
  const showManualVerifier =
    !hasValidToken &&
    !certIdForVerify &&
    !(vtQuery && vtResolveStatus === "loading");

  const resetVerification = () => {
    setVerdict(null);
    setManualIdInput("");
    setEntityName(null);
    setCertifiedAt(null);
    setWalletAddress(null);
    setWalletNetworkDisplay(null);
    setCertifiedDomains([]);
    setCertifiedEmails([]);
    setCertifiedPhones([]);
    setTrustEngine(null);
    setIdentityVerified(false);
    setPolygonAnchored(false);
    setPolygonExplorerUrl(null);
    setContactAddState("idle");
    setContactAddMessage(null);
    setToken("");
    setTokenFixApplied(false);
    setVerifyErrorMessage(null);
    setVaultMatchBanner(null);
    router.replace("/verify");
  };

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

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-16 pt-2 sm:max-w-lg sm:pt-4">
        {showManualVerifier ? (
          <div className="w-full shrink-0">
            <p className="mb-3 text-center text-xs text-white/45">
              Vérifier un badge manuellement
            </p>
            <div className="flex flex-col gap-3 sm:flex-row sm:gap-2">
              <input
                type="text"
                placeholder="URL ou ID du badge…"
                aria-label="URL ou identifiant du badge à vérifier"
                className="min-h-[48px] flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-[#00d4ff]/50 focus:ring-2 focus:ring-[#00d4ff]/15"
                value={manualIdInput}
                onChange={(e) => setManualIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleManualVerify()}
              />
              <button
                type="button"
                onClick={handleManualVerify}
                disabled={!manualIdInput.trim()}
                className="flex min-h-[48px] w-full shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/20 px-5 py-3 text-sm font-semibold text-[#00d4ff] transition hover:bg-[#00d4ff]/30 disabled:pointer-events-none disabled:opacity-40 sm:w-auto sm:px-4"
              >
                <Search className="h-4 w-4 shrink-0" aria-hidden />
                Vérifier
              </button>
            </div>
          </div>
        ) : null}

        {!hasValidToken && !certIdQuery && !vtQuery && (
          <div className="mx-auto mt-10 max-w-md text-center">
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

        {vtQuery && vtResolveStatus === "error" ? (
          <div className="mx-auto mt-10 max-w-md text-center">
            <Clock className="mx-auto mb-4 h-10 w-10 text-[#f59e0b]/70" aria-hidden />
            <p className="font-syne text-lg text-[#f59e0b]">
              Lien expiré ou invalide
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/45">
              Ce lien sécurisé n&apos;est plus valide ou a déjà été utilisé. Demandez un nouveau lien à l&apos;émetteur du
              badge.
            </p>
          </div>
        ) : null}

        {tokenFixApplied ? (
          <div
            role="status"
            className="mt-8 w-full max-w-sm rounded-xl border border-bt-cyan/35 bg-[#00d4ff]/10 px-4 py-3 text-center text-sm text-[#00d4ff]"
          >
            Lien corrigé automatiquement (jeton encodé).
          </div>
        ) : null}

        {(hasValidToken ||
          certIdForVerify ||
          (vtQuery && vtResolveStatus === "loading")) &&
        !verdict ? (
          <div className="mt-12 flex flex-col items-center gap-4">
            <div
              className="h-16 w-16 animate-spin rounded-full border-2 border-[#00d4ff]/30 border-t-[#00d4ff]"
              aria-hidden
            />
            <p className="text-sm text-white/50">Vérification en cours...</p>
          </div>
        ) : null}

        {verdict && showSuccess ? (
          <ValidWowView
            displayName={displayName}
            dateLabel={dateLabel}
            trustEngine={trustEngine}
            identityVerified={identityVerified}
            polygonAnchored={polygonAnchored}
            polygonExplorerUrl={polygonExplorerUrl}
            walletAddress={walletAddress}
            walletNetworkDisplay={walletNetworkDisplay}
            certifiedDomains={certifiedDomains}
            certifiedEmails={certifiedEmails}
            certifiedPhones={certifiedPhones}
            sessionUser={session?.user ?? null}
            vaultMatchBanner={vaultMatchBanner}
            contactAddState={contactAddState}
            contactAddMessage={contactAddMessage}
            onAddContact={async () => {
              const email = certifiedEmails[0]?.trim();
              if (!email || !session?.user) return;
              setContactAddState("loading");
              setContactAddMessage(null);
              try {
                const res = await fetch("/api/trust-circle/add", {
                  method: "POST",
                  headers: { "content-type": "application/json" },
                  body: JSON.stringify({
                    email,
                    name: displayName,
                    entityType: "INDIVIDUAL",
                  }),
                });
                const data = (await res.json()) as {
                  error?: string;
                  message?: string;
                };
                if (!res.ok) {
                  if (res.status === 409) {
                    setContactAddState("done");
                    setContactAddMessage("Ce contact est déjà dans votre réseau.");
                    return;
                  }
                  throw new Error(data.message ?? data.error ?? "Erreur");
                }
                setContactAddState("done");
                setContactAddMessage(data.message ?? "Contact ajouté à votre réseau.");
              } catch (e: unknown) {
                setContactAddState("error");
                setContactAddMessage(
                  e instanceof Error ? e.message : "Impossible d'ajouter le contact.",
                );
              }
            }}
          />
        ) : null}

        {verdict && failVerdict ? (
          <div className="mt-10 w-full">
            {verifyErrorMessage && verdict === "ERROR" ? (
              <p
                className="mx-auto mb-4 max-w-md px-2 text-center text-sm text-amber-300/95"
                role="alert"
              >
                {verifyErrorMessage}
              </p>
            ) : null}
            {verdict === "FRAUD" ? (
              <FraudCertificateCard />
            ) : (
              <FailVerdictCard verdict={verdict} />
            )}
          </div>
        ) : null}

        {verdict ? (
          <button
            type="button"
            onClick={resetVerification}
            className="mx-auto mt-8 flex min-h-[44px] w-full max-w-xs items-center justify-center gap-1.5 rounded-lg px-4 py-3 text-sm text-white/45 transition hover:bg-white/[0.06] hover:text-white/75 sm:w-auto"
          >
            <RotateCcw className="h-3 w-3 shrink-0" aria-hidden />
            Nouvelle vérification
          </button>
        ) : null}

        <div
          className={`mx-auto w-full max-w-sm border-t border-white/5 pt-6 ${activeQuery || verdict ? "mt-12" : "mt-10"}`}
        >
          <p className="text-center text-xs italic leading-relaxed text-white/20">
            Un badge BLOCKTRUST™ sans QR scannable ou lien de vérification ne garantit aucune authenticité.
            <span className="mt-1 block text-white/30">
              Vérifiez toujours avant de faire confiance.
            </span>
          </p>
        </div>
      </main>
    </div>
  );
}

function scoreTextColor(score: number): string {
  if (score >= 75) return "text-[#10b981]";
  if (score >= 50) return "text-[#BDA76B]";
  return "text-[#E05252]";
}

function mainTrustSignals(engine: TrustEngineResult | null) {
  const find = (type: string) => engine?.signals.find((s) => s.type === type);
  const kyc = find("KYC_VERIFIED");
  const network = find("IN_YOUR_NETWORK");
  const polygon = find("BLOCKCHAIN_ANCHORED");

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
    {
      id: "polygon",
      label: "Ancré Polygon",
      ok: Boolean(polygon),
      Icon: Link2,
      color: "#BDA76B",
    },
  ];
}

function ValidWowView({
  displayName,
  dateLabel,
  trustEngine,
  identityVerified,
  polygonAnchored,
  polygonExplorerUrl,
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
  dateLabel: string;
  trustEngine: TrustEngineResult | null;
  identityVerified: boolean;
  polygonAnchored: boolean;
  polygonExplorerUrl: string | null;
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
          style={{ backgroundColor: `${C.valid}40` }}
          aria-hidden
        />
        <BlockTrustBadge
          size={140}
          instanceId="verify-public"
          className="relative z-10 [&_svg]:drop-shadow-[0_0_28px_rgba(16,185,129,0.45)]"
        />
      </div>

      <div
        className="flex animate-fade-up items-center justify-center gap-2 opacity-0"
        style={{ animationDelay: "120ms" }}
      >
        <div
          className="h-3 w-3 animate-pulse rounded-full"
          style={{ backgroundColor: identityVerified ? C.valid : "#f59e0b" }}
          aria-hidden
        />
        <span
          className="font-syne text-lg font-semibold uppercase tracking-widest"
          style={{ color: identityVerified ? C.valid : "#f59e0b" }}
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

      {!identityVerified ? (
        <div
          className="w-full animate-fade-up rounded-xl border border-[#f59e0b]/30 bg-[#f59e0b]/10 px-4 py-3 text-center text-sm leading-relaxed text-[#f59e0b] opacity-0"
          style={{ animationDelay: "200ms" }}
        >
          Cette identité a été <strong>déclarée par son titulaire</strong> mais n&apos;a pas été
          vérifiée par contrôle d&apos;identité
          {polygonAnchored ? "" : " ni ancrée sur la blockchain"}. Le nom affiché n&apos;est pas une
          identité certifiée par BLOCKTRUST™.
        </div>
      ) : null}

      {polygonAnchored ? (
        <a
          href={polygonExplorerUrl ?? undefined}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex w-full animate-fade-up items-center justify-center gap-2 rounded-xl border border-[#BDA76B]/30 bg-[#BDA76B]/10 px-4 py-3 text-sm font-medium text-[#BDA76B] opacity-0 transition ${polygonExplorerUrl ? "hover:bg-[#BDA76B]/20" : "pointer-events-none"}`}
          style={{ animationDelay: "210ms" }}
        >
          <Link2 className="h-4 w-4 shrink-0" aria-hidden />
          <span>Ancré sur la blockchain Polygon</span>
          {polygonExplorerUrl ? (
            <span className="text-xs text-[#BDA76B]/70">· PolygonScan →</span>
          ) : null}
        </a>
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
          </div>

          <div
            className="grid w-full animate-fade-up grid-cols-1 gap-3 opacity-0 sm:grid-cols-3"
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
                style={{ color: C.valid }}
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

function FraudCertificateCard() {
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

function FailVerdictCard({
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
