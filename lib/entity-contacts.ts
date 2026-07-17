// lib/entity-contacts.ts
// Distinction badge personnel vs contact tiers (recette dashboard)
// ============================================================

export type EntityEmailLike = {
  email: string;
  organizationId?: string | null;
};

export type EntityContactLike = EntityEmailLike & {
  certificates?: ReadonlyArray<unknown> | null;
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

/** Badge propre : certificat lié OU email identique au compte (profil personnel). */
export function isUserOwnBadgeEntity(
  entity: EntityContactLike,
  userEmail: string | null | undefined,
): boolean {
  if (entity.certificates != null && entity.certificates.length > 0) return true;
  return isUserOwnProfileEntity(entity, userEmail);
}

/** Contacts tiers = entités hors badges propres (certificat ou profil email compte). */
export function filterThirdPartyContactEntities<T extends EntityContactLike>(
  entities: T[],
  userEmail: string | null | undefined,
): T[] {
  return entities.filter((e) => !isUserOwnBadgeEntity(e, userEmail));
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
    certificates: { none: {} },
    ...(emailNorm
      ? {
          NOT: {
            email: { equals: emailNorm, mode: "insensitive" as const },
          },
        }
      : {}),
  };
}
