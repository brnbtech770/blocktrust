import type { Metadata } from "next";
import { formatPriceFr, ESSENTIEL_MONTHLY_EUR } from "@/lib/pricing";

export const metadata: Metadata = {
  title: { absolute: "Tarifs · BLOCKTRUST™" },
  description: `Certifiez votre identité numérique dès ${formatPriceFr(ESSENTIEL_MONTHLY_EUR)}€/mois. Badge vérifiable, anti-fraude, blockchain.`,
};

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
