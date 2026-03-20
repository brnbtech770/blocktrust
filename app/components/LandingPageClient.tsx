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

            <h1
              className="font-extrabold leading-[1.12] mb-3 sm:mb-4 max-w-[22ch] sm:max-w-none text-[1.65rem] sm:text-4xl md:text-5xl"
              style={{
                fontFamily: 'var(--font-syne), sans-serif',
              }}
            >
              <span className="text-white">Certificat d&apos;identité </span>
              <span style={{ color: '#00d4ff' }}>infalsifiable</span>
              <span className="text-white"> sur </span>
              <span style={{ color: 'var(--bt-gold)' }}>blockchain</span>
            </h1>

            <p className="text-sm sm:text-base mb-6 sm:mb-8" style={{ color: 'var(--bt-muted)' }}>
              Badge vérifié. QR code scannable.{" "}
              <span className="font-semibold" style={{ color: '#00d4ff' }}>Impossible à copier.</span>
            </p>

            <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 mb-8 sm:mb-10">
              <a
                href="/dashboard/create"
                className="inline-flex justify-center items-center rounded-[10px] px-5 py-3 sm:px-7 sm:py-3.5 text-sm sm:text-[15px] font-bold transition-transform hover:scale-[1.02] hover:brightness-110 w-full sm:w-auto"
                style={{ background: '#00d4ff', color: '#0a1628' }}
              >
                Créer mon certificat
              </a>
              <a
                href="/verify"
                className="inline-flex justify-center items-center rounded-[10px] px-5 py-3 sm:px-7 sm:py-3.5 text-sm sm:text-[15px] font-medium border-2 transition-colors hover:bg-[var(--bt-gold-dim)] w-full sm:w-auto"
                style={{ borderColor: 'var(--bt-gold)', color: 'var(--bt-gold)' }}
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
          <div
            className="p-4 sm:p-6 rounded-2xl border backdrop-blur-lg transition-colors hover:border-[var(--bt-cyan)]/40"
            style={{
              background: 'rgba(13,31,60,0.8)',
              borderColor: 'var(--bt-border)',
            }}
          >
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Sécurité maximale
            </h3>
            <p className="text-sm sm:text-base" style={{ color: 'var(--bt-muted)' }}>
              Certificats cryptographiques vérifiables avec signatures JWT et ancrage blockchain.
            </p>
          </div>
          <div
            className="p-4 sm:p-6 rounded-2xl border backdrop-blur-lg transition-colors hover:border-[var(--bt-cyan)]/40"
            style={{
              background: 'rgba(13,31,60,0.8)',
              borderColor: 'var(--bt-border)',
            }}
          >
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Vérification instantanée
            </h3>
            <p className="text-sm sm:text-base" style={{ color: 'var(--bt-muted)' }}>
              QR codes et badges intégrables pour une vérification rapide et fiable.
            </p>
          </div>
          <div
            className="p-4 sm:p-6 rounded-2xl border backdrop-blur-lg transition-colors hover:border-[var(--bt-cyan)]/40"
            style={{
              background: 'rgba(13,31,60,0.8)',
              borderColor: 'var(--bt-border)',
            }}
          >
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-lg sm:text-xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
              Protection anti-fraude
            </h3>
            <p className="text-sm sm:text-base" style={{ color: 'var(--bt-muted)' }}>
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
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white mb-3 sm:mb-4" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
            Prêt à sécuriser votre identité ?
          </h2>
          <p className="text-sm sm:text-base px-1" style={{ color: 'var(--bt-muted)', marginBottom: '2rem' }}>
            Rejoignez BlockTrust et protégez votre réputation en ligne.
          </p>
          <a
            href="/pricing"
            className="inline-block rounded-lg px-8 py-3 font-bold text-[15px] transition-all hover:brightness-110"
            style={{ background: '#00d4ff', color: '#0a1628' }}
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
