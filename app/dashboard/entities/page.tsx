// app/dashboard/entities/page.tsx
// Liste des entités de l'utilisateur
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

  // Récupérer l'utilisateur avec son plan
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { plan: true },
  });

  if (!user) {
    return null;
  }

  // Récupère les entités de l'utilisateur
  const entities = await prisma.entity.findMany({
    where: { userId: user.id },
    include: {
      certificates: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const plan = user.plan;
  const entitiesCount = entities.length;
  const maxEntities = plan?.maxEntities || 1;
  const limitReached = entitiesCount >= maxEntities;

  return (
    <>
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-syne mb-2 text-4xl font-bold tracking-tight text-white drop-shadow-none">
            Mes Contacts
          </h1>
          <p className="text-base text-gray-400 max-w-2xl mb-1">
            Personnes ou entreprises que vous certifiez dans votre réseau BLOCKTRUST™.
          </p>
          <p className="text-gray-400 text-base">
            {entitiesCount}/{maxEntities} utilisées
          </p>
        </div>
        <Link
          href="/dashboard/create"
          className={`inline-flex items-center justify-center gap-2 rounded-lg py-3 px-6 font-bold transition-all ${
            limitReached
              ? "cursor-not-allowed bg-gray-700 text-gray-400"
              : "bg-bt-cyan text-navy hover:bg-bt-cyan/90"
          }`}
          aria-disabled={limitReached}
          tabIndex={limitReached ? -1 : undefined}
        >
          <Plus className="h-5 w-5 shrink-0" aria-hidden />
          Nouveau contact
        </Link>
      </div>

      {/* Entities List */}
      {entities.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {entities.map((entity) => {
            const entityName = entity.entityType === "INDIVIDUAL"
              ? `${entity.firstName || ''} ${entity.lastName || ''}`.trim() || entity.email
              : entity.legalName || entity.tradeName || entity.email;

            return (
              <div
                key={entity.id}
                className="rounded-xl border border-white/10 bg-white/5 p-6 backdrop-blur-lg transition-all hover:border-gold/30"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">{entityName}</h3>
                    <p className="text-gray-400 text-base">{entity.email}</p>
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

                {entity.siret && (
                  <div className="mb-4">
                    <p className="text-gray-400 text-base mb-1 font-medium">SIRET</p>
                    <code className="rounded bg-bt-cyan/10 px-3 py-1.5 font-mono text-base text-bt-cyan">
                      {entity.siret}
                    </code>
                  </div>
                )}

                {entity.walletAddress?.trim() && entity.walletNetwork?.trim() ? (
                  <div className="mb-4">
                    <p className="text-gray-400 text-base mb-1 font-medium">Wallet</p>
                    <p className="break-all font-mono text-sm text-bt-cyan/90">{entity.walletAddress.trim()}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      {walletNetworkLabelFr(entity.walletNetwork.trim())}
                    </p>
                  </div>
                ) : null}

                <div className="mb-4">
                  <p className="text-gray-400 text-base font-medium mb-1">Identité vérifiée</p>
                  <KycStatusBadge status={entity.kycStatus} />
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/badge/${entity.certificates[0]?.id || entity.id}`}
                    className="flex-1 rounded-lg border border-bt-cyan/40 bg-bt-cyan/15 px-4 py-3 text-center text-sm font-medium text-bt-cyan transition-colors hover:bg-bt-cyan/25"
                  >
                    Voir
                  </Link>
                  <Link
                    href={`/dashboard/create?edit=${entity.id}`}
                    className="flex-1 rounded-lg bg-gray-700/50 px-4 py-3 text-center text-sm font-medium text-gray-300 transition-colors hover:bg-gray-700"
                  >
                    Modifier
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-12 text-center backdrop-blur-lg transition-all hover:border-gold/30">
          <Inbox className="mx-auto mb-4 h-12 w-12 text-white/20" aria-hidden />
          <h3 className="font-syne mb-2 text-2xl font-bold text-white">Aucun contact</h3>
          <p className="text-gray-400 text-base mb-6">Créez votre premier contact pour commencer</p>
          <Link
            href="/dashboard/create"
            className="inline-block rounded-lg bg-bt-cyan py-3 px-6 font-bold text-navy transition hover:bg-bt-cyan/90"
          >
            Créer mon premier contact
          </Link>
        </div>
      )}
    </>
  );
}
