// app/dashboard/extension/page.tsx
// Clé API extension Chrome TrustScan + instructions d'installation
// ============================================================

export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/app/lib/auth-server";
import { prisma } from "@/app/lib/db";
import ExtensionChromePanel from "@/app/components/dashboard/ExtensionChromePanel";

export default async function ExtensionDashboardPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/dashboard/extension")}`);
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      extensionApiKeyHash: true,
      extensionApiKey: true,
    },
  });

  if (!user) {
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent("/dashboard/extension")}`);
  }

  return (
    <div className="py-6 text-white/80 sm:py-8">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <ExtensionChromePanel
          extensionKeyInitial={{
            hasKey: Boolean(user.extensionApiKeyHash),
            masked: user.extensionApiKey ?? null,
          }}
        />
      </div>
    </div>
  );
}
