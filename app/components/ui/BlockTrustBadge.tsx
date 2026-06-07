"use client";

import { type CSSProperties, useEffect, useId, useState } from "react";

/**
 * BlockTrustBadge
 * --------------------------------------------------------------
 * A premium animated hex badge built entirely with SVG + CSS.
 * No animation libraries. Scales to any size via the `size` prop.
 *
 * `instanceId` permet de garantir l'unicité des IDs SVG (defs) lorsque
 * plusieurs badges coexistent sur la même page. Quand non fourni, un id
 * stable est généré via React.useId().
 */
export interface BlockTrustBadgeProps {
  /** Rendered width/height in px, ou `"fill"` pour occuper 100 % du parent carré. */
  size?: number | "fill";
  /** Optional className to apply to the outer wrapper. */
  className?: string;
  /** Override the wordmark. Defaults to "BLOCKTRUST™". */
  label?: string;
  /** Préfixe unique pour les IDs SVG (defs, clipPath, gradients, filtre). */
  instanceId?: string;
  /**
   * Horodatage sous le SVG (filigran). À désactiver dans les logos / headers compacts
   * pour éviter doublons et texte quasi invisible.
   */
  showWatermark?: boolean;
}

const COLORS = {
  navy: "#0a1628",
  navyDeep: "#06101f",
  cyan: "#00d4ff",
  cyanSoft: "#1ee9ff",
  gold: "#BDA76B",
  goldBright: "#E8D08A",
  white: "#ffffff",
};

/** Hex points for a 200x200 viewBox, flat-top hexagon. */
const HEX_POINTS = "100,6 182,52 182,148 100,194 18,148 18,52";
/** Slightly inset hex for inner border. */
const HEX_POINTS_INNER = "100,18 172,58 172,142 100,182 28,142 28,58";

/** Circuit traces — each path uses dasharray for the data-flow effect. */
const CIRCUIT_TRACES: { d: string; reverse?: boolean; delay?: string }[] = [
  { d: "M30 60 L60 60 L72 72 L72 96" },
  { d: "M170 60 L140 60 L128 72 L128 110 L110 128", reverse: true },
  { d: "M30 140 L55 140 L70 125 L70 100", delay: "0.4s" },
  { d: "M170 140 L145 140 L130 155 L100 155", reverse: true, delay: "0.8s" },
  { d: "M100 30 L100 50 L86 64", delay: "1.1s" },
  { d: "M100 170 L100 150 L114 136", reverse: true, delay: "0.6s" },
  { d: "M40 100 L60 100 L70 90", delay: "1.4s" },
  { d: "M160 100 L140 100 L130 90", reverse: true, delay: "0.2s" },
];

/** Pulsing intersection nodes. */
const NODES: { cx: number; cy: number; delay: string }[] = [
  { cx: 60,  cy: 60,  delay: "0s"   },
  { cx: 140, cy: 60,  delay: "0.3s" },
  { cx: 70,  cy: 100, delay: "0.6s" },
  { cx: 130, cy: 100, delay: "0.9s" },
  { cx: 72,  cy: 96,  delay: "1.2s" },
  { cx: 128, cy: 110, delay: "0.4s" },
  { cx: 100, cy: 50,  delay: "0.7s" },
  { cx: 100, cy: 150, delay: "1.0s" },
];

/** Tiny faux-QR pattern (5x5 grid) rendered in the bottom-right corner. */
const QR_PATTERN = [
  [1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 0],
  [0, 0, 1, 0, 1],
  [1, 1, 0, 1, 1],
];

export function BlockTrustBadge({
  size = 320,
  className,
  label = "BLOCKTRUST™",
  instanceId,
  showWatermark = true,
}: BlockTrustBadgeProps) {
  const fillParent = size === "fill";
  // useId fournit un id stable côté serveur et client (Next.js SSR safe).
  const reactId = useId();
  // useId peut contenir des ":" — on les remplace pour rester safe en URL fragment.
  const uid = (instanceId ?? reactId).replace(/[^a-zA-Z0-9_-]/g, "_");
  const ID = {
    hexClip: `bt-hex-clip-${uid}`,
    bg: `bt-bg-${uid}`,
    gold: `bt-gold-${uid}`,
    shield: `bt-shield-${uid}`,
    shieldDepth: `bt-shield-depth-${uid}`,
    scanline: `bt-scanline-${uid}`,
    film: `bt-film-${uid}`,
    glow: `bt-glow-${uid}`,
  } as const;

  const svgBoxStyle: CSSProperties = fillParent
    ? { width: "100%", height: "100%" }
    : { width: size, height: size };

  const svgSize = fillParent ? "100%" : size;

  /** Horodatage affiché uniquement après montage (évite mismatch SSR / hydratation). */
  const [timestamp, setTimestamp] = useState<string | null>(null);
  useEffect(() => {
    if (!showWatermark) return;
    setTimestamp(
      new Date().toLocaleDateString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
    );
  }, [showWatermark]);

  return (
    <div className={`relative inline-flex flex-col items-center select-none ${className ?? ""}`}>
      <div
        className={
          fillParent
            ? "relative flex h-full w-full min-h-0 min-w-0 items-center justify-center"
            : "relative shrink-0"
        }
        style={svgBoxStyle}
        role="img"
        aria-label={`${label} verified badge`}
      >
      <svg
        viewBox="0 0 200 200"
        width={svgSize}
        height={svgSize}
        xmlns="http://www.w3.org/2000/svg"
        className="block max-h-full max-w-full"
      >
        <defs>
          {/* Hex clip so circuits + scanline never escape the badge */}
          <clipPath id={ID.hexClip}>
            <polygon points={HEX_POINTS_INNER} />
          </clipPath>

          {/* Background gradient inside hex */}
          <radialGradient id={ID.bg} cx="50%" cy="42%" r="65%">
            <stop offset="0%"  stopColor="#13243f" />
            <stop offset="60%" stopColor={COLORS.navy} />
            <stop offset="100%" stopColor={COLORS.navyDeep} />
          </radialGradient>

          {/* Gold border gradient */}
          <linearGradient id={ID.gold} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%"   stopColor={COLORS.gold} />
            <stop offset="50%"  stopColor={COLORS.goldBright} />
            <stop offset="100%" stopColor={COLORS.gold} />
          </linearGradient>

          {/* Cyan shield gradient — version profonde */}
          <linearGradient id={ID.shield} x1="30%" y1="0%" x2="70%" y2="100%">
            <stop offset="0%"   stopColor="#1ee9ff" />
            <stop offset="40%"  stopColor="#00a8cc" />
            <stop offset="100%" stopColor="#003d4d" />
          </linearGradient>

          {/* Overlay radial sombre pour la profondeur du bouclier */}
          <radialGradient id={ID.shieldDepth} cx="50%" cy="40%" r="60%">
            <stop offset="0%"   stopColor="#001820" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#001820" stopOpacity="0" />
          </radialGradient>

          {/* Scan line gradient */}
          <linearGradient id={ID.scanline} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor={COLORS.cyan} stopOpacity="0" />
            <stop offset="50%"  stopColor={COLORS.cyan} stopOpacity="0.85" />
            <stop offset="100%" stopColor={COLORS.cyan} stopOpacity="0" />
          </linearGradient>

          {/* Film lumineux qui balaie la baseline VERIFIED */}
          <linearGradient id={ID.film} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stopColor="#00d4ff" stopOpacity="0" />
            <stop offset="40%"  stopColor="#00d4ff" stopOpacity="0" />
            <stop offset="50%"  stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="60%"  stopColor="#00d4ff" stopOpacity="0" />
            <stop offset="100%" stopColor="#00d4ff" stopOpacity="0" />
          </linearGradient>

          {/* Soft cyan glow filter */}
          <filter id={ID.glow} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* === Outer hex border with gold glow === */}
        <g className="bt-anim-gold-glow">
          <polygon
            points={HEX_POINTS}
            fill={`url(#${ID.bg})`}
            stroke={`url(#${ID.gold})`}
            strokeWidth="2.5"
            strokeLinejoin="round"
          />
          {/* Thin cyan inner accent */}
          <polygon
            points={HEX_POINTS_INNER}
            fill="none"
            stroke={COLORS.cyan}
            strokeOpacity="0.35"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </g>

        {/* === Rotating outer ring (gold + cyan alternating dashes) === */}
        <g className="bt-anim-spin-slow" style={{ transformOrigin: "100px 100px" }}>
          <circle
            cx="100"
            cy="100"
            r="92"
            fill="none"
            stroke={COLORS.gold}
            strokeWidth="1.2"
            strokeDasharray="6 10"
            opacity="0.85"
          />
        </g>
        <g className="bt-anim-spin-reverse" style={{ transformOrigin: "100px 100px" }}>
          <circle
            cx="100"
            cy="100"
            r="88"
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth="0.9"
            strokeDasharray="2 12"
            opacity="0.85"
          />
        </g>

        {/* === Everything inside the hex is clipped === */}
        <g clipPath={`url(#${ID.hexClip})`}>
          {/* Faint dotted grid for depth */}
          <g opacity="0.08" stroke={COLORS.cyan} strokeWidth="0.4">
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`gx-${i}`} x1={20 + i * 16} y1="20" x2={20 + i * 16} y2="180" />
            ))}
            {Array.from({ length: 11 }).map((_, i) => (
              <line key={`gy-${i}`} x1="20" y1={20 + i * 16} x2="180" y2={20 + i * 16} />
            ))}
          </g>

          {/* Static base traces (dim) */}
          <g
            fill="none"
            stroke={COLORS.cyan}
            strokeOpacity="0.22"
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {CIRCUIT_TRACES.map((t, i) => (
              <path key={`base-${i}`} d={t.d} />
            ))}
          </g>

          {/* Animated data-flow overlay */}
          <g
            fill="none"
            stroke={COLORS.cyan}
            strokeWidth="1.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter={`url(#${ID.glow})`}
          >
            {CIRCUIT_TRACES.map((t, i) => (
              <path
                key={`flow-${i}`}
                d={t.d}
                strokeDasharray="10 110"
                className={t.reverse ? "bt-anim-flow-rev" : "bt-anim-flow"}
                style={{ animationDelay: t.delay ?? "0s" }}
              />
            ))}
          </g>

          {/* Pulsing nodes */}
          <g fill={COLORS.cyan}>
            {NODES.map((n, i) => (
              <circle
                key={`node-${i}`}
                cx={n.cx}
                cy={n.cy}
                r="2.4"
                className="bt-anim-pulse-node"
                style={{ animationDelay: n.delay }}
              />
            ))}
          </g>

          {/* QR pattern (bottom-right corner) */}
          <g transform="translate(146 146)">
            <rect x="-2" y="-2" width="22" height="22" fill={COLORS.navyDeep} stroke={COLORS.gold} strokeWidth="0.5" opacity="0.9" />
            {QR_PATTERN.flatMap((row, y) =>
              row.map((cell, x) =>
                cell ? (
                  <rect
                    key={`qr-${x}-${y}`}
                    x={x * 3.6}
                    y={y * 3.6}
                    width="3"
                    height="3"
                    fill={COLORS.cyan}
                    opacity="0.95"
                  />
                ) : null,
              ),
            )}
            {/* QR finder marker */}
            <rect x="0" y="0" width="3" height="3" fill={COLORS.gold} />
          </g>

          {/* Scan line — sweeps top to bottom */}
          <rect
            x="20"
            y="100"
            width="160"
            height="3"
            fill={`url(#${ID.scanline})`}
            className="bt-anim-scan"
            style={{ transformOrigin: "100px 100px" }}
          />

          {/* === Center shield === */}
          <g
            className="bt-anim-shield-glow"
            transform="translate(100 86)"
            style={{ transformBox: "fill-box", transformOrigin: "center" }}
          >
            {/* Shield silhouette */}
            <path
              d="M0 -22
                 C 12 -22, 20 -18, 22 -14
                 L 22 4
                 C 22 16, 12 24, 0 30
                 C -12 24, -22 16, -22 4
                 L -22 -14
                 C -20 -18, -12 -22, 0 -22 Z"
              fill={`url(#${ID.shield})`}
              stroke={COLORS.white}
              strokeOpacity="0.35"
              strokeWidth="0.6"
            />
            {/* Overlay radial sombre pour la profondeur */}
            <path
              d="M0 -22
                 C 12 -22, 20 -18, 22 -14
                 L 22 4
                 C 22 16, 12 24, 0 30
                 C -12 24, -22 16, -22 4
                 L -22 -14
                 C -20 -18, -12 -22, 0 -22 Z"
              fill={`url(#${ID.shieldDepth})`}
            />
            {/* Inner bevel */}
            <path
              d="M0 -17
                 C 10 -17, 17 -14, 18 -11
                 L 18 3
                 C 18 13, 10 20, 0 25
                 C -10 20, -18 13, -18 3
                 L -18 -11
                 C -17 -14, -10 -17, 0 -17 Z"
              fill="none"
              stroke={COLORS.white}
              strokeOpacity="0.25"
              strokeWidth="0.5"
            />
            {/* Micro-lignes décoratives dans le bouclier */}
            <line
              x1="-12"
              y1="-4"
              x2="12"
              y2="-4"
              stroke="#00d4ff"
              strokeWidth="0.5"
              opacity="0.4"
              strokeDasharray="3 2"
            />
            <line
              x1="-10"
              y1="4"
              x2="10"
              y2="4"
              stroke="#00d4ff"
              strokeWidth="0.5"
              opacity="0.3"
              strokeDasharray="3 2"
            />
            {/* Checkmark — gold */}
            <path
              d="M -8 1 L -2 8 L 9 -6"
              fill="none"
              stroke={COLORS.goldBright}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </g>

          {/* === Baseline VERIFIED · SECURE · ON-CHAIN (au-dessus) === */}
          <text
            x="100"
            y="132"
            textAnchor="middle"
            fill={COLORS.cyan}
            opacity="0.7"
            className="bt-font-mono"
            style={{
              fontSize: "4.2px",
              fontWeight: 500,
              letterSpacing: "0.5em",
            }}
          >
            VERIFIED · SECURE · ON-CHAIN
          </text>

          {/* Film lumineux animé qui balaie la baseline */}
          <rect
            x="55"
            y="127"
            width="90"
            height="8"
            fill={`url(#${ID.film})`}
            className="bt-anim-film"
          />

          {/* === Wordmark BLOCKTRUST™ (en dessous) === */}
          <text
            x="100"
            y="143"
            textAnchor="middle"
            fill={COLORS.gold}
            className="bt-font-mono bt-anim-shimmer"
            style={{
              fontSize: "11px",
              fontWeight: 700,
              letterSpacing: "0.32em",
            }}
          >
            {label}
          </text>
        </g>
      </svg>
      </div>
      {showWatermark ? (
        <div className="mt-2 max-w-[min(100%,14rem)] text-center">
          <p className="font-mono text-[9px] tracking-widest text-white/35">
            {timestamp === null ? "\u00a0" : `${timestamp} · BLOCKTRUST™`}
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default BlockTrustBadge;
