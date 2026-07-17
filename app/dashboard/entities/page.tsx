// app/dashboard/entities/page.tsx
// Liste des contacts tiers (hors badge personnel)
// ============================================================

import { prisma } from "@/app/lib/db";
import { auth } from "@/app/lib/auth-server";
import Link from "next/link";
import {
  AlertTriangle,
  Building2,
  CheckCircle,
  Clock,
  Inbox,
  Plus,
  RefreshCw,
  User,
  XCircle,
} from "lucide-react";
import { walletNetworkLabelFr } from "@/lib/wallet-validation";
import DeleteContactButton from "@/app/components/dashboard/DeleteContactButton";
import {
  filterThirdPartyContactEntities,
} from "@/lib/entity-contacts";
import { resolveEffectivePlan, getPlanDisplayLabel } from "@/lib/plan-features";
import { getMaxContacts } from "@/lib/pricing";

function KycStatusBadge({ status }: { status: string }) {
  const base =
    "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold";
  if (status === "VERIFIED") {
    return (
      <span className={`${base} bg-green-500/20 text-green-400`}>
        <CheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Validé
      </span>
    );
  }
  if (status === "PENDING") {
    return (
      <span className={`${base} bg-yellow-500/20 text-yellow-400`}>
        <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
        En cours de vérification
      </span>
    );
  }
  if (status === "IN_PROGRESS") {
    return (
      <span className={`${base} bg-yellow-500/20 text-yellow-400`}>
        <RefreshCw className="h-3.5 w-3.5 shrink-0" aria-hidden />
        En cours de vérification
      </span>
    );
  }
  if (status === "REJECTED") {
    return (
      <span className={`${base} bg-red-500/20 text-red-400`}>
        <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Rejeté
      </span>
    );
  }
  if (status === "EXPIRED") {
    return (
      <span className={`${base} bg-orange-500/20 text-orange-400`}>
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
        Expiré
      </span>
    );
  }
  return (
    <span className={`${base} bg-gray-500/20 text-gray-400`}>{status}</span>
  );
}

export default async function EntitiesPage() {
  const session = await auth();

  if (!session?.user?.id) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { plan: true, subscription: true },
  });

  if (!user) {
    return null;
  }

  const allEntities = await prisma.entity.findMany({
    where: { userId: user.id, organizationId: null },
    include: { certificates: true },
    orderBy: { createdAt: "desc" },
  });

  const contacts = filterThirdPartyContactEntities(allEntities, user.email);
  const ownBadgeCount = allEntities.length - contacts.length;

  const effectivePlan = resolveEffectivePlan({
    subscription: user.subscription,
    email: user.email,
    planType: user.plan?.type,
  });
  const maxContacts = getMaxContacts(effectivePlan);
  const contactsCount = contacts.length;
  const limitReached = contactsCount >= maxContacts;

  const orgMemberships = await prisma.organizationMember.findMany({
    where: { userId: user.id, joinedAt: { not: null } },
    include: {
      organization: {
        select: { name: true, tier: true, _count: { select: { members: true } } },
      },
    },
  });

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-syne mb-2 text-4xl font-bold tracking-tight text-white drop-shadow-none">
            Mes contacts
          </h1>
          <p className="mb-1 max-w-2xl text-base text-gray-400">
            Personnes ou entreprises que vous référencez dans votre réseau BLOCKTRUST™ (hors votre
            propre badge).
          </p>
          <p className="text-base text-gray-400">
            Contacts personnels : {contactsCount}/
            {Number.isFinite(maxContacts) ? maxContacts : "∞"} · Plan{" "}
            {getPlanDisplayLabel(effectivePlan, { email: user.email })}
          </p>
          {orgMemberships.length > 0 ? (
            <p className="mt-1 text-sm text-white/45">
              {orgMemberships.map((m) => (
                <span key={m.id} className="mr-3 inline-block">
                  Organisation {m.organization.name} : équipe {m.organization._count.members} membre
                  {m.organization._count.members > 1 ? "s" : ""}
                </span>
              ))}
            </p>
          ) : null}
          {ownBadgeCount > 0 ? (
            <p className="mt-2 text-sm text-bt-cyan/80">
              Vos {ownBadgeCount} badge{ownBadgeCount > 1 ? "s" : ""} personnel
              {ownBadgeCount > 1 ? "s" : ""} sont dans{" "}
              <Link href="/dashboard/certificates" className="underline hover:text-bt-cyan">
                Mes badges
              </Link>
              , pas dans cette liste.
            </p>
          ) : null}
        </div>
        <Link
          href="/dashboard/create?intent=contact"
          className={`inline-flex items-center justify-center gap-2 rounded-lg py-3 px-6 font-bold transition-all ${
            limitReached
              ? "cursor-not-allowed bg-gray-700 text-gray-400"
              : "bg-bt-cyan text-navy hover:bg-bt-cyan/90"
          }`}
          aria-disabled={limitReached}
          tabIndex={limitReached ? -1 : undefined}
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden />
          Ajouter un contact
        </Link>
      </div>

      {contacts.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contacts.map((entity) => {
            const entityName =
              entity.entityType === "INDIVIDUAL"
                ? `${entity.firstName || ""} ${entity.lastName || ""}`.trim() || entity.email
                : entity.legalName || entity.tradeName || entity.email;

            return (
              <div
                key={entity.id}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30"
              >
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="mb-2 text-2xl font-bold text-white">{entityName}</h3>
                    <p className="text-base text-gray-400">{entity.email}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${
                      entity.entityType === "BUSINESS"
                        ? "bg-gold/15 text-gold"
                        : "bg-bt-cyan/15 text-bt-cyan"
                    }`}
                  >
                    {entity.entityType === "BUSINESS" ? (
                      <>
                        <Building2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Entreprise
                      </>
                    ) : (
                      <>
                        <User className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        Particulier
                      </>
                    )}
                  </span>
                </div>

                {entity.siret ? (
                  <div className="mb-4">
                    <p className="mb-1 text-base font-medium text-gray-400">SIRET</p>
                    <code className="rounded bg-bt-cyan/10 px-3 py-1.5 font-mono text-base text-bt-cyan">
                      {entity.siret}
                    </code>
                  </div>
                ) : null}

                {entity.walletAddress?.trim() && entity.walletNetwork?.trim() ? (
                  <div className="mb-4">
                    <p className="mb-1 text-base font-medium text-gray-400">Wallet</p>
                    <p className="break-all font-mono text-sm text-bt-cyan/90">
                      {entity.walletAddress.trim()}
                    </p>
                    <p className="mt-1 text-xs text-gray-500">
                      {walletNetworkLabelFr(entity.walletNetwork.trim())}
                    </p>
                  </div>
                ) : null}

                <div className="mb-4">
                  <p className="mb-1 text-base font-medium text-gray-400">Identité vérifiée</p>
                  <KycStatusBadge status={entity.kycStatus} />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Link
                    href={`/dashboard/create?edit=${entity.id}`}
                    className="inline-flex min-h-[44px] flex-1 items-center justify-center rounded-lg bg-bt-cyan/15 px-4 py-3 text-center text-sm font-medium text-bt-cyan transition-colors hover:bg-bt-cyan/25 border border-bt-cyan/40"
                  >
                    Voir / modifier
                  </Link>
                  <DeleteContactButton contactId={entity.id} />
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-lg transition-all hover:border-gold/30">
          <Inbox className="mx-auto mb-4 h-12 w-12 text-white/20" aria-hidden />
          <h3 className="font-syne mb-2 text-2xl font-bold text-white">Aucun contact</h3>
          <p className="mb-6 text-base text-gray-400">
            Ajoutez un contact tiers pour commencer à construire votre réseau de confiance.
          </p>
          <Link
            href="/dashboard/create?intent=contact"
            className="inline-block rounded-lg bg-bt-cyan py-3 px-6 font-bold text-navy transition hover:bg-bt-cyan/90"
          >
            Ajouter mon premier contact
          </Link>
        </div>
      )}
    </>
  );
}
