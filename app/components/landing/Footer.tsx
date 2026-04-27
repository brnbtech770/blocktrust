"use client";

import Link from "next/link";
import { Linkedin, Network } from "lucide-react";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";

const links: { label: string; href: string }[] = [
  { label: "Accueil", href: "/" },
  { label: "Tarifs", href: "/pricing" },
  { label: "Vérifier", href: "/verify" },
  { label: "CGU", href: "/legal/cgu" },
  { label: "Confidentialité", href: "/legal/privacy" },
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
              <BlockTrustBadge size={40} instanceId="footer" className="shrink-0" />
              <span className="font-syne text-lg font-bold leading-none tracking-[0.06em] text-white">
                BLOCK<span className="text-bt-cyan">TRUST</span>
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-white/65">
              Certification d&apos;identité numérique ancrée sur la blockchain Polygon.
              Pour particuliers et entreprises.
            </p>
            <div
              className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-white/70"
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
            <ul className="grid grid-cols-2 gap-2 sm:gap-3">
              {links.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-sm text-white/65 transition-colors hover:text-bt-cyan"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="font-syne mb-4 text-sm font-bold uppercase tracking-wider text-white">
              Réseaux
            </p>
            <a
              href="https://www.linkedin.com/company/blocktrust"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white/70 transition-all hover:border-bt-cyan/60 hover:text-bt-cyan"
              aria-label="LinkedIn BlockTrust"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          </div>
        </div>

        <div
          className="mt-10 border-t pt-6 text-xs text-white/55 sm:flex sm:items-center sm:justify-between"
          style={{ borderColor: "var(--bt-border)" }}
        >
          <p>© 2026 BRNB TECH SASU — BLOCKTRUST® Tous droits réservés</p>
          <p className="mt-2 sm:mt-0">RCS Paris — Hébergé par Vercel</p>
        </div>
      </div>
    </footer>
  );
}
