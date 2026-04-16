import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth-server";
import { isAdmin } from "@/app/lib/admin";
import LandingPageClient from "@/app/components/LandingPageClient";

export const dynamic = "force-dynamic";

// Landing publique. Redirection admin : auth() côté Node uniquement (aligné avec layouts dashboard/admin).
export default async function HomePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (email && isAdmin(email)) {
    redirect("/admin/dashboard");
  }
  return <LandingPageClient />;
}
