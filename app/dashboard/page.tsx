// app/dashboard/page.tsx
// Tableau de bord principal : KPIs, tableau certificats, fil d’activité
// ============================================================

export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { prisma } from "@/app/lib/db";
import { auth } from "@/app/lib/auth-server";
import Link from "next/link";
import type { CertificateTableItem, VerificationEvent } from "@/types/dashboard";
import DashboardLayout from "@/app/components/dashboard/DashboardLayout";
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
        where: { certificate: { entity: { userId: user.id } } },
        include: { certificate: { select: { publicId: true } } },
        orderBy: { verifiedAt: 'desc' },
        take: 10,
      })
    ).map((v) => ({
      id: v.id,
      certificateId: v.certificateId,
      certificatePublicId: v.certificate.publicId,
      result: v.result,
      verifiedAt: v.verifiedAt.toISOString(),
      country: v.country ?? undefined,
    }));

    return (
      <DashboardLayout>
        {showSuccessMessage && (
          <div className="mb-4 sm:mb-6 bg-gradient-to-r from-[var(--bt-success)]/20 to-cyan-500/20 border border-[var(--bt-success)]/30 rounded-2xl p-4 sm:p-6 backdrop-blur-lg">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="text-3xl sm:text-4xl shrink-0">🎉</div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg sm:text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
                  Certificat créé avec succès !
                </h3>
                <p className="text-gray-300 text-sm sm:text-base">
                  Votre certificat est en attente de validation. Il sera activé sous peu.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight mb-2" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
            Bonjour {firstName} 👋
          </h1>
          <p className="text-gray-400 text-sm sm:text-base">
            Voici un aperçu de votre activité BlockTrust
          </p>
        </div>

        <Suspense fallback={<KpiGridSkeleton />}>
          <StatsBlock />
        </Suspense>

        <div className="rounded-xl border border-gray-700 bg-[var(--bt-navy)]/60 backdrop-blur-sm p-4 sm:p-6 mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-bold text-white mb-3 sm:mb-4 tracking-tight" style={{ fontFamily: 'var(--font-syne), sans-serif' }}>
            Actions rapides
          </h2>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Link
              href="/dashboard/create"
              className="text-center bg-[var(--bt-gold)] text-[var(--bt-navy)] font-bold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg hover:opacity-90 transition-opacity text-sm sm:text-base"
            >
              ➕ Créer une entité
            </Link>
            <Link
              href="/dashboard/certificates"
              className="text-center border border-[var(--bt-gold)]/50 text-[var(--bt-gold)] font-semibold py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg hover:bg-[var(--bt-gold)]/10 transition-colors text-sm sm:text-base"
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
      </DashboardLayout>
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
