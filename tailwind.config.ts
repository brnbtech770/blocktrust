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
      boxShadow: {
        "glow-cyan": "0 0 8px rgba(0, 212, 255, 0.6)",
        "glow-gold": "0 0 8px rgba(189, 167, 107, 0.6)",
      },
      dropShadow: {
        "glow-cyan": "0 0 6px rgba(0, 212, 255, 0.8)",
        "glow-gold": "0 0 6px rgba(189, 167, 107, 0.8)",
      },
      animation: {
        "fade-up": "fadeUp 0.7s ease-out forwards",
        "fade-in": "fadeIn 0.7s ease-out forwards",
        "glow-pulse": "glowPulse 2.4s ease-in-out infinite",
        float: "float 4s ease-in-out infinite",
        "spin-slow": "spin 18s linear infinite",
        "draw-line": "drawLine 1.2s ease-out forwards",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(30px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        glowPulse: {
          "0%, 100%": {
            boxShadow:
              "0 0 20px rgba(0,212,255,0.3), 0 0 40px rgba(0,212,255,0.15)",
          },
          "50%": {
            boxShadow:
              "0 0 40px rgba(0,212,255,0.6), 0 0 80px rgba(0,212,255,0.25)",
          },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        drawLine: {
          "0%": { transform: "scaleY(0)", transformOrigin: "top" },
          "100%": { transform: "scaleY(1)", transformOrigin: "top" },
        },
      },
    },
  },
} satisfies Config;
