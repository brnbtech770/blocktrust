import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth-server";
import { isAdmin } from "@/app/lib/admin";
import { prisma } from "@/app/lib/db";
import { checkAndUpdateUserPlan, hasActivePlan } from "@/app/lib/stripe-helpers";
import LandingPageClient from "@/app/components/LandingPageClient";

export default async function HomePage() {
  const session = await auth();

  if (session?.user?.email) {
    // Admin → /admin
    if (isAdmin(session.user.email)) {
      redirect("/admin");
    }

    // Récupérer l'utilisateur avec stripeCustomerId
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, planId: true, stripeCustomerId: true },
    });

    if (!user) {
      // Utilisateur non trouvé → pricing
      redirect("/pricing");
    }

    // Vérifier si l'utilisateur a un plan actif (depuis DB ou Stripe)
    const hasPlan = await hasActivePlan(user.id, user.stripeCustomerId);

    if (hasPlan) {
      // Utilisateur avec plan → /dashboard
      redirect("/dashboard");
    } else {
      // Pas de plan → pricing
      redirect("/pricing");
    }
  }

  // Non connecté → afficher landing page
  return <LandingPageClient />;
}
