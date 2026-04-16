"use client";

import Navbar from "./landing/Navbar";
import { Logo } from "@/app/components/ui/Logo";

export default function LandingPageClient() {
  return (
    <div className="min-h-screen bt-circuit-bg" style={{ background: 'var(--bt-navy)' }}>
      <Navbar />

      {/* Hero — 2 colonnes 60% texte / 40% logo */}
      <section className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-10 sm:py-16 md:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 lg:gap-8 items-center">
          {/* Colonne gauche — ~60% */}
          <div className="lg:col-span-3">
            <div
              className="inline-flex items-center rounded-full border px-4 py-1.5 text-[13px] text-white mb-6"
              style={{
                background: 'rgba(0,212,255,0.08)',
                borderColor: 'var(--bt-cyan-border)',
              }}
            >
              ✦ Technologie <span className="font-bold ml-1" style={{ color: '#00d4ff' }}>Polygon</span> Blockchain
            </div>

            <h1 className="font-syne mb-3 max-w-[22ch] text-4xl font-bold leading-[1.1] text-white sm:mb-4 sm:max-w-none sm:text-6xl lg:text-8xl">
              <span className="text-white">Certificat d&apos;identité </span>
              <span className="text-bt-cyan">infalsifiable</span>
              <span className="text-white"> sur </span>
              <span className="text-gold">blockchain</span>
            </h1>

            <p className="mb-6 font-sans text-sm leading-relaxed text-white/80 sm:mb-8 sm:text-base">
              Badge vérifié. QR code scannable.{" "}
              <span className="font-semibold text-bt-cyan">Impossible à copier.</span>
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-10">
              <a
                href="/dashboard/create"
                className="inline-flex w-full items-center justify-center rounded-lg bg-bt-cyan px-6 py-3 font-sans text-sm font-semibold text-navy transition-all hover:bg-bt-cyan/90 sm:w-auto sm:text-[15px]"
              >
                Créer mon certificat
              </a>
              <a
                href="/verify"
                className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 px-6 py-3 font-sans text-sm font-semibold text-white transition-all hover:border-white/40 sm:w-auto sm:text-[15px]"
              >
                Voir une démo
              </a>
            </div>

            {/* Trust indicators */}
            <ul className="flex flex-wrap gap-6 text-[13px]" style={{ color: 'var(--bt-muted)' }}>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#00d4ff' }} />
                100% Sécurisé
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: 'var(--bt-gold)' }} />
                Conformité RGPD
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: '#1DB87E' }} />
                +2,000 utilisateurs
              </li>
            </ul>
          </div>

          {/* Colonne droite — logo 380px */}
          <div className="lg:col-span-2 flex justify-center lg:justify-end mt-8 lg:mt-0">
            <div className="logo-hero flex flex-col items-center">
              <Logo size="hero" withText={false} href="/" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-8">
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg transition-all hover:border-gold/30 sm:p-6">
            <div className="mb-4 text-4xl">🔐</div>
            <h3 className="font-syne mb-2 text-lg font-semibold text-white sm:text-xl">
              Sécurité maximale
            </h3>
            <p className="font-sans text-sm leading-relaxed text-white/80 sm:text-base">
              Certificats cryptographiques vérifiables avec signatures JWT et ancrage blockchain.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg transition-all hover:border-gold/30 sm:p-6">
            <div className="mb-4 text-4xl">⚡</div>
            <h3 className="font-syne mb-2 text-lg font-semibold text-white sm:text-xl">
              Vérification instantanée
            </h3>
            <p className="font-sans text-sm leading-relaxed text-white/80 sm:text-base">
              QR codes et badges intégrables pour une vérification rapide et fiable.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg transition-all hover:border-gold/30 sm:p-6">
            <div className="mb-4 text-4xl">🛡️</div>
            <h3 className="font-syne mb-2 text-lg font-semibold text-white sm:text-xl">
              Protection anti-fraude
            </h3>
            <p className="font-sans text-sm leading-relaxed text-white/80 sm:text-base">
              Détection automatique des tentatives de falsification et alertes en temps réel.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-12 sm:py-20">
        <div
          className="rounded-2xl sm:rounded-3xl p-6 sm:p-10 md:p-12 text-center border"
          style={{
            background: 'rgba(0,212,255,0.08)',
            borderColor: 'var(--bt-cyan-border)',
          }}
        >
          <h2 className="font-syne mb-3 text-xl font-semibold text-white sm:mb-4 sm:text-2xl md:text-3xl">
            Prêt à sécuriser votre identité ?
          </h2>
          <p className="mb-8 px-1 font-sans text-sm leading-relaxed text-white/80 sm:text-base">
            Rejoignez BlockTrust et protégez votre réputation en ligne.
          </p>
          <a
            href="/pricing"
            className="inline-block rounded-lg bg-bt-cyan px-8 py-3 font-sans text-[15px] font-semibold text-navy transition-all hover:bg-bt-cyan/90"
          >
            Voir les tarifs
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer
        className="relative z-10 border-t py-8"
        style={{ borderColor: 'var(--bt-border)', background: 'rgba(6,14,26,0.5)' }}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 flex flex-col items-center gap-3 sm:gap-4">
          <div className="md:hidden">
            <Logo size="sm" withText={true} href="/" />
          </div>
          <div className="hidden md:block">
            <Logo size="md" withText={true} href="/" />
          </div>
          <p className="text-sm" style={{ color: 'var(--bt-muted)' }}>
            © 2024 BlockTrust. Tous droits réservés.
          </p>
        </div>
      </footer>
    </div>
  );
}
