// Google People API — lecture seule des contacts (pas d'écriture).
// OAuth one-shot : pas de refresh token stocké.
// ============================================================

import { createHash, randomBytes, timingSafeEqual } from "crypto";
import { z } from "zod";
import { CONTACTS_IMPORT_MAX_ROWS, type ParsedContactRow } from "@/lib/contacts-import";
import { GOOGLE_CONTACTS_READONLY_SCOPE } from "@/lib/google-oauth-scopes";
import { getBlocktrustBaseUrl } from "@/lib/public-verify-url";

export { GOOGLE_CONTACTS_READONLY_SCOPE, GOOGLE_LOGIN_SCOPES } from "@/lib/google-oauth-scopes";

export const GOOGLE_CONTACTS_PREVIEW_TTL_SEC = 600;
export const GOOGLE_CONTACTS_OAUTH_COOKIE_STATE = "bt_gc_state";
export const GOOGLE_CONTACTS_OAUTH_COOKIE_PKCE = "bt_gc_pkce";

const emailSchema = z.string().email().max(254);

export type GoogleContactPreview = ParsedContactRow & {
  id: string;
};

export type GooglePersonName = {
  givenName?: string;
  familyName?: string;
  displayName?: string;
  metadata?: { primary?: boolean };
};

export type GooglePersonEmail = {
  value?: string;
  metadata?: { primary?: boolean };
};

export type GooglePersonPhone = {
  value?: string;
  metadata?: { primary?: boolean };
};

export type GooglePersonOrg = {
  name?: string;
  metadata?: { primary?: boolean };
};

export type GooglePerson = {
  resourceName?: string;
  names?: GooglePersonName[];
  emailAddresses?: GooglePersonEmail[];
  phoneNumbers?: GooglePersonPhone[];
  organizations?: GooglePersonOrg[];
};

function pickPrimary<T extends { metadata?: { primary?: boolean } }>(
  items: T[] | undefined,
): T | undefined {
  if (!items || items.length === 0) return undefined;
  return items.find((item) => item.metadata?.primary === true) ?? items[0];
}

export function googleContactsRedirectUri(): string {
  return `${getBlocktrustBaseUrl()}/api/contacts/google/callback`;
}

export function generateGoogleOAuthPkce(): {
  state: string;
  verifier: string;
  challenge: string;
} {
  const state = randomBytes(24).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { state, verifier, challenge };
}

export function timingSafeStringEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function buildGoogleContactsAuthUrl(input: {
  clientId: string;
  state: string;
  codeChallenge: string;
  redirectUri: string;
}): string {
  const params = new URLSearchParams({
    client_id: input.clientId,
    redirect_uri: input.redirectUri,
    response_type: "code",
    scope: GOOGLE_CONTACTS_READONLY_SCOPE,
    state: input.state,
    code_challenge: input.codeChallenge,
    code_challenge_method: "S256",
    access_type: "online",
    include_granted_scopes: "true",
    prompt: "consent",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function mapGooglePersonToContact(person: GooglePerson): GoogleContactPreview | null {
  const id = person.resourceName?.trim();
  if (!id) return null;

  const emailRaw = pickPrimary(person.emailAddresses)?.value?.trim().toLowerCase() ?? "";
  const emailParsed = emailSchema.safeParse(emailRaw);
  if (!emailParsed.success) return null;

  const name = pickPrimary(person.names);
  const firstName = (name?.givenName?.trim() || name?.displayName?.trim() || "Contact").slice(0, 100);
  const lastName = (name?.familyName?.trim() || "-").slice(0, 100);
  const phone = pickPrimary(person.phoneNumbers)?.value?.trim().slice(0, 40) || null;
  const company = pickPrimary(person.organizations)?.name?.trim().slice(0, 200) || null;

  return {
    id,
    email: emailParsed.data,
    firstName,
    lastName,
    phone,
    company,
  };
}

export function mapGooglePeopleToContacts(people: GooglePerson[]): GoogleContactPreview[] {
  const out: GoogleContactPreview[] = [];
  const seenEmail = new Set<string>();
  const seenId = new Set<string>();

  for (const person of people) {
    const mapped = mapGooglePersonToContact(person);
    if (!mapped) continue;
    if (seenId.has(mapped.id) || seenEmail.has(mapped.email)) continue;
    seenId.add(mapped.id);
    seenEmail.add(mapped.email);
    out.push(mapped);
    if (out.length >= CONTACTS_IMPORT_MAX_ROWS) break;
  }

  return out;
}

type PeopleListResponse = {
  connections?: GooglePerson[];
  nextPageToken?: string;
};

export async function fetchGoogleContactsPreview(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<GoogleContactPreview[]> {
  const collected: GooglePerson[] = [];
  let pageToken: string | undefined;

  do {
    const url = new URL("https://people.googleapis.com/v1/people/me/connections");
    url.searchParams.set("personFields", "names,emailAddresses,phoneNumbers,organizations");
    url.searchParams.set("pageSize", "1000");
    url.searchParams.set("sortOrder", "LAST_MODIFIED_DESCENDING");
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    if (!res.ok) {
      const err = new Error(`people_api_${res.status}`);
      throw err;
    }
    const data = (await res.json()) as PeopleListResponse;
    if (Array.isArray(data.connections)) {
      collected.push(...data.connections);
    }
    pageToken = data.nextPageToken;
  } while (pageToken && collected.length < CONTACTS_IMPORT_MAX_ROWS * 3);

  return mapGooglePeopleToContacts(collected);
}

export async function exchangeGoogleContactsCode(input: {
  code: string;
  verifier: string;
  redirectUri: string;
  clientId: string;
  clientSecret: string;
  fetchImpl?: typeof fetch;
}): Promise<{ accessToken: string }> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const body = new URLSearchParams({
    code: input.code,
    client_id: input.clientId,
    client_secret: input.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
    code_verifier: input.verifier,
  });

  const res = await fetchImpl("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error("token_exchange_failed");
  }
  const json = (await res.json()) as {
    access_token?: unknown;
    refresh_token?: unknown;
  };
  if (typeof json.access_token !== "string" || json.access_token.length === 0) {
    throw new Error("token_exchange_failed");
  }
  return { accessToken: json.access_token };
}

export function getGoogleOAuthClientConfig(): {
  clientId: string;
  clientSecret: string;
} | null {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim() ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() ?? "";
  if (!clientId || !clientSecret) return null;
  return { clientId, clientSecret };
}

export function selectGoogleContactsByIds(
  preview: GoogleContactPreview[],
  ids: unknown,
): GoogleContactPreview[] {
  if (!Array.isArray(ids)) return [];
  const wanted = new Set<string>();
  for (const raw of ids) {
    if (typeof raw !== "string") continue;
    const id = raw.trim();
    if (!id || id.length > 200) continue;
    wanted.add(id);
    if (wanted.size >= CONTACTS_IMPORT_MAX_ROWS) break;
  }
  if (wanted.size === 0) return [];
  return preview.filter((row) => wanted.has(row.id)).slice(0, CONTACTS_IMPORT_MAX_ROWS);
}

export function googleOAuthCookieOptions(secure: boolean): {
  httpOnly: true;
  sameSite: "lax";
  secure: boolean;
  path: "/";
  maxAge: number;
} {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: GOOGLE_CONTACTS_PREVIEW_TTL_SEC,
  };
}
