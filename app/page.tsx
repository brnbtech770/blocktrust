import type { Metadata } from "next";
import LandingPageClient from "@/app/components/LandingPageClient";
import ThreatAlert from "@/app/components/landing/ThreatAlert";
import { SITE_DESCRIPTION, SITE_TITLE, SITE_URL } from "@/lib/site-metadata";

export const metadata: Metadata = {
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: SITE_URL,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

/** Landing publique (statique). Redirection admin : proxy.ts sur `/`. */
export default function HomePage() {
  return <LandingPageClient threatAlert={<ThreatAlert />} />;
}
