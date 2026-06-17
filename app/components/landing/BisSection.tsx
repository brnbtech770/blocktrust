"use client";

import Link from "next/link";
import { ArrowRight, FileSignature } from "lucide-react";
import Reveal from "./Reveal";

export default function BisSection() {
  return (
    <section
      id="bis"
      aria-labelledby="bis-heading"
      className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12"
    >
      <Reveal className="mx-auto max-w-4xl">
        <div className="rounded-2xl border border-bt-cyan/25 bg-gradient-to-br from-bt-cyan/10 via-white/[0.02] to-gold/5 p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div
              className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-bt-cyan/30 bg-bt-cyan/10"
              aria-hidden
            >
              <FileSignature className="h-6 w-6 text-bt-cyan" />
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-bt-cyan">
                Signature d&apos;interaction
              </p>
              <h2
                id="bis-heading"
                className="font-syne mx-auto max-w-[18rem] text-balance text-lg font-semibold leading-snug text-white sm:mx-0 sm:max-w-md sm:text-xl md:text-2xl"
              >
                Signez et vérifiez{" "}
                <span className="text-bt-cyan">chaque interaction.</span>
              </h2>
              <p className="mt-3 max-w-2xl text-balance text-sm leading-relaxed text-white/65 sm:text-base">
                Emails, documents, contrats, paiements — signez vos interactions avec votre identité
                certifiée. Vos destinataires vérifient en un clic.
              </p>
              <p className="mt-4 text-balance text-sm font-medium leading-relaxed text-gold/90">
                Même si votre boîte email est piratée, un attaquant ne peut pas forger votre signature.
              </p>
              <Link
                href="/faq#security-bis"
                className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-bt-cyan transition-colors hover:text-[#21dfff]"
              >
                En savoir plus
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
