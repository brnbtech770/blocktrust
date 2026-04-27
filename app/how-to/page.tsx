import type { Metadata } from "next";
import Navbar from "@/app/components/landing/Navbar";
import Footer from "@/app/components/landing/Footer";
import HowToContent from "./HowToContent";

export const metadata: Metadata = {
  title: "Comment utiliser BLOCKTRUST — Guide complet",
  description:
    "Guide d'installation et d'utilisation de BLOCKTRUST pour particuliers et entreprises. Intégration badge, API, marque blanche.",
  alternates: { canonical: "/how-to" },
  openGraph: {
    title: "Comment utiliser BLOCKTRUST — Guide complet",
    description:
      "Schéma de vérification, démos animées, FAQ. Tout ce qu'il faut savoir pour intégrer BLOCKTRUST.",
    url: "/how-to",
  },
};

export default function HowToPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bt-circuit-bg"
      style={{ background: "var(--bt-navy)" }}
    >
      <Navbar />
      <HowToContent />
      <Footer />
    </div>
  );
}
