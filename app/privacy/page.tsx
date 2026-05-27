import type { Metadata } from "next";
import Navbar from "@/app/components/landing/Navbar";
import Footer from "@/app/components/landing/Footer";
import PrivacyContent from "./PrivacyContent";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
  description:
    "Politique de confidentialité BLOCKTRUST™ — BRNB TECH SAS. Données personnelles, RGPD, cookies, extension Chrome TrustScan.",
  alternates: { canonical: "/privacy" },
  openGraph: {
    title: "Politique de confidentialité — BLOCKTRUST™",
    description:
      "Traitement des données personnelles, droits RGPD, extension TrustScan et contact DPO.",
    url: "/privacy",
  },
};

export default function PrivacyPage() {
  return (
    <div
      className="min-h-screen overflow-x-hidden bt-circuit-bg"
      style={{ background: "var(--bt-navy)" }}
    >
      <Navbar />
      <PrivacyContent />
      <Footer />
    </div>
  );
}
