// app/cookies/page.tsx
// Politique cookies BLOCKTRUST™ — liste des traceurs et durées de conservation.
// ============================================================

import type { Metadata } from 'next'
import Link from 'next/link'
import Navbar from '@/app/components/landing/Navbar'
import Footer from '@/app/components/landing/Footer'

export const metadata: Metadata = {
  title: 'Politique cookies',
  description:
    'Politique cookies BLOCKTRUST™ — catégories, liste des cookies, durées de conservation et gestion du consentement.',
  alternates: { canonical: '/cookies' },
}

const COOKIE_ROWS = [
  {
    name: 'next-auth.session-token',
    purpose: 'Gestion de session et authentification',
    duration: 'Session',
    provider: 'BLOCKTRUST™',
  },
  {
    name: '__stripe_sid',
    purpose: 'Sécurité et prévention de la fraude',
    duration: 'Session',
    provider: 'Stripe',
  },
  {
    name: '__stripe_mid',
    purpose: 'Sécurité et prévention de la fraude',
    duration: '1 an',
    provider: 'Stripe',
  },
  {
    name: 'vercel_flags',
    purpose: "Mesure d'audience et performance",
    duration: '13 mois maximum',
    provider: 'Vercel',
  },
] as const

export default function CookiesPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bt-circuit-bg"
      style={{ background: 'var(--bt-navy)' }}
    >
      <Navbar />
      <article className="mx-auto max-w-3xl px-4 py-10 text-white/80 sm:px-6 sm:py-14">
        <header className="mb-10">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-[#00d4ff]/80">
            BLOCKTRUST™
          </p>
          <h1 className="font-syne text-2xl font-bold text-white sm:text-3xl">
            Politique cookies
          </h1>
          <p className="mt-3 text-sm text-white/50">Dernière mise à jour : 5 juillet 2026</p>
        </header>

        <div className="space-y-8 text-sm leading-relaxed sm:text-base">
          <section>
            <h2 className="font-syne mb-3 text-lg font-semibold text-[#00d4ff]">
              1. Objet
            </h2>
            <p>
              La présente politique décrit l&apos;utilisation des cookies et traceurs sur le site{' '}
              <strong className="text-white/90">blocktrust.tech</strong>, édité par{' '}
              <strong className="text-white/90">BRNB TECH SAS</strong>, conformément aux
              recommandations de la CNIL et au Règlement ePrivacy.
            </p>
          </section>

          <section>
            <h2 className="font-syne mb-3 text-lg font-semibold text-[#00d4ff]">
              2. Catégories de cookies
            </h2>
            <ul className="ml-4 list-disc space-y-2 marker:text-[#00d4ff]/70">
              <li>
                <strong className="text-white/90">Cookies strictement nécessaires</strong> : session,
                sécurité, authentification — pas de consentement requis.
              </li>
              <li>
                <strong className="text-white/90">Cookies de mesure d&apos;audience</strong> (Vercel
                Analytics / Speed Insights) — soumis à votre consentement via la bannière.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne mb-3 text-lg font-semibold text-[#00d4ff]">
              2 bis. Liste des cookies utilisés
            </h2>
            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="w-full min-w-[520px] text-left text-xs sm:text-sm">
                <thead className="border-b border-white/10 bg-white/[0.04] text-white/60">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Nom</th>
                    <th className="px-3 py-2 font-semibold">Finalité</th>
                    <th className="px-3 py-2 font-semibold">Durée</th>
                    <th className="px-3 py-2 font-semibold">Éditeur</th>
                  </tr>
                </thead>
                <tbody>
                  {COOKIE_ROWS.map((row) => (
                    <tr key={row.name} className="border-b border-white/5">
                      <td className="px-3 py-2 font-mono text-[11px] text-white/85 sm:text-xs">
                        {row.name}
                      </td>
                      <td className="px-3 py-2 text-white/75">{row.purpose}</td>
                      <td className="px-3 py-2 text-white/75">{row.duration}</td>
                      <td className="px-3 py-2 text-white/75">{row.provider}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-xs text-white/55">
              Cette liste est susceptible d&apos;évoluer en fonction des prestataires techniques
              utilisés et des évolutions du service. Consultez régulièrement cette page.
            </p>
          </section>

          <section>
            <h2 className="font-syne mb-3 text-lg font-semibold text-[#00d4ff]">
              3. Durées de conservation
            </h2>
            <ul className="ml-4 list-disc space-y-2 marker:text-[#00d4ff]/70">
              <li>
                Les cookies déposés avec votre consentement (mesure d&apos;audience) ne sont pas
                conservés au-delà de <strong className="text-white/90">13 mois</strong> maximum.
              </li>
              <li>
                Votre choix de consentement est mémorisé localement et revalidé au bout de{' '}
                <strong className="text-white/90">6 mois</strong>.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-syne mb-3 text-lg font-semibold text-[#00d4ff]">
              4. Gestion de vos préférences
            </h2>
            <p>
              Lors de votre première visite, une bannière vous propose trois choix de niveau égal :{' '}
              <strong className="text-white/90">Accepter</strong>,{' '}
              <strong className="text-white/90">Tout refuser</strong> ou{' '}
              <strong className="text-white/90">Paramétrer mes choix</strong>.
            </p>
            <p className="mt-2">
              Vous pouvez modifier vos préférences à tout moment via le lien « Gestion des cookies »
              en pied de page ou depuis la{' '}
              <Link href="/privacy" className="text-[#00d4ff] hover:underline">
                politique de confidentialité
              </Link>
              .
            </p>
          </section>
        </div>

        <p className="mt-10 border-t border-white/10 pt-6 text-sm">
          <Link href="/" className="text-[#00d4ff] hover:underline">
            ← Retour à l&apos;accueil
          </Link>
        </p>
      </article>
      <Footer />
    </div>
  )
}
