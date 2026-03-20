import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth-server";
import { isAdmin } from "@/app/lib/admin";
import LandingPageClient from "@/app/components/LandingPageClient";
import { writeAgentDebugLog } from "@/app/lib/agent-debug-467f2c-log";

export const dynamic = "force-dynamic";

// Landing publique. Redirection admin : auth() côté Node uniquement (aligné avec layouts dashboard/admin).
export default async function HomePage() {
  const session = await auth();
  const email = session?.user?.email ?? null;
  if (email && isAdmin(email)) {
    // #region agent log
    await writeAgentDebugLog({
      hypothesisId: "H5",
      location: "app/page.tsx:HomePage",
      message: "admin connected -> redirect / to /admin (auth Node)",
      runId: "mw-page-auth",
      data: { emailLen: email.length },
    });
    // #endregion
    redirect("/admin");
  }
  return <LandingPageClient />;
}
