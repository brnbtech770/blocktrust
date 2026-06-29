"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  Check,
  Loader2,
  Minus,
  ShieldAlert,
  ShieldCheck,
  ShieldQuestion,
} from "lucide-react";
import type {
  ExtensionBisVerification,
  ExtensionVerifyPayload,
  ExtensionVerifySignals,
} from "@/lib/extension-verify-sender";

const API_BASE =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://blocktrust.tech";

const STORAGE_KEY = "bt_outlook_api_key";
const BIS_LINK_REGEX = /blocktrust\.tech\/verify\/bis\/([a-z0-9]+)/i;

type Screen =
  | "auth"
  | "loading"
  | "certified"
  | "unknown"
  | "compromise"
  | "fraud"
  | "error";

function formatDateFr(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatInteractionType(type: string): string {
  const map: Record<string, string> = {
    EMAIL: "Email",
    DOCUMENT: "Document",
    PAYMENT_REQUEST: "Demande de paiement",
    CONTRACT: "Contrat",
    MARKETPLACE: "Marketplace",
  };
  return map[type] ?? type ?? "—";
}

function senderDomain(email: string): string {
  const at = email.indexOf("@");
  return at >= 0 ? email.slice(at + 1).toLowerCase() : "";
}

function isDomainVerified(payload: ExtensionVerifyPayload, email: string): boolean {
  const domain = senderDomain(email);
  if (!domain || payload.certifiedDomains.length === 0) return false;
  return payload.certifiedDomains.some(
    (d) => d.replace(/^www\./, "").toLowerCase() === domain.replace(/^www\./, ""),
  );
}

function waitForOfficeReady(): Promise<void> {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    const tick = () => {
      if (typeof Office !== "undefined") {
        Office.onReady(() => resolve());
        return;
      }
      if (Date.now() - start > 15000) {
        reject(new Error("Office.js indisponible"));
        return;
      }
      window.setTimeout(tick, 50);
    };
    tick();
  });
}

function readEmailBody(item: Office.Item): Promise<string> {
  return new Promise((resolve) => {
    item.body.getAsync(Office.CoercionType.Text, (result) => {
      if (result.status === Office.AsyncResultStatus.Succeeded) {
        resolve(result.value ?? "");
        return;
      }
      resolve("");
    });
  });
}

function extractBisId(body: string): string | null {
  BIS_LINK_REGEX.lastIndex = 0;
  const match = BIS_LINK_REGEX.exec(body);
  return match?.[1]?.toLowerCase() ?? null;
}

async function fetchVerifyResult(
  apiKey: string,
  email: string,
  bisId: string | null,
): Promise<ExtensionVerifyPayload> {
  const url = new URL(`${API_BASE}/api/extension/verify-sender`);
  url.searchParams.set("email", email);
  if (bisId) url.searchParams.set("bisId", bisId);

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }

  return (await res.json()) as ExtensionVerifyPayload;
}

function resolveScreen(payload: ExtensionVerifyPayload): Screen {
  if (payload.status === "FRAUD") return "fraud";
  if (payload.bisMissingAlert) return "compromise";
  if (payload.status === "CERTIFIED") return "certified";
  return "unknown";
}

function TrustScoreBar({ score }: { score: number | null }) {
  const value =
    typeof score === "number" && Number.isFinite(score) ? Math.round(score) : null;
  if (value == null) return null;

  return (
    <div className="mt-3">
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="text-white/50">TrustScore</span>
        <span className="font-mono font-semibold text-[#00d4ff]">{value}/100</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-[#10b981] transition-all"
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}

function SignalRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs text-white/70">
      {ok ? (
        <Check className="h-3.5 w-3.5 shrink-0 text-[#10b981]" aria-hidden />
      ) : (
        <Minus className="h-3.5 w-3.5 shrink-0 text-white/25" aria-hidden />
      )}
      <span className={ok ? "text-white/80" : "text-white/40"}>{label}</span>
    </li>
  );
}

function SignalsList({
  signals,
  payload,
  senderEmail,
}: {
  signals: ExtensionVerifySignals;
  payload: ExtensionVerifyPayload;
  senderEmail: string;
}) {
  const rows = [
    { label: "Identité vérifiée", ok: signals.kycVerified },
    { label: "Contact vérifié", ok: signals.inContact },
    { label: "Réseau de confiance", ok: signals.inNetwork },
    { label: "Ancrage Polygon", ok: signals.polygonAnchored },
    { label: "Domaine vérifié", ok: isDomainVerified(payload, senderEmail) },
  ];

  return (
    <ul className="mt-4 space-y-2">
      {rows.map((row) => (
        <SignalRow key={row.label} label={row.label} ok={row.ok} />
      ))}
    </ul>
  );
}

function BisSection({
  bis,
  bisId,
}: {
  bis: ExtensionBisVerification;
  bisId: string;
}) {
  return (
    <div className="mt-4 rounded-lg border border-[#00d4ff]/20 bg-[#00d4ff]/5 p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#00d4ff]">
        Interaction signée — BIS Niveau {bis.bisLevel}
      </p>
      <dl className="mt-2 space-y-1 text-xs text-white/65">
        <div className="flex justify-between gap-2">
          <dt className="text-white/40">Type</dt>
          <dd>{formatInteractionType(bis.interactionType)}</dd>
        </div>
        {bis.contextLabel ? (
          <div className="flex justify-between gap-2">
            <dt className="text-white/40">Contexte</dt>
            <dd className="text-right">{bis.contextLabel}</dd>
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          <dt className="text-white/40">Signé le</dt>
          <dd>{formatDateFr(bis.signedAt)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt className="text-white/40">Expire le</dt>
          <dd>{formatDateFr(bis.expiresAt)}</dd>
        </div>
      </dl>
      {bis.valid ? (
        <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#10b981]">
          <Check className="h-3.5 w-3.5" aria-hidden />
          Signature valide
        </p>
      ) : (
        <p className="mt-2 text-xs text-[#f59e0b]">
          Signature invalide ou expirée{bis.reason ? ` — ${bis.reason}` : ""}
        </p>
      )}
      <a
        href={`${API_BASE}/verify/bis/${encodeURIComponent(bisId)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 inline-block text-xs font-semibold text-[#00d4ff] hover:underline"
      >
        Voir le détail →
      </a>
    </div>
  );
}

function LogoMark() {
  return (
    <p className="font-syne text-sm font-bold tracking-wide text-[#00d4ff]">BLOCKTRUST™</p>
  );
}

export default function OutlookTaskpaneClient() {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [screen, setScreen] = useState<Screen>("auth");
  const [senderEmail, setSenderEmail] = useState("");
  const [bisId, setBisId] = useState<string | null>(null);
  const [result, setResult] = useState<ExtensionVerifyPayload | null>(null);
  const [officeError, setOfficeError] = useState<string | null>(null);

  const runVerification = useCallback(async (key: string) => {
    setScreen("loading");
    setResult(null);
    setOfficeError(null);

    try {
      await waitForOfficeReady();
      const item = Office.context.mailbox.item;
      if (!item?.from?.emailAddress) {
        setOfficeError("Ouvrez un email pour vérifier l'expéditeur.");
        setScreen("error");
        return;
      }

      const email = item.from.emailAddress.trim();
      setSenderEmail(email);

      const body = await readEmailBody(item);
      const detectedBis = extractBisId(body);
      setBisId(detectedBis);

      const payload = await fetchVerifyResult(key, email, detectedBis);
      setResult(payload);
      setScreen(resolveScreen(payload));
    } catch {
      setScreen("error");
    }
  }, []);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)?.trim();
    if (stored) {
      setApiKey(stored);
      void runVerification(stored);
    }
  }, [runVerification]);

  const handleConnect = () => {
    const key = apiKeyInput.trim();
    if (!key) return;
    localStorage.setItem(STORAGE_KEY, key);
    setApiKey(key);
    void runVerification(key);
  };

  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    setApiKey(null);
    setApiKeyInput("");
    setResult(null);
    setScreen("auth");
  };

  if (screen === "auth") {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <LogoMark />
        <h1 className="mt-4 font-syne text-base font-bold text-white">
          Connectez votre compte BLOCKTRUST™
        </h1>
        <p className="mt-2 text-xs leading-relaxed text-white/55">
          Collez votre clé API extension pour vérifier les expéditeurs dans Outlook.
        </p>
        <label className="mt-4 block text-xs font-medium text-white/50" htmlFor="api-key">
          Clé API (bt_ext_…)
        </label>
        <input
          id="api-key"
          type="password"
          autoComplete="off"
          value={apiKeyInput}
          onChange={(e) => setApiKeyInput(e.target.value)}
          placeholder="bt_ext_…"
          className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-white outline-none focus:border-[#00d4ff]/40"
        />
        <button
          type="button"
          onClick={handleConnect}
          disabled={!apiKeyInput.trim()}
          className="mt-4 w-full rounded-lg bg-[#00d4ff] py-2.5 text-sm font-semibold text-[#0a1628] transition hover:bg-[#21dfff] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Connecter
        </button>
        <div className="mt-4 space-y-2 text-xs">
          <a
            href={`${API_BASE}/auth/register`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#00d4ff] hover:underline"
          >
            Pas de compte ? → blocktrust.tech/auth/register
          </a>
          <a
            href={`${API_BASE}/dashboard/extension`}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-[#00d4ff] hover:underline"
          >
            Où trouver ma clé ? → blocktrust.tech/dashboard/extension
          </a>
        </div>
      </div>
    );
  }

  if (screen === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
        <LogoMark />
        <Loader2 className="mt-6 h-8 w-8 animate-spin text-[#00d4ff]" aria-hidden />
        <p className="mt-4 text-sm text-white/70">
          Vérification de {senderEmail || "l'expéditeur"}…
        </p>
      </div>
    );
  }

  if (screen === "error") {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <LogoMark />
        <p className="mt-4 text-sm font-semibold text-white">
          {officeError ?? "Impossible de vérifier l'expéditeur."}
        </p>
        {!officeError ? (
          <p className="mt-2 text-xs text-white/55">
            Vérifiez votre connexion et votre clé API.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => apiKey && void runVerification(apiKey)}
          className="mt-4 w-full rounded-lg border border-[#00d4ff]/40 bg-[#00d4ff]/15 py-2.5 text-sm font-semibold text-[#00d4ff] hover:bg-[#00d4ff]/25"
        >
          Réessayer
        </button>
        <button
          type="button"
          onClick={handleDisconnect}
          className="mt-2 text-xs text-white/40 hover:text-white/60"
        >
          Changer de clé API
        </button>
      </div>
    );
  }

  if (!result) return null;

  if (screen === "fraud") {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <LogoMark />
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#E05252]/40 bg-[#E05252]/10 p-3">
          <ShieldAlert className="h-5 w-5 shrink-0 text-[#E05252]" aria-hidden />
          <div>
            <p className="text-sm font-bold text-[#E05252]">Alerte fraude détectée</p>
            <p className="mt-1 text-xs text-white/65">{result.message}</p>
            <p className="mt-2 font-mono text-xs text-white/50">{senderEmail}</p>
          </div>
        </div>
        <SignalsList signals={result.signals} payload={result} senderEmail={senderEmail} />
        <button
          type="button"
          onClick={() => apiKey && void runVerification(apiKey)}
          className="mt-4 text-xs text-[#00d4ff] hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (screen === "compromise") {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <LogoMark />
        <div className="mt-4 flex items-start gap-3 rounded-lg border border-[#f59e0b]/40 bg-[#f59e0b]/10 p-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-[#f59e0b]" aria-hidden />
          <div>
            <p className="text-sm font-bold text-[#f59e0b]">ATTENTION — Interaction non signée</p>
            <p className="mt-2 text-xs leading-relaxed text-white/70">
              Ce contact signe habituellement ses interactions. Cet email n&apos;est PAS signé.
            </p>
            <p className="mt-2 text-xs text-white/55">
              Vérifiez par un autre canal avant de répondre.
            </p>
            <p className="mt-2 font-mono text-xs text-white/45">{senderEmail}</p>
          </div>
        </div>
        {result.entityName ? (
          <p className="mt-3 text-xs text-white/50">Contact : {result.entityName}</p>
        ) : null}
        <a
          href="mailto:security@blocktrust.tech"
          className="mt-4 text-xs font-semibold text-[#f59e0b] hover:underline"
        >
          Signaler → security@blocktrust.tech
        </a>
        <button
          type="button"
          onClick={() => apiKey && void runVerification(apiKey)}
          className="mt-3 text-xs text-[#00d4ff] hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  if (screen === "certified") {
    return (
      <div className="flex min-h-screen flex-col p-4">
        <LogoMark />
        <div className="mt-4 flex items-start gap-3">
          <ShieldCheck className="h-6 w-6 shrink-0 text-[#10b981]" aria-hidden />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#10b981]">Identité certifiée BLOCKTRUST™</p>
            {result.entityName ? (
              <p className="mt-1 text-sm font-semibold text-white">{result.entityName}</p>
            ) : null}
            <p className="mt-1 break-all font-mono text-xs text-white/50">{senderEmail}</p>
          </div>
        </div>
        <TrustScoreBar score={result.trustScore} />
        <SignalsList signals={result.signals} payload={result} senderEmail={senderEmail} />
        {result.bisSignatureDetected && result.bisVerification && bisId ? (
          <BisSection bis={result.bisVerification} bisId={bisId} />
        ) : null}
        <button
          type="button"
          onClick={() => apiKey && void runVerification(apiKey)}
          className="mt-4 text-xs text-[#00d4ff] hover:underline"
        >
          Actualiser
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      <LogoMark />
      <div className="mt-4 flex items-start gap-3">
        <ShieldQuestion className="h-6 w-6 shrink-0 text-white/40" aria-hidden />
        <div>
          <p className="text-sm font-bold text-white/70">Expéditeur non vérifié BLOCKTRUST™</p>
          <p className="mt-1 break-all font-mono text-xs text-white/45">{senderEmail}</p>
        </div>
      </div>
      <p className="mt-4 text-xs leading-relaxed text-white/55">
        Aucun badge BLOCKTRUST™ associé.
      </p>
      <p className="mt-2 text-xs leading-relaxed text-white/55">
        Soyez prudent avant de partager des informations sensibles.
      </p>
      <a
        href={API_BASE}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-4 text-xs font-semibold text-[#00d4ff] hover:underline"
      >
        Certifier son identité → blocktrust.tech
      </a>
      <button
        type="button"
        onClick={() => apiKey && void runVerification(apiKey)}
        className="mt-3 text-xs text-white/40 hover:text-white/60"
      >
        Réessayer
      </button>
    </div>
  );
}
