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
import { Plus, Shield, ShieldAlert, Sparkles, Check } from "lucide-react";
import VerifyBadgeCard from "@/app/components/dashboard/VerifyBadgeCard";
import ChromeExtensionBanner from "@/app/components/dashboard/ChromeExtensionBanner";
import BlockTrustBadge from "@/app/components/ui/BlockTrustBadge";
import type { CertificateTableItem, VerificationEvent } from "@/types/dashboard";
import StatsBlock from "@/app/components/dashboard/StatsBlock";
import CertificateTable from "@/app/components/dashboard/CertificateTable";
import ActivityFeed from "@/app/components/dashboard/ActivityFeed";
import KpiGridSkeleton from "@/app/components/dashboard/KpiGridSkeleton";
import CertificateTableSkeleton from "@/app/components/dashboard/CertificateTableSkeleton";
import ActivityFeedSkeleton from "@/app/components/dashboard/ActivityFeedSkeleton";
import { getTrustScoreColor, getTrustScoreLabelFr } from "@/lib/trustscore";
import { getPlanWording, resolvePlanKeyForWording } from "@/lib/plan-wording";
import { resolveEffectivePlan } from "@/lib/plan-features";
import { formatCertificateLabel } from "@/lib/format-certificate-label";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; certificateCreated?: string }>;
}) {
  try {
    const session = await auth();
    const resolvedSearchParams = await searchParams;
    
    if (!session?.user?.id || !session?.user?.email) {
      return (
        <div className="p-8">
          <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400">Erreur : Session non trouvée. Veuillez vous reconnecter.</p>
          </div>
        </div>
      );
    }

    // Récupérer l'utilisateur (id session = périmètre données)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
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

    // Plancher à 0 : un TrustScore ne doit JAMAIS s'afficher en négatif
    // (valeurs héritées d'anciens calculs possibles avant le plancher).
    const trustScoreValue = Math.max(0, user.trustScore ?? 0);
    const trustScoreLabel = getTrustScoreLabelFr(trustScoreValue);
    const trustScoreColor = getTrustScoreColor(trustScoreValue);
    const showKycTrustHint =
      trustScoreValue < 50 && user.kycStatus !== "VERIFIED";

    const userIsAdmin = isAdmin(session.user.email);

    const fraudWeekStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const fraudAlertsWeek = await prisma.verification.count({
      where: {
        result: "FRAUD_ALERT",
        verifiedAt: { gte: fraudWeekStart },
        certificate: { entity: { userId: user.id } },
      },
    });

    const subscription = await prisma.subscription.findUnique({
      where: { userId: user.id },
    });
    const hasActiveSub = subscription?.status === "active";
    const planKey = resolvePlanKeyForWording({
      planType: user.plan?.type ?? null,
      subscriptionPlan: subscription?.plan ?? null,
      subscriptionStatus: subscription?.status ?? null,
    });
    const dashboardWording = getPlanWording(planKey);
    // Quota de vérifications affiché pour TOUS les comptes non-admin, y compris
    // Découverte (20/mois). On ne bloque jamais la vérification côté UI.
    let quotaLabel: string | null = null;
    if (!userIsAdmin) {
      const planForQuota = resolveEffectivePlan({ subscription, email: user.email });
      const d = await getVerifyQuotaDisplay(user.id, planForQuota);
      quotaLabel = d.unlimited
        ? "Illimité ce mois"
        : `${d.remaining}/${d.limit} vérifications ce mois-ci`;
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

    const entitiesCount = await prisma.entity.count({
      where: { userId: user.id },
    });
    const kycVerified = user.kycStatus === "VERIFIED";
    const hasEntities = entitiesCount > 0;
    const hasCertificate = certificates.length > 0;
    const showOnboardingGuide = certificates.length === 0;
    // Le KYC ne concerne QUE les plans payants (ou admin). Un compte Découverte
    // gratuit n'est jamais poussé vers la vérification d'identité : on l'invite à upgrader.
    const canDoKyc = userIsAdmin || hasActiveSub;
    const firstStep = canDoKyc
      ? { step: "1", text: "Vérifiez votre identité", href: "/onboarding/verify", done: kycVerified }
      : { step: "1", text: "Activez votre certification", href: "/pricing", done: false };
    const onboardingSteps: { step: string; text: string; href: string; done: boolean }[] = [
      firstStep,
      { step: "2", text: "Créez votre premier contact", href: "/dashboard/entities", done: hasEntities },
      { step: "3", text: "Partagez votre badge", href: "/dashboard/certificates", done: hasCertificate },
    ];

    const isAnchoredOnChain = (c: (typeof certificates)[number]) =>
      c.blockchainStatus === "ANCHORED" || Boolean(c.polygonTxHash || c.txHash);

    const certsForPolygonKpi = certificates.filter(
      (c) => c.status === "ACTIVE" || c.status === "ANCHORED"
    );

    const blockchainStats = certsForPolygonKpi.reduce(
      (acc, c) => {
        if (isAnchoredOnChain(c)) acc.anchored += 1;
        else if (c.blockchainStatus === "FAILED") acc.failed += 1;
        else acc.pending += 1;
        return acc;
      },
      { anchored: 0, pending: 0, failed: 0 }
    );

    const lastAnchored = certsForPolygonKpi.find(
      (c) => isAnchoredOnChain(c) && c.polygonExplorerUrl
    );

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
        include: {
          certificate: {
            select: {
              id: true,
              publicId: true,
              entity: {
                select: {
                  entityType: true,
                  firstName: true,
                  lastName: true,
                  legalName: true,
                  tradeName: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: { verifiedAt: 'desc' },
        take: 10,
      })
    ).map((v) => {
      const cert = v.certificate
      const formatted = cert
        ? formatCertificateLabel({
            id: cert.id,
            publicId: cert.publicId,
            entity: cert.entity,
          })
        : null
      return {
        id: v.id,
        certificateId: v.certificateId,
        certificatePublicId: cert?.publicId ?? null,
        certificateLabel: formatted?.label ?? null,
        certificateFullCode: formatted?.fullCode ?? null,
        result: v.result,
        verifiedAt: v.verifiedAt.toISOString(),
        country: v.country ?? undefined,
      }
    });

    return (
      <>
        {showSuccessMessage && (
          <div className="mb-4 sm:mb-6 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-lg transition-all hover:border-gold/30 sm:p-6">
            <div className="flex items-start gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[#BDA76B]/30 bg-[#BDA76B]/10">
                <Sparkles className="h-4 w-4 text-[#BDA76B]" aria-hidden />
              </div>
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
          <h1 className="font-syne text-2xl font-bold text-white sm:text-3xl lg:text-4xl">
            {dashboardWording.dashboardTitle}
          </h1>
          <p className="neon-white mt-2 text-sm font-medium">
            Bienvenue, {firstName}
          </p>
          {user.name ? (
            <p className="mt-2 text-sm font-medium text-white/90">{user.name}</p>
          ) : null}
          {user.email ? (
            <p className="mt-1 max-w-xl truncate text-xs text-white/55 sm:text-sm">{user.email}</p>
          ) : null}
        </div>

        {showOnboardingGuide && (
          <div className="bg-gradient-to-br from-[#0d1f3c] to-[#0a1628] border border-[#00d4ff]/20 rounded-xl p-6 mb-6">
            <p className="text-[#00d4ff] text-xs uppercase tracking-widest mb-4">
              PAR OÙ COMMENCER ?
            </p>
            <div className="space-y-3">
              {onboardingSteps.map((item) => (
                <a
                  href={item.href}
                  key={item.step}
                  className="flex min-h-[44px] items-center gap-3 rounded-lg p-3 transition hover:bg-white/5"
                >
                  <span
                    className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                      item.done
                        ? "bg-[#00d4ff]/20 text-[#00d4ff]"
                        : "bg-white/10 text-white/40"
                    }`}
                    aria-hidden
                  >
                    {item.done ? <Check className="h-3.5 w-3.5" aria-hidden /> : item.step}
                  </span>
                  <span
                    className={
                      item.done
                        ? "text-white/40 line-through text-sm"
                        : "text-white text-sm"
                    }
                  >
                    {item.text}
                  </span>
                  {!item.done && (
                    <span className="ml-auto text-white/30 text-xs" aria-hidden>
                      →
                    </span>
                  )}
                </a>
              ))}
            </div>
          </div>
        )}

        <Suspense fallback={<KpiGridSkeleton />}>
          <StatsBlock />
        </Suspense>

        {fraudAlertsWeek > 0 ? (
          <div className="mb-6 flex items-start gap-4 rounded-xl border-2 border-[#E05252]/50 bg-[#E05252]/10 p-5">
            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#E05252]/20">
              <ShieldAlert className="h-5 w-5 text-[#E05252]" aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-syne mb-1 text-base font-bold text-[#E05252]">
                Tentative de fraude détectée
              </p>
              <p className="text-sm leading-relaxed text-white/70">
                {fraudAlertsWeek} tentative(s) d&apos;usurpation de votre identité ont été détectées ces
                7 derniers jours. Quelqu&apos;un a essayé d&apos;utiliser un badge falsifié à votre nom.
              </p>
              <div className="mt-3 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/certificates"
                  className="inline-flex min-h-[44px] items-center gap-1 py-2 text-sm font-semibold text-[#E05252] transition hover:text-white"
                >
                  Voir mes certificats →
                </Link>
                <a
                  href="mailto:security@blocktrust.tech"
                  className="inline-flex min-h-[44px] items-center py-2 text-sm text-white/40 transition hover:text-white/70"
                >
                  Signaler à BLOCKTRUST
                </a>
              </div>
            </div>
          </div>
        ) : null}

        {certificates.length > 0 && (
          <div className="mb-6 sm:mb-8 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <h2 className="font-syne text-xl font-semibold tracking-tight sm:text-2xl">
                <span className="text-gold">Blockchain</span>
                <span className="text-white/70"> (Polygon)</span>
              </h2>
              <span className="font-mono text-xs uppercase tracking-widest text-white/40">
                Ancrage on-chain
              </span>
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
              <div className="rounded-lg border border-bt-cyan/30 bg-bt-cyan/5 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-white/50">
                  <Check className="h-3.5 w-3.5 text-bt-cyan" strokeWidth={2.5} aria-hidden />
                  Ancrés
                </p>
                <p className="mt-1 font-mono text-2xl font-semibold text-bt-cyan">
                  {blockchainStats.anchored}
                </p>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/50">En attente</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-amber-300">
                  {blockchainStats.pending}
                </p>
              </div>
              <div className="rounded-lg border border-red-500/30 bg-red-500/5 px-4 py-3">
                <p className="text-xs uppercase tracking-wider text-white/50">Échecs</p>
                <p className="mt-1 font-mono text-2xl font-semibold text-red-300">
                  {blockchainStats.failed}
                </p>
                {blockchainStats.failed > 0 && (
                  <p className="mt-1 text-xs text-white/50">
                    Retry automatique chaque nuit
                  </p>
                )}
              </div>
            </div>
            {lastAnchored?.polygonExplorerUrl && (
              <a
                href={lastAnchored.polygonExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 text-sm text-bt-cyan hover:underline"
              >
                Dernier ancrage sur PolygonScan ↗
              </a>
            )}
          </div>
        )}

        <div className="mb-6 sm:mb-8 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm transition-all hover:border-gold/30 sm:p-6">
          <h2 className="font-syne mb-3 text-xl font-semibold tracking-tight text-gold sm:mb-4 sm:text-2xl">
            Actions rapides
          </h2>
          <div className="mb-6">
            <VerifyBadgeCard
              quotaLabel={quotaLabel}
              isAdmin={userIsAdmin}
            />
          </div>
          <ChromeExtensionBanner />
          <div className="flex flex-col gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/dashboard/create"
              className="inline-flex min-h-[44px] min-w-0 w-full items-center justify-center gap-2 rounded-lg bg-bt-cyan px-6 py-3 font-sans text-sm font-semibold text-navy transition-all hover:bg-bt-cyan/90 sm:w-auto sm:text-base"
            >
              <Plus className="h-5 w-5 shrink-0" aria-hidden />
              Créer un contact
            </Link>
            <Link
              href="/dashboard/certificates"
              className="inline-flex min-h-[44px] min-w-0 w-full items-center justify-center gap-2 rounded-lg border border-white/20 px-6 py-3 font-sans text-sm font-semibold text-white transition-all hover:border-bt-cyan/50 hover:text-bt-cyan sm:w-auto sm:text-base"
            >
              <Shield className="h-5 w-5 shrink-0" aria-hidden />
              Voir tous mes certificats
            </Link>
          </div>
        </div>

        <div className="mb-6 space-y-4 sm:mb-8 sm:space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-stretch md:gap-6">
            <div className="min-w-0 flex-1 basis-0 rounded-xl border border-white/10 bg-white/5 p-4 backdrop-blur-sm sm:p-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-6">
                <BlockTrustBadge
                  size={80}
                  instanceId="dashboard-trustscore"
                  showWatermark={false}
                  className="shrink-0 self-center sm:self-start"
                />
                <div className="min-w-0 flex-1">
                  <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
                    <h2 className="font-syne text-lg font-semibold tracking-tight text-white sm:text-xl">
                      TrustScore
                    </h2>
                    <p className="font-mono text-sm tabular-nums" style={{ color: trustScoreColor }}>
                      <span className="text-xl font-semibold">{trustScoreValue}</span>
                      <span className="text-white/50">/100</span>
                      <span className="ml-2 text-xs uppercase tracking-wider text-white/60">
                        {trustScoreLabel}
                      </span>
                    </p>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${trustScoreValue}%`,
                        background: trustScoreColor,
                      }}
                    />
                  </div>
                  {showKycTrustHint && (
                    <p className="mt-3 font-sans text-sm text-white/65">
                      Vérifiez votre identité pour améliorer votre score
                    </p>
                  )}
                </div>
              </div>
            </div>
            <div className="flex min-h-0 min-w-0 flex-1 basis-0 flex-col">
              <Suspense fallback={<ActivityFeedSkeleton />}>
                <ActivityFeed initialEvents={initialActivity} />
              </Suspense>
            </div>
          </div>
          <div className="min-w-0 w-full">
            <Suspense fallback={<CertificateTableSkeleton />}>
              <CertificateTable certificates={certificateTableItems} />
            </Suspense>
          </div>
        </div>
      </>
    );
  } catch (error: unknown) {
    console.error('❌ Erreur dans Dashboard:', error);
    const message = error instanceof Error ? error.message : 'Une erreur inattendue s\'est produite';
    return (
      <div className="p-8">
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4">
          <p className="text-red-400 font-semibold mb-2">Erreur lors du chargement du tableau de bord</p>
          <p className="text-red-300 text-sm">{message}</p>
        </div>
      </div>
    );
  }
}
