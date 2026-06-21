import type { Metadata } from "next";
import Navbar from "@/app/components/landing/Navbar";
import Footer from "@/app/components/landing/Footer";
import HowToContent from "./HowToContent";

export const metadata: Metadata = {
  title: "Comment ça marche — BLOCKTRUST™",
  description:
    "Comprenez BLOCKTRUST™ en 3 minutes : création de badge, signatures, vérification de contacts et lexique des termes techniques expliqués simplement.",
  alternates: { canonical: "/how-to" },
  openGraph: {
    title: "Comment fonctionne BLOCKTRUST™ ?",
    description:
      "De la création de votre badge à la protection de vos échanges — tout se fait en quelques minutes.",
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
