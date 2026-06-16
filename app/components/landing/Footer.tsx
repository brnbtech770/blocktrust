"use client";

import Link from "next/link";
import { Instagram, Linkedin, Network } from "lucide-react";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";
import FooterSiteCertBadge from "@/app/components/landing/FooterSiteCertBadge";
import { openCookieSettings } from "@/app/lib/cookie-consent";

const links: { label: string; href: string }[] = [
  { label: "Accueil", href: "/" },
  { label: "Tarifs", href: "/pricing" },
  { label: "Actualités", href: "/menaces" },
  { label: "Vérifier", href: "/verify" },
  { label: "CGU", href: "/cgu" },
  { label: "CGV", href: "/cgv" },
  { label: "Confidentialité", href: "/privacy" },
  { label: "Contact", href: "mailto:contact@blocktrust.tech" },
];

export default function Footer() {
  return (
    <footer
      className="relative z-10 border-t"
      style={{
        borderColor: "var(--bt-border)",
        background: "rgba(6,14,26,0.55)",
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="flex flex-col items-start gap-4">
            <Link href="/" className="flex items-center gap-3" style={{ textDecoration: "none" }}>
              <BlockTrustBadge size={40} instanceId="footer" showWatermark={false} className="shrink-0" />
              <span className="font-syne text-lg font-bold leading-none tracking-wider text-bt-cyan">
                BLOCKTRUST<span className="text-[10px] align-super">™</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-white/65">
              Certification d&apos;identité numérique ancrée sur la blockchain Polygon.
              Pour particuliers et entreprises.
            </p>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-wider text-white/70"
              style={{ borderColor: "var(--bt-cyan-border)" }}
            >
              <Network className="h-3.5 w-3.5 text-bt-cyan" />
              Ancré sur Polygon Blockchain
            </div>
          </div>

          <div>
            <p className="font-syne mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Liens
            </p>
            <ul className="flex flex-wrap gap-x-4 gap-y-2">
              {links.map((l) => (
                <li key={l.href} className="whitespace-nowrap">
                  <Link
                    href={l.href}
                    className="inline-flex min-h-[44px] items-center text-sm text-white/65 transition-colors hover:text-bt-cyan"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li className="whitespace-nowrap">
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="inline-flex min-h-[44px] items-center text-sm text-white/65 transition-colors hover:text-bt-cyan"
                >
                  Gestion des cookies
                </button>
              </li>
            </ul>
          </div>

          <div>
            <p className="font-syne mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Réseaux
            </p>
            <div className="flex items-center gap-3">
              <a
                href="https://www.linkedin.com/company/blocktrust"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 text-white/70 transition-all hover:border-bt-cyan/60 hover:text-bt-cyan"
                aria-label="LinkedIn BLOCKTRUST™"
              >
                <Linkedin className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/blocktrust.tech/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-white/15 text-white/70 transition-all hover:border-bt-cyan/60 hover:text-bt-cyan"
                aria-label="Instagram BLOCKTRUST™"
              >
                <Instagram className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div
          className="mt-10 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          style={{ borderColor: "var(--bt-border)" }}
        >
          <p className="text-xs text-white/55">
            © 2026 BRNB TECH SAS — BLOCKTRUST<span className="text-[10px] align-super">™</span>
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
            <p className="text-xs text-white/55">RCS Paris — Hébergé par Vercel</p>
            <FooterSiteCertBadge />
          </div>
        </div>
      </div>
    </footer>
  );
}
