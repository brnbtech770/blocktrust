/**
 * Badge BlockTrust premium inline SVG (v2 — circuits animés).
 *
 * Composition (du fond vers le premier plan) :
 *  1. Halo concentrique (3 cercles, opacités décroissantes)
 *  2. Anneau extérieur pointillé rotatif — DOUBLE stroke cyan + or
 *     en damier (overlay de 2 cercles avec dasharray offset)
 *  3. Hexagone double : bordure dégradée cyan/or + fond radial navy
 *  4. Circuit imprimé externe (lignes + intersections + clignotants),
 *     clippé sur l'hexagone intérieur
 *  5. Effet scanline (pattern 2px) sur tout l'intérieur
 *  6. QR code simplifié 3×3 dans le coin haut-gauche
 *  7. Petits hexagones décoratifs or aux coins
 *  8. Bouclier central cyan
 *  9. Circuits ANIMÉS dans le bouclier (data-flow CSS keyframes :
 *     bt-flow1 / bt-flow2 / bt-pulse-dot / bt-scan), clippés sur la
 *     forme du bouclier pour ne pas déborder
 * 10. Checkmark blanc (style ShieldCheck) au premier plan
 * 11. Label BLOCKTRUST en IBM Plex Mono or
 * 12. Ligne or pulsée sous le label (SMIL animate opacity)
 *
 * 100 % SVG inline + CSS keyframes inline. Aucune dépendance.
 */
export default function BlockTrustBadge({
  className = "",
}: {
  className?: string;
}) {
  return (
    <svg
      role="img"
      aria-label="Badge BlockTrust"
      viewBox="0 0 200 200"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <defs>
        {/* Keyframes CSS inline — préfixe bt- pour éviter toute collision globale */}
        <style>
          {`
            @keyframes bt-flow1 {
              0%   { stroke-dashoffset: 100; opacity: 0.2; }
              50%  { opacity: 0.85; }
              100% { stroke-dashoffset: 0;   opacity: 0.2; }
            }
            @keyframes bt-flow2 {
              0%   { stroke-dashoffset: 80; opacity: 0.1; }
              50%  { opacity: 0.7; }
              100% { stroke-dashoffset: 0;  opacity: 0.1; }
            }
            @keyframes bt-pulse-dot {
              0%, 100% { opacity: 0.3; r: 1.6; }
              50%      { opacity: 1;   r: 2.6; }
            }
            @keyframes bt-scan {
              0%   { transform: translateY(-22px); opacity: 0; }
              10%  { opacity: 0.7; }
              90%  { opacity: 0.7; }
              100% { transform: translateY(48px); opacity: 0; }
            }
            @media (prefers-reduced-motion: reduce) {
              .bt-anim { animation: none !important; }
            }
          `}
        </style>

        <filter id="bt-badge-glow">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bt-badge-glow-strong">
          <feGaussianBlur stdDeviation="5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <radialGradient id="bt-badge-hex-bg" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#0d1f3c" />
          <stop offset="100%" stopColor="#060d1a" />
        </radialGradient>

        <linearGradient id="bt-badge-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="50%" stopColor="#BDA76B" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>

        <clipPath id="bt-badge-hex-clip">
          <polygon points="100,18 175,57 175,143 100,182 25,143 25,57" />
        </clipPath>

        {/* ClipPath spécifique au bouclier central — limite les circuits animés */}
        <clipPath id="bt-badge-shield-clip">
          <path d="M100 55 L125 65 L125 95 Q125 115 100 125 Q75 115 75 95 L75 65 Z" />
        </clipPath>

        <pattern
          id="bt-badge-scanlines"
          width="2"
          height="2"
          patternUnits="userSpaceOnUse"
        >
          <rect width="2" height="1" fill="rgba(255,255,255,0.05)" />
        </pattern>
      </defs>

      {/* 1. Halo concentrique */}
      <circle cx="100" cy="100" r="98" fill="rgba(0,212,255,0.15)" />
      <circle cx="100" cy="100" r="92" fill="rgba(0,212,255,0.08)" />
      <circle cx="100" cy="100" r="86" fill="rgba(0,212,255,0.03)" />

      {/* 2. Anneau rotatif — overlay cyan + or en damier */}
      <g>
        <animateTransform
          attributeName="transform"
          attributeType="XML"
          type="rotate"
          from="0 100 100"
          to="360 100 100"
          dur="18s"
          repeatCount="indefinite"
        />
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="none"
          stroke="#00d4ff"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 6"
        />
        <circle
          cx="100"
          cy="100"
          r="95"
          fill="none"
          stroke="#BDA76B"
          strokeOpacity="0.35"
          strokeWidth="1"
          strokeDasharray="2 6"
          strokeDashoffset="4"
        />
      </g>

      {/* 3. Hexagone bordure */}
      <polygon
        points="100,8 185,52 185,148 100,192 15,148 15,52"
        fill="none"
        stroke="url(#bt-badge-border)"
        strokeWidth="2.5"
        filter="url(#bt-badge-glow)"
      />
      {/* 3'. Hexagone fond */}
      <polygon
        points="100,18 175,57 175,143 100,182 25,143 25,57"
        fill="url(#bt-badge-hex-bg)"
      />

      {/* 4-7. Circuits externes + scanlines + dots + QR + hex décoratifs */}
      <g clipPath="url(#bt-badge-hex-clip)">
        <g stroke="#00d4ff" strokeOpacity="0.3" strokeWidth="0.6">
          <line x1="20" y1="50" x2="180" y2="50" />
          <line x1="20" y1="70" x2="180" y2="70" />
          <line x1="20" y1="130" x2="180" y2="130" />
          <line x1="20" y1="150" x2="180" y2="150" />
          <line x1="50" y1="20" x2="50" y2="180" />
          <line x1="80" y1="20" x2="80" y2="180" />
          <line x1="120" y1="20" x2="120" y2="180" />
          <line x1="150" y1="20" x2="150" y2="180" />
        </g>

        <rect x="20" y="20" width="160" height="160" fill="url(#bt-badge-scanlines)" />

        <g fill="#00d4ff" filter="url(#bt-badge-glow)">
          <circle cx="50" cy="50" r="1.5" opacity="0.7" />
          <circle cx="50" cy="70" r="1.5" opacity="0.7" />
          <circle cx="80" cy="50" r="1.5" opacity="0.7" />
          <circle cx="120" cy="50" r="1.5" opacity="0.7" />
          <circle cx="150" cy="50" r="1.5" opacity="0.7" />
          <circle cx="150" cy="70" r="1.5" opacity="0.7" />
          <circle cx="50" cy="130" r="1.5" opacity="0.7" />
          <circle cx="50" cy="150" r="1.5" opacity="0.7" />
          <circle cx="80" cy="150" r="1.5" opacity="0.7" />
          <circle cx="120" cy="150" r="1.5" opacity="0.7" />
          <circle cx="150" cy="130" r="1.5" opacity="0.7" />
          <circle cx="150" cy="150" r="1.5" opacity="0.7" />

          <circle cx="80" cy="70" r="2" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="1.8s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="120" cy="70" r="2" opacity="0.7">
            <animate
              attributeName="opacity"
              values="1;0.3;1"
              dur="2.2s"
              begin="0.6s"
              repeatCount="indefinite"
            />
          </circle>
          <circle cx="120" cy="130" r="2" opacity="0.7">
            <animate
              attributeName="opacity"
              values="0.3;1;0.3"
              dur="2.6s"
              begin="0.3s"
              repeatCount="indefinite"
            />
          </circle>
        </g>

        {/* QR code 3×3 simplifié, coin haut-gauche */}
        <g fill="#00d4ff" opacity="0.6">
          <rect x="38" y="62" width="3" height="3" />
          <rect x="44" y="62" width="3" height="3" />
          <rect x="50" y="62" width="3" height="3" />
          <rect x="38" y="68" width="3" height="3" />
          <rect x="50" y="68" width="3" height="3" />
          <rect x="44" y="74" width="3" height="3" />
          <rect x="50" y="74" width="3" height="3" />
        </g>

        {/* Hex décoratifs or */}
        <g fill="none" stroke="#BDA76B" strokeOpacity="0.45" strokeWidth="0.8">
          <polygon points="155,62 161,62 164,67 161,72 155,72 152,67" />
          <polygon points="38,128 44,128 47,133 44,138 38,138 35,133" />
          <polygon points="155,128 161,128 164,133 161,138 155,138 152,133" />
        </g>
      </g>

      {/* 8. Bouclier central — fill + stroke (sans glow pour laisser circuits propres) */}
      <path
        d="M100 55 L125 65 L125 95 Q125 115 100 125 Q75 115 75 95 L75 65 Z"
        fill="rgba(0,212,255,0.1)"
        stroke="#00d4ff"
        strokeWidth="2"
        filter="url(#bt-badge-glow)"
      />

      {/* 9. Circuits animés data-flow DANS le bouclier (clippés à sa forme) */}
      <g clipPath="url(#bt-badge-shield-clip)">
        {/* Horizontales — flow1 */}
        <line
          x1="75"
          y1="75"
          x2="125"
          y2="75"
          stroke="#00d4ff"
          strokeWidth="1"
          strokeDasharray="8 4"
          className="bt-anim"
          style={{ animation: "bt-flow1 2s linear infinite" }}
        />
        <line
          x1="75"
          y1="115"
          x2="125"
          y2="115"
          stroke="#00d4ff"
          strokeWidth="1"
          strokeDasharray="8 4"
          className="bt-anim"
          style={{ animation: "bt-flow1 2.5s linear infinite reverse" }}
        />

        {/* Verticales — flow2 */}
        <line
          x1="80"
          y1="70"
          x2="80"
          y2="120"
          stroke="#00d4ff"
          strokeWidth="0.8"
          strokeDasharray="6 4"
          className="bt-anim"
          style={{ animation: "bt-flow2 3s linear infinite" }}
        />
        <line
          x1="120"
          y1="70"
          x2="120"
          y2="120"
          stroke="#00d4ff"
          strokeWidth="0.8"
          strokeDasharray="6 4"
          className="bt-anim"
          style={{ animation: "bt-flow2 2.8s linear infinite reverse" }}
        />

        {/* Points de connexion pulsés (CSS @keyframes pulse-dot) */}
        <circle
          cx="80"
          cy="75"
          r="2"
          fill="#00d4ff"
          className="bt-anim"
          style={{ animation: "bt-pulse-dot 2s ease-in-out infinite" }}
        />
        <circle
          cx="120"
          cy="75"
          r="2"
          fill="#00d4ff"
          className="bt-anim"
          style={{ animation: "bt-pulse-dot 2.3s ease-in-out infinite" }}
        />
        <circle
          cx="80"
          cy="115"
          r="2"
          fill="#00d4ff"
          className="bt-anim"
          style={{ animation: "bt-pulse-dot 1.8s ease-in-out infinite" }}
        />
        <circle
          cx="120"
          cy="115"
          r="2"
          fill="#00d4ff"
          className="bt-anim"
          style={{ animation: "bt-pulse-dot 2.5s ease-in-out infinite" }}
        />

        {/* Ligne de scan horizontale qui balaie verticalement */}
        <line
          x1="75"
          y1="70"
          x2="125"
          y2="70"
          stroke="#00d4ff"
          strokeWidth="0.6"
          opacity="0.6"
          className="bt-anim"
          style={{ animation: "bt-scan 3s ease-in-out infinite" }}
        />
      </g>

      {/* 10. Checkmark blanc (style ShieldCheck) au premier plan */}
      <path
        d="M88 92 L96 100 L112 82"
        fill="none"
        stroke="#ffffff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#bt-badge-glow)"
      />

      {/* 11. Label BLOCKTRUST */}
      <text
        x="100"
        y="146"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="8.5"
        fontWeight="600"
        fontFamily="var(--font-mono-bt), 'IBM Plex Mono', ui-monospace, monospace"
        fill="#BDA76B"
        letterSpacing="3"
      >
        BLOCKTRUST
      </text>

      {/* 12. Ligne or pulsée sous le label */}
      <line
        x1="80"
        y1="156"
        x2="120"
        y2="156"
        stroke="#BDA76B"
        strokeWidth="1"
        strokeLinecap="round"
      >
        <animate
          attributeName="opacity"
          values="0.35;1;0.35"
          dur="2.4s"
          repeatCount="indefinite"
        />
      </line>
    </svg>
  );
}
