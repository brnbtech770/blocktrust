import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt =
  "BLOCKTRUST — Certification d'identité numérique ancrée sur Polygon";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEX_OUTER = "100,6 182,52 182,148 100,194 18,148 18,52";
const HEX_INNER = "100,18 172,58 172,142 100,182 28,142 28,58";

const CIRCUITS = [
  "M30 60 L60 60 L72 72 L72 96",
  "M170 60 L140 60 L128 72 L128 110 L110 128",
  "M30 140 L55 140 L70 125 L70 100",
  "M170 140 L145 140 L130 155 L100 155",
  "M100 30 L100 50 L86 64",
  "M100 170 L100 150 L114 136",
  "M40 100 L60 100 L70 90",
  "M160 100 L140 100 L130 90",
];

const NODES: { cx: number; cy: number }[] = [
  { cx: 60, cy: 60 },
  { cx: 140, cy: 60 },
  { cx: 70, cy: 100 },
  { cx: 130, cy: 100 },
  { cx: 100, cy: 50 },
  { cx: 100, cy: 150 },
];

const QR_PATTERN = [
  [1, 1, 1, 0, 1],
  [1, 0, 1, 0, 1],
  [1, 1, 1, 1, 0],
  [0, 0, 1, 0, 1],
  [1, 1, 0, 1, 1],
];

function StaticBadge({ size: s }: { size: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "block" }}
    >
      <defs>
        <radialGradient id="og-bg" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#13243f" />
          <stop offset="60%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#06101f" />
        </radialGradient>
        <linearGradient id="og-gold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#BDA76B" />
          <stop offset="50%" stopColor="#E8D08A" />
          <stop offset="100%" stopColor="#BDA76B" />
        </linearGradient>
        <linearGradient id="og-shield" x1="30%" y1="0%" x2="70%" y2="100%">
          <stop offset="0%" stopColor="#1ee9ff" />
          <stop offset="40%" stopColor="#00a8cc" />
          <stop offset="100%" stopColor="#003d4d" />
        </linearGradient>
        <radialGradient id="og-shield-depth" cx="50%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#001820" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#001820" stopOpacity="0" />
        </radialGradient>
        <clipPath id="og-hex-clip">
          <polygon points={HEX_INNER} />
        </clipPath>
      </defs>

      {/* Hex border avec gradient gold */}
      <polygon
        points={HEX_OUTER}
        fill="url(#og-bg)"
        stroke="url(#og-gold)"
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <polygon
        points={HEX_INNER}
        fill="none"
        stroke="#00d4ff"
        strokeOpacity="0.35"
        strokeWidth="0.6"
        strokeLinejoin="round"
      />

      {/* Anneaux extérieurs */}
      <circle
        cx="100"
        cy="100"
        r="92"
        fill="none"
        stroke="#BDA76B"
        strokeWidth="1.2"
        strokeDasharray="6 10"
        opacity="0.85"
      />
      <circle
        cx="100"
        cy="100"
        r="88"
        fill="none"
        stroke="#00d4ff"
        strokeWidth="0.9"
        strokeDasharray="2 12"
        opacity="0.85"
      />

      <g clipPath="url(#og-hex-clip)">
        {/* Grille pointillée */}
        <g opacity="0.08" stroke="#00d4ff" strokeWidth="0.4">
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={`gx-${i}`}
              x1={20 + i * 16}
              y1="20"
              x2={20 + i * 16}
              y2="180"
            />
          ))}
          {Array.from({ length: 11 }).map((_, i) => (
            <line
              key={`gy-${i}`}
              x1="20"
              y1={20 + i * 16}
              x2="180"
              y2={20 + i * 16}
            />
          ))}
        </g>

        {/* Circuits */}
        <g
          fill="none"
          stroke="#00d4ff"
          strokeOpacity="0.45"
          strokeWidth="1"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {CIRCUITS.map((d, i) => (
            <path key={`c-${i}`} d={d} />
          ))}
        </g>

        {/* Nodes */}
        <g fill="#00d4ff">
          {NODES.map((n, i) => (
            <circle key={`n-${i}`} cx={n.cx} cy={n.cy} r="2.2" opacity="0.9" />
          ))}
        </g>

        {/* QR pattern */}
        <g transform="translate(146 146)">
          <rect
            x="-2"
            y="-2"
            width="22"
            height="22"
            fill="#06101f"
            stroke="#BDA76B"
            strokeWidth="0.5"
            opacity="0.9"
          />
          {QR_PATTERN.flatMap((row, y) =>
            row.map((cell, x) =>
              cell ? (
                <rect
                  key={`qr-${x}-${y}`}
                  x={x * 3.6}
                  y={y * 3.6}
                  width="3"
                  height="3"
                  fill="#00d4ff"
                  opacity="0.95"
                />
              ) : null,
            ),
          )}
          <rect x="0" y="0" width="3" height="3" fill="#BDA76B" />
        </g>

        {/* Bouclier */}
        <g transform="translate(100 86)">
          <path
            d="M0 -22 C 12 -22, 20 -18, 22 -14 L 22 4 C 22 16, 12 24, 0 30 C -12 24, -22 16, -22 4 L -22 -14 C -20 -18, -12 -22, 0 -22 Z"
            fill="url(#og-shield)"
            stroke="#ffffff"
            strokeOpacity="0.35"
            strokeWidth="0.6"
          />
          <path
            d="M0 -22 C 12 -22, 20 -18, 22 -14 L 22 4 C 22 16, 12 24, 0 30 C -12 24, -22 16, -22 4 L -22 -14 C -20 -18, -12 -22, 0 -22 Z"
            fill="url(#og-shield-depth)"
          />
          <path
            d="M0 -17 C 10 -17, 17 -14, 18 -11 L 18 3 C 18 13, 10 20, 0 25 C -10 20, -18 13, -18 3 L -18 -11 C -17 -14, -10 -17, 0 -17 Z"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.25"
            strokeWidth="0.5"
          />
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
          <path
            d="M -8 1 L -2 8 L 9 -6"
            fill="none"
            stroke="#E8D08A"
            strokeWidth="2.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        {/* Baseline VERIFIED */}
        <text
          x="100"
          y="132"
          textAnchor="middle"
          fill="#00d4ff"
          opacity="0.7"
          style={{
            fontSize: "4.2px",
            fontWeight: 500,
            letterSpacing: "0.5em",
          }}
        >
          VERIFIED · SECURE · ON-CHAIN
        </text>

        {/* Wordmark BLOCKTRUST */}
        <text
          x="100"
          y="143"
          textAnchor="middle"
          fill="#BDA76B"
          style={{
            fontSize: "11px",
            fontWeight: 700,
            letterSpacing: "0.32em",
          }}
        >
          BLOCKTRUST
        </text>
      </g>
    </svg>
  );
}

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(135deg, #060d1a 0%, #0a1628 50%, #0d1f3c 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "60px 80px",
          fontFamily: "sans-serif",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Halo cyan haut-droite */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            background:
              "radial-gradient(circle, rgba(0,212,255,0.15) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* Halo gold bas-gauche */}
        <div
          style={{
            position: "absolute",
            bottom: "-80px",
            left: "-80px",
            width: "300px",
            height: "300px",
            background:
              "radial-gradient(circle, rgba(189,167,107,0.12) 0%, transparent 70%)",
            borderRadius: "50%",
            display: "flex",
          }}
        />

        {/* COLONNE GAUCHE */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "20px",
            flex: 1,
            zIndex: 1,
          }}
        >
          {/* Logo BLOCKTRUST */}
          <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
            <div
              style={{
                width: "52px",
                height: "52px",
                background: "rgba(0,212,255,0.1)",
                border: "2px solid #00d4ff",
                borderRadius: "12px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 0 20px rgba(0,212,255,0.3)",
              }}
            >
              <span
                style={{
                  color: "#00d4ff",
                  fontSize: "22px",
                  fontWeight: "bold",
                }}
              >
                BT
              </span>
            </div>
            <span
              style={{
                color: "#00d4ff",
                fontSize: "32px",
                fontWeight: "bold",
                letterSpacing: "6px",
              }}
            >
              BLOCKTRUST
            </span>
          </div>

          {/* Headline */}
          <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
            <span
              style={{
                color: "#ffffff",
                fontSize: "52px",
                fontWeight: "bold",
                lineHeight: "1.1",
                letterSpacing: "-1px",
              }}
            >
              Protégez chaque
            </span>
            <span
              style={{
                color: "#ffffff",
                fontSize: "52px",
                fontWeight: "bold",
                lineHeight: "1.1",
                letterSpacing: "-1px",
              }}
            >
              interaction de votre
            </span>
            <span
              style={{
                color: "#00d4ff",
                fontSize: "52px",
                fontWeight: "bold",
                lineHeight: "1.1",
                letterSpacing: "-1px",
              }}
            >
              écosystème digital
            </span>
          </div>

          {/* Sous-titre */}
          <span
            style={{
              color: "rgba(255,255,255,0.6)",
              fontSize: "20px",
              lineHeight: "1.4",
            }}
          >
            Signatures ES256 · Ancrage Polygon · QR rotatif anti-fraude
          </span>

          {/* Stats */}
          <div style={{ display: "flex", gap: "40px", marginTop: "8px" }}>
            {[
              { value: "ES256", label: "Cryptographie" },
              { value: "256-bit", label: "Encryption" },
              { value: "Polygon", label: "Blockchain" },
            ].map((stat) => (
              <div
                key={stat.value}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                }}
              >
                <span
                  style={{
                    color: "#00d4ff",
                    fontSize: "22px",
                    fontWeight: "bold",
                  }}
                >
                  {stat.value}
                </span>
                <span
                  style={{
                    color: "rgba(255,255,255,0.5)",
                    fontSize: "13px",
                    letterSpacing: "1px",
                  }}
                >
                  {stat.label.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* COLONNE DROITE — Badge SVG statique */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "360px",
            height: "360px",
            position: "relative",
            zIndex: 1,
            flexShrink: 0,
            marginLeft: "60px",
          }}
        >
          {/* Halo cyan derrière le badge */}
          <div
            style={{
              position: "absolute",
              width: "360px",
              height: "360px",
              background:
                "radial-gradient(circle, rgba(0,212,255,0.25) 0%, rgba(0,212,255,0.05) 50%, transparent 75%)",
              borderRadius: "50%",
              display: "flex",
            }}
          />

          {/* Badge */}
          <div style={{ display: "flex", position: "relative" }}>
            <StaticBadge size={340} />
          </div>

          {/* Pill POLYGON MAINNET sous le badge */}
          <div
            style={{
              position: "absolute",
              bottom: "-12px",
              background: "rgba(189,167,107,0.15)",
              border: "1px solid rgba(189,167,107,0.5)",
              borderRadius: "20px",
              padding: "6px 14px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span
              style={{
                color: "#E8D08A",
                fontSize: "11px",
                letterSpacing: "2px",
                fontWeight: "bold",
              }}
            >
              ⛓ POLYGON MAINNET
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
