import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth-server";
import { isAdmin } from "@/app/lib/admin";
import LandingPageClient from "@/app/components/LandingPageClient";

export default async function HomePage() {
  const session = await auth();

  // Admin connecté → /admin
  if (session?.user?.email && isAdmin(session.user.email)) {
    redirect("/admin");
  }

  // Tous les autres (connectés ou non) → landing page
  return <LandingPageClient />;
}
