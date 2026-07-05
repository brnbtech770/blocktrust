// lib/entity-contacts.ts
// Distinction badge personnel vs contact tiers (recette dashboard)
// ============================================================

export type EntityEmailLike = {
  email: string;
  organizationId?: string | null;
};

export function normalizeEntityEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** Entité = badge / profil personnel de l'utilisateur (pas un contact tiers). */
export function isUserOwnProfileEntity(
  entity: EntityEmailLike,
  userEmail: string | null | undefined,
): boolean {
  if (!userEmail?.trim()) return false;
  return normalizeEntityEmail(entity.email) === normalizeEntityEmail(userEmail);
}

/** Contacts tiers = entités hors profil personnel. */
export function filterThirdPartyContactEntities<T extends EntityEmailLike>(
  entities: T[],
  userEmail: string | null | undefined,
): T[] {
  return entities.filter((e) => !isUserOwnProfileEntity(e, userEmail));
}

/** Filtre Prisma : entités comptées dans le quota contacts personnels. */
export function personalContactEntitiesWhere(
  userId: string,
  userEmail: string | null | undefined,
) {
  const emailNorm = userEmail?.trim().toLowerCase();
  return {
    userId,
    organizationId: null,
    ...(emailNorm
      ? {
          NOT: {
            email: { equals: emailNorm, mode: "insensitive" as const },
          },
        }
      : {}),
  };
}
