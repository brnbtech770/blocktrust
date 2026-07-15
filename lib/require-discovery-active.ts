// lib/require-discovery-active.ts
// Bloque les mutations dashboard si période Découverte expirée (lecture seule).
// ============================================================

import { prisma } from "@/app/lib/db";
import { isDiscoveryExpired, resolveEffectivePlan } from "@/lib/plan-features";

export const DISCOVERY_EXPIRED_MESSAGE =
  "Votre période Découverte est terminée. Choisissez une formule pour continuer à utiliser BLOCKTRUST.";

export type DiscoveryGuardResult =
  | { ok: true }
  | { ok: false; status: 403; code: "DISCOVERY_EXPIRED"; message: string; upgradeUrl: string };

export async function assertNotDiscoveryExpired(
  userId: string,
  email?: string | null,
): Promise<DiscoveryGuardResult> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          stripeSubscriptionId: true,
          currentPeriodEnd: true,
        },
      },
    },
  });

  const effectivePlan = resolveEffectivePlan({
    subscription: user?.subscription,
    email: email ?? user?.email,
  });

  if (isDiscoveryExpired(effectivePlan)) {
    return {
      ok: false,
      status: 403,
      code: "DISCOVERY_EXPIRED",
      message: DISCOVERY_EXPIRED_MESSAGE,
      upgradeUrl: "/pricing",
    };
  }

  return { ok: true };
}
