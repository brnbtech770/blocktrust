import type { Metadata } from "next";
import LandingShellClient from "@/app/components/LandingShellClient";
import LandingBelowFold from "@/app/components/landing/LandingBelowFold";
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
  return (
    <div
      className="min-h-screen overflow-x-hidden"
      style={{ background: "var(--bt-navy)" }}
    >
      <LandingShellClient />
      <main>
        <LandingBelowFold threatAlert={<ThreatAlert />} />
      </main>
    </div>
  );
}
