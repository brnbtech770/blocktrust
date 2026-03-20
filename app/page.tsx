import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth-server";
import { isAdmin } from "@/app/lib/admin";
import LandingPageClient from "@/app/components/LandingPageClient";

export const dynamic = "force-dynamic";

// Landing publique. Redirection admin : auth() côté Node (plus de décodage JWT dans middleware Edge).
export default async function HomePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (email && isAdmin(email)) {
    redirect("/admin");
  }
  return <LandingPageClient />;
}
