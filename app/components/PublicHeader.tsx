"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";

export default function PublicHeader() {
  const { data: session, status } = useSession();

  return (
    <header className="border-b border-blue-900/50 bg-gradient-to-b from-blue-950/90 to-blue-900/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex items-center justify-between">
          {/* Logo BlockTrust */}
          <Link href="/" className="flex items-center gap-2 group relative">
            <div className="relative">
              <span className="text-3xl font-bold text-cyan-400 group-hover:text-cyan-300 transition-colors">
                🛡️
              </span>
              <div className="absolute inset-0 text-3xl font-bold text-cyan-400 blur-sm opacity-50 group-hover:opacity-70 transition-opacity">
                🛡️
              </div>
            </div>
            <span className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent relative z-10">
              BlockTrust
              <span className="absolute inset-0 text-2xl font-bold bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent blur-[2px] opacity-30">
                BlockTrust
              </span>
            </span>
            {/* Contour néon or */}
            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-400 rounded-lg blur-sm opacity-20 group-hover:opacity-30 transition-opacity -z-0"></div>
          </Link>

          {/* Navigation */}
          <nav className="flex gap-6 items-center">
            <Link
              href="/pricing"
              className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
            >
              Tarifs
            </Link>
            <Link
              href="/verify"
              className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
            >
              Vérifier
            </Link>
            {status === "authenticated" && session ? (
              <>
                <Link
                  href="/dashboard"
                  className="text-gray-300 hover:text-cyan-400 transition-colors font-medium"
                >
                  Dashboard
                </Link>
                <button
                  onClick={() => signOut({ callbackUrl: "/" })}
                  className="bg-blue-800/50 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700/50 border border-blue-700/50 transition-all"
                >
                  Déconnexion
                </button>
              </>
            ) : (
              <button
                onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
                className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-bold py-2.5 px-6 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 transition-all border border-cyan-400/30"
              >
                Se connecter
              </button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
