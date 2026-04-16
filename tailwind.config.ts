import type { Config } from "tailwindcss";

/**
 * Design tokens BlockTrust — complète @theme dans globals.css (Tailwind v4).
 * `cyan-*` Tailwind par défaut est conservé ; la marque utilise `bt-cyan`, `navy`, `gold`.
 */
export default {
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-inter)",
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        syne: ["var(--font-syne)", "Syne", "ui-sans-serif", "sans-serif"],
        mono: [
          "var(--font-mono-bt)",
          "IBM Plex Mono",
          "ui-monospace",
          "monospace",
        ],
      },
      colors: {
        navy: "#0a1628",
        gold: "#BDA76B",
        "bt-cyan": "#00d4ff",
      },
      fontSize: {
        display: ["3.5rem", { lineHeight: "1.1", fontWeight: "700" }],
        h1: ["2.25rem", { lineHeight: "1.2", fontWeight: "700" }],
        h2: ["1.75rem", { lineHeight: "1.3", fontWeight: "600" }],
        h3: ["1.25rem", { lineHeight: "1.4", fontWeight: "600" }],
      },
    },
  },
} satisfies Config;
