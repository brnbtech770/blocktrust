import LandingPageClient from "@/app/components/LandingPageClient";

// Landing page statique — pas de auth() pour éviter tout crash.
// La redirection admin est gérée par le middleware.
export default function HomePage() {
  return <LandingPageClient />;
}
