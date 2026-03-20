import LandingPageClient from "@/app/components/LandingPageClient";

// Landing publique pour tous (connecté ou non). Aucune redirection vers /pricing ici.
// Seuls les admins sont redirigés depuis / vers /admin (middleware racine).
export default function HomePage() {
  return <LandingPageClient />;
}
