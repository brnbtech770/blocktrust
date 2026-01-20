"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navItems = [
    { href: "/dashboard", label: "Certificats", icon: "📜" },
    { href: "/dashboard/create", label: "Créer", icon: "➕" },
    { href: "/dashboard/settings", label: "Paramètres", icon: "⚙️" },
    { href: "/dashboard/billing", label: "Facturation", icon: "💳" },
  ];

  const isActive = (href: string) => pathname === href;

  return (
    <>
      {/* Mobile Header - TOUJOURS visible sur mobile */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-gray-900 border-b border-gray-800 px-4 py-3 flex items-center justify-between lg:hidden">
        <div className="text-xl font-bold text-white">🛡️ BlockTrust</div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 text-gray-400 hover:text-white"
          aria-label="Toggle menu"
        >
          {isOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Overlay mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar Desktop - toujours visible sur lg+ */}
      <aside className="hidden lg:block fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-6 z-50">
        <div className="text-2xl font-bold text-white mb-8">🛡️ BlockTrust</div>

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
              O
            </div>
            <div>
              <p className="text-white text-sm font-medium">Olivier</p>
              <p className="text-gray-400 text-xs">Plan Pro</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Sidebar Mobile - slide in/out */}
      <aside
        className={`
          lg:hidden fixed top-0 left-0 h-full w-64 bg-gray-900 border-r border-gray-800 p-6 z-50
          transform transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        <div className="h-14" /> {/* Spacer pour le header */}

        <nav className="space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive(item.href)
                  ? "bg-cyan-500/20 text-cyan-400"
                  : "text-gray-400 hover:bg-gray-800"
              }`}
            >
              <span>{item.icon}</span> {item.label}
            </Link>
          ))}
        </nav>

        <div className="absolute bottom-6 left-6 right-6">
          <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white font-bold">
              O
            </div>
            <div>
              <p className="text-white text-sm font-medium">Olivier</p>
              <p className="text-gray-400 text-xs">Plan Pro</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
