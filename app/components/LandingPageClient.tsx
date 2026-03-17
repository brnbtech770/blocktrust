"use client";

import PublicHeader from "./PublicHeader";
import { Logo } from "@/app/components/ui/Logo";

export default function LandingPageClient() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-950">
      {/* Header */}
      <PublicHeader />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center">
          <div className="flex justify-center mb-8">
            <div className="logo-hero">
              <Logo size="lg" withText={false} href="/" />
            </div>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6">
            Certifiez votre identité
            <br />
            <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">
              avec confiance
            </span>
          </h1>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            BlockTrust vous permet de créer des certificats vérifiables pour
            authentifier votre identité et sécuriser vos communications.
          </p>
          <div className="flex gap-4 justify-center">
            <a
              href="/pricing"
              className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all border border-cyan-400/30"
            >
              Commencer
            </a>
            <a
              href="/verify"
              className="bg-blue-800/50 text-white font-medium py-3 px-8 rounded-lg hover:bg-blue-700/50 transition border border-blue-700/50"
            >
              Vérifier un certificat
            </a>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="bg-blue-900/30 backdrop-blur-lg p-6 rounded-2xl border border-blue-800/50 hover:border-cyan-500/50 transition-colors">
            <div className="text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Sécurité maximale
            </h3>
            <p className="text-gray-300">
              Certificats cryptographiques vérifiables avec signatures JWT et
              ancrage blockchain.
            </p>
          </div>
          <div className="bg-blue-900/30 backdrop-blur-lg p-6 rounded-2xl border border-blue-800/50 hover:border-cyan-500/50 transition-colors">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Vérification instantanée
            </h3>
            <p className="text-gray-300">
              QR codes et badges intégrables pour une vérification rapide et
              fiable.
            </p>
          </div>
          <div className="bg-blue-900/30 backdrop-blur-lg p-6 rounded-2xl border border-blue-800/50 hover:border-cyan-500/50 transition-colors">
            <div className="text-4xl mb-4">🛡️</div>
            <h3 className="text-xl font-bold text-white mb-2">
              Protection anti-fraude
            </h3>
            <p className="text-gray-300">
              Détection automatique des tentatives de falsification et
              alertes en temps réel.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-3xl p-12 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Prêt à sécuriser votre identité ?
          </h2>
          <p className="text-gray-300 mb-8">
            Rejoignez BlockTrust et protégez votre réputation en ligne.
          </p>
          <a
            href="/pricing"
            className="inline-block bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-3 px-8 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all border border-cyan-400/30"
          >
            Voir les tarifs
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-blue-900/50 bg-blue-950/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center gap-4 text-gray-300">
          <Logo size="md" withText={true} href="/" />
          <p className="text-sm">© 2024 BlockTrust. Tous droits réservés.</p>
        </div>
      </footer>
    </div>
  );
}
