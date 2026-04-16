// app/dashboard/page.tsx
// Tableau de bord principal : KPIs, tableau certificats, fil d’activité
// ============================================================

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { prisma } from "@/app/lib/db";
import { auth } from "@/app/lib/auth-server";
import { isAdmin } from "@/app/lib/admin";
import { getVerifyQuotaDisplay } from "@/lib/verify-quotas";
import Link from "next/link";
import VerifyBadgeCard from "@/app/components/dashboard/VerifyBadgeCard";
import type { CertificateTableItem, VerificationEvent } from "@/types/dashboard";
import StatsBlock from "@/app/components/dashboard/StatsBlock";
import CertificateTable from "@/app/components/dashboard/CertificateTable";
import ActivityFeed from "@/app/components/dashboard/ActivityFeed";
import KpiGridSkeleton from "@/app/components/dashboard/KpiGridSkeleton";
import CertificateTableSkeleton from "@/app/components/dashboard/CertificateTableSkeleton";
import ActivityFeedSkeleton from "@/app/components/dashboard/ActivityFeedSkeleton";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; certificateCreated?: string }>;
}) {
  try {
    const session = await auth();
    const resolvedSearchParams = await searchParams;
    
    if (!session?.user?.email) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Session non trouvée. Veuillez vous reconnecter.</p>
          </div>
        </div>
      );
    }

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: { plan: true },
    });
    
    if (!user) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Utilisateur non trouvé dans la base de données.</p>
          </div>
        </div>
      );
    }

    const firstName = user.name?.split(' ')[0] || user.email?.split('@')[0] || 'Utilisateur';

    const userIsAdmin = isAdmin(session.user.email);
    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    let quotaLabel: string | null = null;
    if (!userIsAdmin && subscription?.status === "active") {
      const d = await getVerifyQuotaDisplay(user.id, subscription.plan);
      quotaLabel = d.unlimited
        ? "Illimité ce mois"
        : `${d.remaining}/${d.limit} vérifications ce mois`;
    }

    const certificates = await prisma.certificate.findMany({
      where: {
        entity: { userId: user.id },
      },
      include: {
        entity: {
          select: {
            id: true,
            entityType: true,
            legalName: true,
            tradeName: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { issuedAt: 'desc' },
    });

    const showSuccessMessage = resolvedSearchParams?.success === "true" || resolvedSearchParams?.certificateCreated === "true";

    const certificateTableItems: CertificateTableItem[] = certificates.map((c) => ({
      id: c.id,
      publicId: c.publicId,
      status: c.status as CertificateTableItem['status'],
      level: c.level,
      issuedAt: c.issuedAt.toISOString(),
      verificationCount: c.verificationCount,
      entity: c.entity,
    }));

    const initialActivity: VerificationEvent[] = (
      await prisma.verification.findMany({
        where: {
          certificateId: { not: null },
          certificate: { entity: { userId: user.id } },
        },
        include: { certificate: { select: { publicId: true } } },
        orderBy: { verifiedAt: 'desc' },
        take: 10,
      })
    ).map((v) => ({
      id: v.id,
      certificateId: v.certificateId,
      certificatePublicId: v.certificate?.publicId ?? null,
      result: v.result,
      verifiedAt: v.verifiedAt.toISOString(),
      country: v.country ?? undefined,
    }));

    return (
      <>
        {showSuccessMessage && (
          <div className="mb-4 sm:mb-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg transition-all hover:border-gold/30 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="text-3xl sm:text-4xl shrink-0">🎉</div>
              <div className="flex-1 min-w-0">
                <h3 className="font-syne text-xl font-semibold text-white sm:text-2xl mb-2">
                  Certificat créé avec succès !
                </h3>
                <p className="font-sans text-sm text-white/80 sm:text-base leading-relaxed">
                  Votre certificat est en attente de validation. Il sera activé sous peu.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <h1 className="font-syne text-2xl font-bold tracking-tight text-white sm:text-3xl lg:text-4xl mb-2">
            Bonjour {firstName} 👋
          </h1>
          <p className="font-sans text-base leading-relaxed text-white/80">
            Voici un aperçu de votre activité BlockTrust
          </p>
        </div>

        <Suspense fallback={<KpiGridSkeleton />}>
          <StatsBlock />
        </Suspense>

        <div className="mb-6 sm:mb-8 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:border-gold/30 sm:p-6">
          <h2 className="font-syne mb-3 text-xl font-semibold tracking-tight text-white sm:mb-4 sm:text-2xl">
            Actions rapides
          </h2>
          <div className="mb-6">
            <VerifyBadgeCard quotaLabel={quotaLabel} isAdmin={userIsAdmin} />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/dashboard/create"
              className="inline-flex min-w-0 w-full items-center justify-center rounded-lg bg-bt-cyan px-4 py-3 text-center font-sans text-sm font-semibold text-navy transition-all hover:bg-bt-cyan/90 sm:w-auto sm:px-6 sm:text-base"
            >
              ➕ Créer une entité
            </Link>
            <Link
              href="/dashboard/certificates"
              className="inline-flex min-w-0 w-full items-center justify-center rounded-lg border border-white/20 px-4 py-3 text-center font-sans text-sm font-semibold text-white transition-all hover:border-white/40 sm:w-auto sm:px-6 sm:text-base"
            >
              🛡️ Voir tous mes certificats
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <div className="lg:col-span-2">
            <Suspense fallback={<CertificateTableSkeleton />}>
              <CertificateTable certificates={certificateTableItems} />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<ActivityFeedSkeleton />}>
              <ActivityFeed initialEvents={initialActivity} />
            </Suspense>
          </div>
        </div>
      </>
    );
  } catch (error: any) {
    console.error('❌ Erreur dans Dashboard:', error);
    return (
      <div className="p-8">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 font-semibold mb-2">Erreur lors du chargement du tableau de bord</p>
          <p className="text-red-300 text-sm">{error?.message || 'Une erreur inattendue s\'est produite'}</p>
        </div>
      </div>
    );
  }
}
