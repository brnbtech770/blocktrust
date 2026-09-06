/**
 * Visibilité des comptes dans /admin/clients — pur, sans Prisma.
 */

export type AdminClientAccountKind = "active" | "suspended" | "pending_deletion" | "deleted";

export type AdminClientAccountInput = {
  accountStatus: string;
  email: string | null;
  accountDeletionScheduledAt: Date | string | null;
};

export function isDeletedAnonymizedEmail(email: string | null): boolean {
  return Boolean(email?.startsWith("deleted_"));
}

export function classifyAdminClientAccount(
  user: AdminClientAccountInput,
): AdminClientAccountKind {
  if (isDeletedAnonymizedEmail(user.email)) return "deleted";
  if (user.accountDeletionScheduledAt) return "pending_deletion";
  if (user.accountStatus === "SUSPENDED") return "suspended";
  return "active";
}

/** Vue par défaut : ACTIVE, pas anonymisé, pas en grâce de suppression. */
export function isDefaultVisibleAdminClient(user: AdminClientAccountInput): boolean {
  return classifyAdminClientAccount(user) === "active";
}

export function adminClientAccountBadge(kind: AdminClientAccountKind): {
  label: string;
  className: string;
} {
  if (kind === "active") {
    return {
      label: "ACTIF",
      className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/35",
    };
  }
  if (kind === "suspended") {
    return {
      label: "SUSPENDU",
      className: "bg-amber-500/15 text-amber-400 border-amber-500/35",
    };
  }
  if (kind === "pending_deletion") {
    return {
      label: "SUPPRESSION",
      className: "bg-[#E05252]/15 text-[#E05252] border-[#E05252]/35",
    };
  }
  return {
    label: "SUPPRIMÉ",
    className: "bg-[#E05252]/15 text-[#E05252] border-[#E05252]/35",
  };
}
