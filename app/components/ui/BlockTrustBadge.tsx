"use client";

import { Check, Link2 } from "lucide-react";
import {
  type CSSProperties,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { buildPublicVerifyUrl } from "@/lib/public-verify-url";

/**
 * Badge BLOCKTRUST™ — carte « Lovable » (fond navy, taches animées, bouclier flottant).
 * Mise à l’échelle : base 320×400 px.
 */
export interface BlockTrustBadgeProps {
  /** Largeur rendue (px) ou `fill` pour occuper le parent. */
  size?: number | "fill";
  className?: string;
  /** Surcharge du mot BLOCKTRUST (majuscules recommandées). */
  label?: string;
  /** Préfixe stable pour accessibilité / clés. */
  instanceId?: string;
  /** Filigrane horodaté sous la carte (désactivé sur logos compacts). */
  showWatermark?: boolean;
  /** Identifiant public ou technique — active le QR `/api/qr/...`. */
  certId?: string;
  /** Lien /verify?certId=… (sinon dérivé de certId). */
  verifyUrl?: string;
  /** Affiche le bouton « Copier le lien de vérification » à la place du seul ID. */
  showVerifyButton?: boolean;
}

const BASE_W = 320;
const BASE_H = 400;

function CopyVerifyButton({
  verifyUrl,
  baseSize,
}: {
  verifyUrl: string;
  baseSize: number;
}) {
  const [copied, setCopied] = useState(false);
  const fz = Math.max(10, Math.round(baseSize * 0.038));
  const padY = Math.max(6, Math.round(baseSize * 0.022));
  const padX = Math.max(10, Math.round(baseSize * 0.045));

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(verifyUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* silencieux — pas d’alert en prod */
    }
  };

  return (
    <div className="flex w-full max-w-[95%] flex-col items-center gap-2">
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex w-full max-w-full items-center justify-center gap-1.5 rounded-xl font-bold text-[#0a1628] shadow-sm transition hover:opacity-95"
        style={{
          fontSize: fz,
          padding: `${padY}px ${padX}px`,
          background: "#00d4ff",
        }}
      >
        {copied ? (
          <>
            <Check className="shrink-0 opacity-90" style={{ width: fz, height: fz }} aria-hidden />
            Lien copié
          </>
        ) : (
          <>
            <Link2 className="shrink-0 opacity-90" style={{ width: fz, height: fz }} aria-hidden />
            Copier le lien de vérification
          </>
        )}
      </button>
      <a
        href={verifyUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-center font-medium text-[#00d4ff]/80 underline-offset-2 transition hover:text-[#00d4ff] hover:underline"
        style={{ fontSize: Math.max(9, Math.round(baseSize * 0.032)) }}
      >
        Ouvrir la page verify
      </a>
    </div>
  );
}

function BadgeFace({
  label,
  certId,
  resolvedVerifyUrl,
  showVerifyButton,
  qrAlt,
}: {
  label: string;
  certId?: string;
  resolvedVerifyUrl?: string;
  showVerifyButton: boolean;
  qrAlt: string;
}) {
  const s = BASE_W;

  return (
    <div
      className="relative overflow-hidden rounded-2xl select-none"
      style={{ width: BASE_W, height: BASE_H }}
    >
      {/* Fond navy + dégradé */}
      <div className="absolute inset-0 rounded-2xl bg-[#0a1628]" />
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background:
            "linear-gradient(155deg, rgba(13,31,60,0.92) 0%, #0a1628 42%, #060d1a 100%)",
        }}
      />

      {/* Tache gold pivotante */}
      <div
        className="absolute bt-rotate-cw opacity-90"
        style={{
          width: s * 0.62,
          height: s * 0.62,
          top: "28%",
          left: "18%",
          background:
            "radial-gradient(circle, rgba(189,167,107,0.38) 0%, transparent 72%)",
          borderRadius: "50%",
        }}
        aria-hidden
      />
      {/* Tache cyan pivotante (léger décalage temporel) */}
      <div
        className="absolute bt-rotate-cw opacity-100"
        style={{
          width: s * 0.52,
          height: s * 0.52,
          top: "8%",
          right: "6%",
          background:
            "radial-gradient(circle, rgba(0,212,255,0.22) 0%, transparent 70%)",
          borderRadius: "50%",
          animationDelay: "-3s",
        }}
        aria-hidden
      />

      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-3 px-4 py-5">
        {/* Bouclier flottant */}
        <div className="bt-float shrink-0">
          <div
            className="flex items-center justify-center rounded-2xl"
            style={{
              width: s * 0.28,
              height: s * 0.28,
              background: "rgba(0,212,255,0.15)",
              border: "2px solid rgba(0,212,255,0.42)",
            }}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              className="shrink-0"
              style={{ width: s * 0.15, height: s * 0.15 }}
              aria-hidden
            >
              <path
                d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z"
                fill="rgba(0,212,255,0.2)"
                stroke="#00d4ff"
                strokeWidth="1.5"
              />
              <path
                d="M9 12l2 2 4-4"
                stroke="#BDA76B"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        </div>

        <div className="text-center">
          <p
            className="font-sans font-bold tracking-[0.2em] text-white uppercase"
            style={{ fontSize: s * 0.068 }}
          >
            {label}
          </p>
          <p
            className="mt-0.5 font-sans text-white/60"
            style={{ fontSize: s * 0.04 }}
          >
            Identité vérifiée
          </p>
        </div>

        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1 font-sans font-medium text-[#00d4ff]"
          style={{
            background: "rgba(0,212,255,0.1)",
            border: "1px solid rgba(0,212,255,0.32)",
            fontSize: s * 0.035,
          }}
        >
          <svg width={10} height={10} viewBox="0 0 10 10" aria-hidden>
            <path
              d="M2 5l2 2 4-4"
              stroke="#00d4ff"
              strokeWidth="1.5"
              strokeLinecap="round"
              fill="none"
            />
          </svg>
          Certifié Blockchain
        </div>

        {certId ? (
          <div
            className="rounded-xl bg-white p-2 shadow-sm"
            style={{ width: s * 0.36, height: s * 0.36 }}
          >
            <img
              src={`/api/qr/${encodeURIComponent(certId)}?format=png`}
              alt={qrAlt}
              width={Math.round(s * 0.32)}
              height={Math.round(s * 0.32)}
              className="h-full w-full object-contain"
              loading="lazy"
            />
          </div>
        ) : null}

        {showVerifyButton && resolvedVerifyUrl ? (
          <CopyVerifyButton verifyUrl={resolvedVerifyUrl} baseSize={s} />
        ) : certId ? (
          <p
            className="max-w-full truncate px-2 text-center font-mono text-white/35"
            style={{ fontSize: s * 0.028 }}
          >
            {certId.length > 24 ? `${certId.slice(0, 22)}…` : certId}
          </p>
        ) : null}

        <p
          className="mt-auto font-sans text-white/25"
          style={{ fontSize: s * 0.03 }}
        >
          Powered by{" "}
          <span className="font-semibold text-[#8247E5]">Polygon</span>
        </p>
      </div>
    </div>
  );
}

export function BlockTrustBadge({
  size = 320,
  className,
  label = "BLOCKTRUST",
  instanceId,
  showWatermark = true,
  certId,
  verifyUrl,
  showVerifyButton = false,
}: BlockTrustBadgeProps) {
  const reactId = useId();
  const uid = (instanceId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const fillParent = size === "fill";
  const containerRef = useRef<HTMLDivElement>(null);
  const [fillScale, setFillScale] = useState(1);

  const resolvedVerifyUrl =
    verifyUrl ?? (certId ? buildPublicVerifyUrl(certId) : undefined);

  const [timestamp, setTimestamp] = useState<string | null>(null);
  useEffect(() => {
    if (!showWatermark) return;
    setTimestamp(
      new Date().toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [showWatermark]);

  useLayoutEffect(() => {
    if (!fillParent) return;
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w < 4 || h < 4) return;
      setFillScale(Math.min(w / BASE_W, h / BASE_H));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fillParent]);

  const qrAlt = certId
    ? `QR vérification BlockTrust, certificat ${certId.slice(0, 12)}`
    : "QR BlockTrust";

  const face = (
    <BadgeFace
      label={label}
      certId={certId}
      resolvedVerifyUrl={resolvedVerifyUrl}
      showVerifyButton={showVerifyButton}
      qrAlt={qrAlt}
    />
  );

  const watermark = showWatermark ? (
    <p className="mt-1.5 max-w-[min(100%,20rem)] text-center font-mono text-[9px] tracking-widest text-white/35">
      {timestamp === null ? "\u00a0" : `${timestamp} · BLOCKTRUST™`}
    </p>
  ) : null;

  if (fillParent) {
    return (
      <div
        className={`relative inline-flex min-h-0 min-w-0 shrink-0 flex-col items-center ${className ?? ""}`}
        style={{ width: "100%", height: "100%" }}
      >
        <div
          ref={containerRef}
          className="flex min-h-0 min-w-0 flex-1 items-center justify-center overflow-hidden"
          role="img"
          aria-label={`${label}, badge certifié`}
        >
          <div
            style={{
              width: BASE_W * fillScale,
              height: BASE_H * fillScale,
            }}
          >
            <div
              className="relative"
              style={{
                width: BASE_W,
                height: BASE_H,
                transform: `scale(${fillScale})`,
                transformOrigin: "top left",
              }}
            >
              {face}
            </div>
          </div>
        </div>
        {watermark}
      </div>
    );
  }

  const numericSize = size;
  const scale = numericSize / BASE_W;
  const outerStyle: CSSProperties = {
    width: numericSize,
    height: numericSize * (BASE_H / BASE_W),
  };

  return (
    <div
      className={`inline-flex flex-col items-center ${className ?? ""}`}
      data-instance={uid}
    >
      <div
        className="relative overflow-hidden rounded-2xl"
        style={outerStyle}
        role="img"
        aria-label={`${label}, badge certifié blockchain`}
      >
        <div
          className="absolute left-0 top-0"
          style={{
            width: BASE_W,
            height: BASE_H,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          {face}
        </div>
      </div>
      {watermark}
    </div>
  );
}

export default BlockTrustBadge;
