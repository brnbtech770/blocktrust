"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { data: session } = useSession();

  const navLinks = [
    { label: "Comment ça marche", href: "#how-it-works" },
    { label: "Tarifs", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <motion.nav
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/50"
    >
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <motion.div whileHover={{ scale: 1.05 }}>
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/blocktrust-logo.png"
                alt="BlockTrust Logo"
                width={40}
                height={40}
                className="w-10 h-10 object-contain rounded-lg animate-logo-pulse"
              />
              <span className="text-xl font-bold tracking-wider text-primary animate-glow-pulse">
                BLOCKTRUST
              </span>
            </Link>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <motion.a
                key={link.href}
                href={link.href}
                whileHover={{ y: -2 }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </motion.a>
            ))}
          </div>

          {/* Auth & CTA Buttons */}
          <div className="hidden md:flex items-center gap-3">
            {session ? (
              <>
                <Link href="/mon-espace">
                  <Button variant="ghost" size="default">
                    Mon espace
                  </Button>
                </Link>
                {session.user?.email === "brnbtech@gmail.com" && (
                  <Link href="/dashboard">
                    <Button variant="ghost" size="default">
                      Dashboard
                    </Button>
                  </Link>
                )}
              </>
            ) : (
              <Link href="/connexion">
                <Button variant="ghost" size="default" className="gap-2">
                  <LogIn className="w-4 h-4" />
                  Connexion
                </Button>
              </Link>
            )}
            <Link href="/inscription">
              <Button variant="hero" size="default">
                Créer mon certificat
              </Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {isMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden mt-4 pb-4"
            >
              <div className="flex flex-col gap-4">
                {navLinks.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    onClick={() => setIsMenuOpen(false)}
                    className="text-muted-foreground hover:text-foreground transition-colors py-2"
                  >
                    {link.label}
                  </a>
                ))}
                {session ? (
                  <>
                    <Link href="/mon-espace" onClick={() => setIsMenuOpen(false)}>
                      <Button variant="ghost" size="default" className="w-full">
                        Mon espace
                      </Button>
                    </Link>
                  </>
                ) : (
                  <Link href="/connexion" onClick={() => setIsMenuOpen(false)}>
                    <Button
                      variant="ghost"
                      size="default"
                      className="w-full gap-2"
                    >
                      <LogIn className="w-4 h-4" />
                      Connexion
                    </Button>
                  </Link>
                )}
                <Link href="/inscription" onClick={() => setIsMenuOpen(false)}>
                  <Button variant="hero" size="default" className="mt-2 w-full">
                    Créer mon certificat
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.nav>
  );
};

export default Navbar;
