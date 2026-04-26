/**
 * Badge BlockTrust inline SVG.
 * Hexagone bordé d'un dégradé cyan→or, fond navy avec circuit lines,
 * bouclier central avec lettres "BT", label "BLOCKTRUST" en or.
 *
 * Aucun asset externe : 100 % SVG, autonome, scale parfaitement.
 * `viewBox` 200×200 → respecte le ratio carré, classes Tailwind sur le wrapper.
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
        <filter id="bt-badge-glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="bt-badge-glow-strong">
          <feGaussianBlur stdDeviation="6" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <linearGradient id="bt-badge-hex-bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0a1628" />
          <stop offset="100%" stopColor="#0d1f3c" />
        </linearGradient>
        <linearGradient id="bt-badge-border" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00d4ff" />
          <stop offset="50%" stopColor="#BDA76B" />
          <stop offset="100%" stopColor="#00d4ff" />
        </linearGradient>
      </defs>

      {/* Hexagone extérieur — bordure dégradée cyan/or avec glow */}
      <polygon
        points="100,8 185,52 185,148 100,192 15,148 15,52"
        fill="none"
        stroke="url(#bt-badge-border)"
        strokeWidth="2.5"
        filter="url(#bt-badge-glow)"
      />

      {/* Hexagone intérieur — fond navy dégradé */}
      <polygon
        points="100,18 175,57 175,143 100,182 25,143 25,57"
        fill="url(#bt-badge-hex-bg)"
      />

      {/* Circuit lines latérales */}
      <line x1="30" y1="80" x2="60" y2="80" stroke="#00d4ff" strokeWidth="0.8" opacity="0.4" />
      <line x1="140" y1="80" x2="170" y2="80" stroke="#00d4ff" strokeWidth="0.8" opacity="0.4" />
      <line x1="30" y1="120" x2="60" y2="120" stroke="#00d4ff" strokeWidth="0.8" opacity="0.4" />
      <line x1="140" y1="120" x2="170" y2="120" stroke="#00d4ff" strokeWidth="0.8" opacity="0.4" />

      {/* Points de circuit */}
      <circle cx="60" cy="80" r="2.5" fill="#00d4ff" opacity="0.6" />
      <circle cx="140" cy="80" r="2.5" fill="#00d4ff" opacity="0.6" />
      <circle cx="60" cy="120" r="2.5" fill="#00d4ff" opacity="0.6" />
      <circle cx="140" cy="120" r="2.5" fill="#00d4ff" opacity="0.6" />
      <circle cx="100" cy="40" r="2" fill="#BDA76B" opacity="0.6" />
      <circle cx="100" cy="160" r="2" fill="#BDA76B" opacity="0.6" />

      {/* Bouclier central — contour cyan + fond cyan translucide */}
      <path
        d="M100 55 L125 65 L125 95 Q125 115 100 125 Q75 115 75 95 L75 65 Z"
        fill="rgba(0,212,255,0.08)"
        stroke="#00d4ff"
        strokeWidth="2"
        filter="url(#bt-badge-glow)"
      />

      {/* Lettres "BT" au centre du bouclier */}
      <text
        x="100"
        y="97"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="22"
        fontWeight="700"
        fontFamily="var(--font-space-grotesk), 'Space Grotesk', sans-serif"
        fill="#00d4ff"
        filter="url(#bt-badge-glow)"
      >
        BT
      </text>

      {/* Label "BLOCKTRUST" en or sous le bouclier */}
      <text
        x="100"
        y="148"
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize="9"
        fontWeight="600"
        fontFamily="var(--font-space-grotesk), 'Space Grotesk', sans-serif"
        fill="#BDA76B"
        letterSpacing="3"
      >
        BLOCKTRUST
      </text>

      {/* Points décoratifs aux coins intérieurs */}
      <circle cx="55" cy="60" r="1.5" fill="#00d4ff" opacity="0.4" />
      <circle cx="145" cy="60" r="1.5" fill="#00d4ff" opacity="0.4" />
      <circle cx="55" cy="140" r="1.5" fill="#00d4ff" opacity="0.4" />
      <circle cx="145" cy="140" r="1.5" fill="#00d4ff" opacity="0.4" />
    </svg>
  );
}
