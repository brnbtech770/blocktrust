"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { Logo } from "@/app/components/ui/Logo";

export default function PublicHeader() {
  const { data: session, status } = useSession();
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinks = (
    <>
      <Link
        href="/pricing"
        className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
        onClick={() => setMenuOpen(false)}
      >
        Tarifs
      </Link>
      <Link
        href="/verify"
        className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
        onClick={() => setMenuOpen(false)}
      >
        Vérifier
      </Link>
      {status === "authenticated" && session ? (
        <>
          <Link
            href="/dashboard"
            prefetch={false}
            className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut({ callbackUrl: "/" });
            }}
            className="bg-blue-800/50 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700/50 border border-blue-700/50 transition-all"
          >
            Déconnexion
          </button>
        </>
      ) : (
        <>
          <Link
            href="/auth/signin"
            className="inline-flex items-center border border-[var(--bt-gold)]/50 text-[var(--bt-gold)] font-medium py-2 px-4 rounded-lg hover:bg-[var(--bt-gold)]/10 transition-colors"
            onClick={() => setMenuOpen(false)}
          >
            Se connecter
          </Link>
          <Link
            href="/pricing"
            className="bg-[var(--bt-gold)] text-[var(--bt-navy)] font-bold py-2.5 px-6 rounded-lg hover:opacity-90 transition-opacity"
            onClick={() => setMenuOpen(false)}
          >
            Commencer
          </Link>
        </>
      )}
    </>
  );

  return (
    <header
      className="sticky top-0 z-50 border-b border-[rgba(189,167,107,0.15)] backdrop-blur-[12px]"
      style={{ background: "rgba(0,26,51,0.9)" }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          <Logo size="md" withText href="/" className="drop-shadow-[0_0_12px_rgba(0,212,255,0.4)]" />

          {/* Desktop nav */}
          <nav className="hidden sm:flex gap-6 items-center">
            {navLinks}
          </nav>

          {/* Mobile hamburger */}
          <div className="sm:hidden flex items-center">
            <button
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              className="p-2 text-gray-300 hover:text-white rounded-lg border border-gray-600/50"
              onClick={() => setMenuOpen((o) => !o)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {menuOpen && (
          <nav className="sm:hidden mt-4 pt-4 border-t border-[rgba(189,167,107,0.15)] flex flex-col gap-3">
            {navLinks}
          </nav>
        )}
      </div>
    </header>
  );
}
