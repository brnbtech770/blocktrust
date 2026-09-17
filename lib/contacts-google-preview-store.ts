// Preview contacts Google en cache court — jamais de token OAuth.
// ============================================================

import { getRedis } from "@/lib/rate-limit-redis";
import {
  GOOGLE_CONTACTS_PREVIEW_TTL_SEC,
  type GoogleContactPreview,
} from "@/lib/google-contacts";

function isPreviewContact(value: unknown): value is GoogleContactPreview {
  if (!value || typeof value !== "object") return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.email === "string" &&
    typeof row.firstName === "string" &&
    typeof row.lastName === "string"
  );
}

type MemoryEntry = { expiresAt: number; contacts: GoogleContactPreview[] };

const memory = new Map<string, MemoryEntry>();

function previewKey(userId: string): string {
  return `bt:gcontacts:preview:${userId}`;
}

export async function saveGoogleContactsPreview(
  userId: string,
  contacts: GoogleContactPreview[],
): Promise<void> {
  const redis = getRedis();
  if (redis) {
    try {
      await redis.set(previewKey(userId), contacts, { ex: GOOGLE_CONTACTS_PREVIEW_TTL_SEC });
      return;
    } catch {
      console.warn("[gcontacts] Redis set preview failed, memory fallback");
    }
  }
  memory.set(userId, {
    contacts,
    expiresAt: Date.now() + GOOGLE_CONTACTS_PREVIEW_TTL_SEC * 1000,
  });
}

export async function loadGoogleContactsPreview(
  userId: string,
): Promise<GoogleContactPreview[] | null> {
  const redis = getRedis();
  if (redis) {
    try {
      const raw = await redis.get<unknown>(previewKey(userId));
      if (Array.isArray(raw) && raw.every(isPreviewContact)) return raw;
    } catch {
      console.warn("[gcontacts] Redis get preview failed, memory fallback");
    }
  }
  const entry = memory.get(userId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    memory.delete(userId);
    return null;
  }
  return entry.contacts;
}

export async function clearGoogleContactsPreview(userId: string): Promise<void> {
  memory.delete(userId);
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.del(previewKey(userId));
  } catch {
    /* ignore */
  }
}
