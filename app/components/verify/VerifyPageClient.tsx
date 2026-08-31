"use client";

import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthMinimalHeader from "@/app/components/AuthMinimalHeader";
import VerifyForm from "@/app/components/verify/VerifyForm";
import VerifyBanner from "@/app/components/verify/VerifyBanner";
import {
  FailVerdictCard,
  FraudCertificateCard,
  ValidWowView,
} from "@/app/components/verify/VerifyResult";
import {
  VERIFY_FETCH_TIMEOUT_MS,
  VERIFY_TIMEOUT_MESSAGE,
  extractCertId,
  extractVtFromUrl,
  formatCertifiedDate,
  isAbortError,
  type Verdict,
  type VerifyApiSuccess,
} from "@/app/components/verify/verify-types";
import type { TrustEngineResult } from "@/lib/trust-engine";

type VerifyPageClientProps = {
  initialCertId?: string;
  initialCertData?: VerifyApiSuccess | null;
  sessionUser?: { id?: string; email?: string | null; name?: string | null } | null;
};

function applyVerifyApiPayload(
  data: VerifyApiSuccess,
  setters: {
    setVerdict: (v: Verdict) => void;
    setEntityName: (v: string | null) => void;
    setHolderEmail: (v: string | null) => void;
    setCertifiedAt: (v: string | null) => void;
    setWalletAddress: (v: string | null) => void;
    setWalletNetworkDisplay: (v: string | null) => void;
    setCertifiedDomains: (v: string[]) => void;
    setCertifiedEmails: (v: string[]) => void;
    setCertifiedPhones: (v: string[]) => void;
    setTrustEngine: (v: TrustEngineResult | null) => void;
    setIdentityVerified: (v: boolean) => void;
  },
) {
  setters.setVerdict((data.verdict as Verdict) ?? "ERROR");
  setters.setEntityName(data.entityName ?? null);
  setters.setHolderEmail(data.holderEmail ?? null);
  setters.setCertifiedAt(data.certifiedAt ?? null);
  setters.setWalletAddress(data.walletAddress?.trim() ? data.walletAddress : null);
  setters.setWalletNetworkDisplay(
    data.walletNetworkDisplay?.trim()
      ? data.walletNetworkDisplay
      : data.walletNetwork?.trim()
        ? data.walletNetwork
        : null,
  );
  setters.setCertifiedDomains(Array.isArray(data.certifiedDomains) ? data.certifiedDomains : []);
  setters.setCertifiedEmails(Array.isArray(data.certifiedEmails) ? data.certifiedEmails : []);
  setters.setCertifiedPhones(Array.isArray(data.certifiedPhones) ? data.certifiedPhones : []);
  setters.setTrustEngine(data.trustEngine ?? null);
  setters.setIdentityVerified(Boolean(data.identityVerified));
}

function VerifyContent({
  initialCertId,
  initialCertData,
  sessionUser,
}: VerifyPageClientProps) {
  const router = useRouter();
  const sp = useSearchParams();
  const certIdQuery = sp.get("certId")?.trim() ?? "";
  const vtQuery = sp.get("vt")?.trim() ?? "";
  const [resolvedVtCertId, setResolvedVtCertId] = useState<string | null>(null);
  const [vtResolveStatus, setVtResolveStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [vtResolveError, setVtResolveError] = useState<"expired" | "invalid" | null>(
    null,
  );
  const [vtWasUsed, setVtWasUsed] = useState(false);
  const [token, setToken] = useState("");
  const [tokenFixApplied, setTokenFixApplied] = useState(false);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [entityName, setEntityName] = useState<string | null>(null);
  const [holderEmail, setHolderEmail] = useState<string | null>(null);
  const [vtExpiresAt, setVtExpiresAt] = useState<string | null>(null);
  const [certifiedAt, setCertifiedAt] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [walletNetworkDisplay, setWalletNetworkDisplay] = useState<string | null>(null);
  const [certifiedDomains, setCertifiedDomains] = useState<string[]>([]);
  const [certifiedEmails, setCertifiedEmails] = useState<string[]>([]);
  const [certifiedPhones, setCertifiedPhones] = useState<string[]>([]);
  const [manualIdInput, setManualIdInput] = useState("");
  /** ID soumis pour vérification (local — reset immédiat sans attendre router.replace). */
  const [submittedCertId, setSubmittedCertId] = useState("");
  /** Token rotatif vt= soumis (local). */
  const [submittedVt, setSubmittedVt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [verifyErrorMessage, setVerifyErrorMessage] = useState<string | null>(null);
  const [vaultMatchBanner, setVaultMatchBanner] = useState<{
    inOrganization: boolean;
    match: boolean;
  } | null>(null);
  const [trustEngine, setTrustEngine] = useState<TrustEngineResult | null>(null);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [contactAddState, setContactAddState] = useState<
    "idle" | "loading" | "done" | "error"
  >("idle");
  const [contactAddMessage, setContactAddMessage] = useState<string | null>(null);
  const ssrAppliedRef = useRef(false);

  const hasValidToken = token.trim().length > 10;

  const handleManualVerify = () => {
    const raw = manualIdInput.trim();
    if (!raw) return;

    setVerdict(null);
    setVerifyErrorMessage(null);
    setVaultMatchBanner(null);
    setTrustEngine(null);
    setIdentityVerified(false);
    setContactAddState("idle");
    setContactAddMessage(null);

    const vt = extractVtFromUrl(raw);
    if (vt) {
      setSubmittedCertId("");
      setSubmittedVt(vt);
      router.replace(`/verify?vt=${encodeURIComponent(vt)}`);
      return;
    }

    const id = extractCertId(raw);
    if (!id) return;

    setSubmittedVt("");
    setSubmittedCertId(id);
    router.replace(`/verify?certId=${encodeURIComponent(id)}`);
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
    if (certIdQuery) {
      setManualIdInput(certIdQuery);
      setSubmittedCertId(certIdQuery);
      setSubmittedVt("");
    } else if (vtQuery) {
      setSubmittedVt(vtQuery);
      setSubmittedCertId("");
    } else if (!certIdQuery && !vtQuery) {
      setSubmittedCertId("");
      setSubmittedVt("");
    }
  }, [certIdQuery, vtQuery]);

  useEffect(() => {
    if (!initialCertData || !initialCertId?.trim()) return;
    if (initialCertData.verdict === "ERROR") return;
    const matchesQuery =
      certIdQuery === initialCertId ||
      submittedCertId === initialCertId ||
      (!certIdQuery && !submittedCertId && !vtQuery && !submittedVt);
    if (!matchesQuery) return;

    applyVerifyApiPayload(initialCertData, {
      setVerdict,
      setEntityName,
      setHolderEmail,
      setCertifiedAt,
      setWalletAddress,
      setWalletNetworkDisplay,
      setCertifiedDomains,
      setCertifiedEmails,
      setCertifiedPhones,
      setTrustEngine,
      setIdentityVerified,
    });
    if (initialCertId) {
      setManualIdInput(initialCertId);
      setSubmittedCertId(initialCertId);
    }
    ssrAppliedRef.current = true;
  }, [
    initialCertData,
    initialCertId,
    certIdQuery,
    submittedCertId,
    vtQuery,
    submittedVt,
  ]);

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

  const activeVt = submittedVt || vtQuery;

  useEffect(() => {
    if (!activeVt) {
      setResolvedVtCertId(null);
      setVtResolveStatus("idle");
      setVtResolveError(null);
      setVtWasUsed(false);
      setVtExpiresAt(null);
      return;
    }

    const ac = new AbortController();
    let cancelled = false;
    const timeoutId = setTimeout(() => ac.abort(), VERIFY_FETCH_TIMEOUT_MS);

    setVtResolveStatus("loading");
    setResolvedVtCertId(null);
    setVtResolveError(null);
    setVtWasUsed(false);

    void (async () => {
      try {
        const res = await fetch(
          `/api/verify/resolve-token?vt=${encodeURIComponent(activeVt)}`,
          { signal: ac.signal },
        );
        clearTimeout(timeoutId);
        const data = (await res.json()) as {
          certId?: string;
          error?: string;
          used?: boolean;
          expiresAt?: string | null;
        };
        if (cancelled) return;
        if (typeof data.certId === "string" && data.certId.length > 0) {
          setResolvedVtCertId(data.certId);
          setVtWasUsed(Boolean(data.used));
          setVtExpiresAt(typeof data.expiresAt === "string" && data.expiresAt ? data.expiresAt : null);
          setVtResolveStatus("ok");
        } else if (data.error === "expired") {
          setVtResolveError("expired");
          setVtResolveStatus("error");
        } else {
          setVtResolveError("invalid");
          setVtResolveStatus("error");
        }
      } catch (_e: unknown) {
        clearTimeout(timeoutId);
        if (cancelled) return;
        setVtResolveError("invalid");
        setVtResolveStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      ac.abort();
    };
  }, [activeVt]);

  const certIdForVerify = activeVt
    ? vtResolveStatus === "ok" && resolvedVtCertId
      ? resolvedVtCertId
      : ""
    : submittedCertId;

  useEffect(() => {
    const trimmed = token.trim();
    if (trimmed.length <= 10) return;

    setVerdict(null);
    setVerifyErrorMessage(null);
    setIdentityVerified(false);
    setEntityName(null);
    setHolderEmail(null);
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
        setHolderEmail(data.holderEmail ?? null);
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
    if (
      ssrAppliedRef.current &&
      initialCertId &&
      certIdForVerify === initialCertId &&
      initialCertData
    ) {
      return;
    }

    setVerdict(null);
    setVerifyErrorMessage(null);
    setIdentityVerified(false);
    setEntityName(null);
    setHolderEmail(null);
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
        setHolderEmail(data.holderEmail ?? null);
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
  }, [hasValidToken, certIdForVerify, initialCertId, initialCertData]);

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
    if (!showSuccess || !sessionUser) return;
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
  }, [showSuccess, sessionUser, certifiedEmails, certifiedDomains]);

  const activeQuery = Boolean(
    hasValidToken ||
      certIdForVerify ||
      (activeVt && (vtResolveStatus === "loading" || vtResolveStatus === "ok")),
  );

  const tokenFromUrl = sp.get("token")?.trim() ?? "";
  const showIncompleteTokenError =
    !hasValidToken &&
    !certIdQuery &&
    !vtQuery &&
    !submittedCertId &&
    !submittedVt &&
    !verdict &&
    tokenFromUrl.length > 0 &&
    tokenFromUrl.length <= 10;

  const resetVerification = () => {
    setVerdict(null);
    setManualIdInput("");
    setSubmittedCertId("");
    setSubmittedVt("");
    setResolvedVtCertId(null);
    setVtResolveStatus("idle");
    setVtResolveError(null);
    setVtWasUsed(false);
    setEntityName(null);
    setHolderEmail(null);
    setCertifiedAt(null);
    setWalletAddress(null);
    setWalletNetworkDisplay(null);
    setCertifiedDomains([]);
    setCertifiedEmails([]);
    setCertifiedPhones([]);
    setTrustEngine(null);
    setIdentityVerified(false);
    setContactAddState("idle");
    setContactAddMessage(null);
    setToken("");
    setTokenFixApplied(false);
    setVerifyErrorMessage(null);
    setVaultMatchBanner(null);
    router.replace("/verify");
    window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0a1628] text-white antialiased">
      <AuthMinimalHeader backHref="/" />

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center px-4 pb-16 pt-2 sm:max-w-lg sm:pt-4">
        {!hasValidToken ? (
          <VerifyForm
            inputRef={inputRef}
            manualIdInput={manualIdInput}
            onManualIdInputChange={setManualIdInput}
            onSubmit={handleManualVerify}
          />
        ) : null}

        <VerifyBanner
          showIncompleteTokenError={showIncompleteTokenError}
          activeVt={activeVt}
          vtResolveStatus={vtResolveStatus}
          vtResolveError={vtResolveError}
          vtWasUsed={vtWasUsed}
          showSuccess={showSuccess}
          hasVerdict={Boolean(verdict)}
          tokenFixApplied={tokenFixApplied}
        />

        {(hasValidToken ||
          certIdForVerify ||
          (activeVt && vtResolveStatus === "loading")) &&
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
            holderEmail={holderEmail ?? certifiedEmails[0] ?? null}
            dateLabel={dateLabel}
            linkKind={activeVt ? "rotating" : "permanent"}
            rotatingExpiresAt={vtExpiresAt}
            trustEngine={trustEngine}
            identityVerified={identityVerified}
            walletAddress={walletAddress}
            walletNetworkDisplay={walletNetworkDisplay}
            certifiedDomains={certifiedDomains}
            certifiedEmails={certifiedEmails}
            certifiedPhones={certifiedPhones}
            sessionUser={sessionUser ?? null}
            vaultMatchBanner={vaultMatchBanner}
            contactAddState={contactAddState}
            contactAddMessage={contactAddMessage}
            onAddContact={async () => {
              const email = certifiedEmails[0]?.trim();
              if (!email || !sessionUser) return;
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

export default function VerifyPageClient(props: VerifyPageClientProps) {
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
      <VerifyContent {...props} />
    </Suspense>
  );
}
